import React, { useState, useEffect } from "react";
import { FiImage, FiUploadCloud, FiXCircle, FiEdit, FiSave, FiTrash2, FiPlus, FiRefreshCw } from "react-icons/fi";

import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Assuming you have your firebase config exported from this path
import { db, storage } from "../firebase"; 

// Enhanced image compression utility
const compressImage = (file, maxWidth = 1200, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    // If file is already small, return as is
    if (file.size < 500 * 1024) { // 500KB
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = height * ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // Set image smoothing
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                type: 'image/jpeg',
                lastModified: Date.now(),
              }));
            } else {
              reject(new Error('Canvas to Blob conversion failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Image loading failed'));
    };
    reader.onerror = () => reject(new Error('File reading failed'));
  });
};

// Utility to check if image exists and is accessible
const checkImageAvailability = (url) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
    
    // Timeout after 10 seconds
    setTimeout(() => resolve(false), 10000);
  });
};

export default function PostersPage() {
  const [posters, setPosters] = useState([]);
  const [posterTitle, setPosterTitle] = useState("");
  // ** NEW STATE **
  const [subContents, setSubContents] = useState(""); 
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [loadingImages, setLoadingImages] = useState({});
  const [imageErrors, setImageErrors] = useState({});
  // FIX: Must use useState hook here
  const [isLoading, setIsLoading] = useState(true); 
  const [retryCounts, setRetryCounts] = useState({});

  // Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPoster, setEditingPoster] = useState(null);
  const [editedTitle, setEditedTitle] = useState("");
  // ** NEW STATE for Edit Modal **
  const [editedSubContents, setEditedSubContents] = useState(""); 

  // ---------------- LOAD DATA FROM FIREBASE ----------------
  useEffect(() => {
    const loadPosters = async () => {
      try {
        setIsLoading(true);
        const q = query(collection(db, "posters"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);

        const results = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setPosters(results);
        
        // Pre-check image availability
        results.forEach(poster => {
          checkImageAvailability(poster.imageUrl).then(isAvailable => {
            if (!isAvailable) {
              setImageErrors(prev => ({ ...prev, [poster.id]: true }));
            }
          });
        });
      } catch (error) {
        console.error("Error loading posters:", error);
        alert("Failed to load posters");
      } finally {
        setIsLoading(false);
      }
    };

    loadPosters();
  }, []);

  // ---------------- ENHANCED IMAGE LOADING HANDLERS ----------------
  const handleImageLoad = (posterId) => {
    setLoadingImages(prev => ({ ...prev, [posterId]: false }));
    setImageErrors(prev => ({ ...prev, [posterId]: false }));
  };

  const handleImageError = (posterId) => {
    setLoadingImages(prev => ({ ...prev, [posterId]: false }));
    setImageErrors(prev => ({ ...prev, [posterId]: true }));
    
    // Increment retry count
    setRetryCounts(prev => ({
      ...prev,
      [posterId]: (prev[posterId] || 0) + 1
    }));
    
    console.error(`Failed to load image for poster: ${posterId}`);
  };

  const handleImageStartLoad = (posterId) => {
    setLoadingImages(prev => ({ ...prev, [posterId]: true }));
  };

  const handleRetryImage = async (posterId, imageUrl) => {
    setLoadingImages(prev => ({ ...prev, [posterId]: true }));
    setImageErrors(prev => ({ ...prev, [posterId]: false }));
    
    // Add cache busting parameter
    const cacheBustingUrl = `${imageUrl}?retry=${Date.now()}`;
    
    // Create a new image element to test
    const img = new Image();
    img.onload = () => {
      setLoadingImages(prev => ({ ...prev, [posterId]: false }));
      setImageErrors(prev => ({ ...prev, [posterId]: false }));
    };
    img.onerror = () => {
      setLoadingImages(prev => ({ ...prev, [posterId]: false }));
      setImageErrors(prev => ({ ...prev, [posterId]: true }));
    };
    img.src = cacheBustingUrl;
  };

  // ---------------- FILE SELECT ----------------
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type and size
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        alert("Please select a valid image file (JPEG, PNG, WebP, or GIF)");
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert("Please select an image smaller than 10MB");
        return;
      }
      
      setSelectedFile(file);
    }
  };

  // ---------------- ADD POSTER ----------------
  const handleAddPoster = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      alert("Please choose an image");
      return;
    }

    setIsUploading(true);

    try {
      let fileToUpload = selectedFile;
      
      // Only compress if file is large
      if (selectedFile.size > 1 * 1024 * 1024) { // 1MB
        fileToUpload = await compressImage(selectedFile);
      }
      
      // Upload image to Storage
      const imageRef = ref(storage, `posters/${Date.now()}-${fileToUpload.name}`);
      await uploadBytes(imageRef, fileToUpload);

      const imageURL = await getDownloadURL(imageRef);

      // Save in Firestore
      const posterData = {
        title: posterTitle || "New Poster",
        // ** NEW FIELD **
        subContents: subContents || "",
        imageUrl: imageURL,
        date: new Date().toLocaleString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        createdAt: new Date()
      };

      const docRef = await addDoc(collection(db, "posters"), posterData);

      // Save ID also in Firestore document itself
      await updateDoc(doc(db, "posters", docRef.id), {
        posterId: docRef.id
      });

      // Add to local state with loading state
      const newPoster = { 
        ...posterData, 
        posterId: docRef.id, 
        id: docRef.id 
      };
      
      setPosters([newPoster, ...posters]);
      setLoadingImages(prev => ({ ...prev, [docRef.id]: true }));

      // Reset form
      setPosterTitle("");
      // ** RESET NEW STATE **
      setSubContents(""); 
      setSelectedFile(null);
      document.getElementById("poster-file-upload").value = null;

    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  // ---------------- DELETE ----------------
  const handleDeletePoster = async (id) => {
    // Removed: if (!window.confirm("Are you sure you want to delete this poster? This action cannot be undone.")) return;

    try {
      await deleteDoc(doc(db, "posters", id));
      setPosters(posters.filter(p => p.id !== id));
      
      // Remove from loading states
      setLoadingImages(prev => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
      setImageErrors(prev => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
    } catch (err) {
      console.error("Delete error:", err);
      alert("Delete failed. Please try again.");
    }
  };

  // ---------------- EDIT ----------------
  const handleEditClick = (poster) => {
    setEditingPoster(poster);
    setEditedTitle(poster.title);
    // ** SET NEW EDIT STATE **
    // Ensure subContents defaults to "" if undefined in the database
    setEditedSubContents(poster.subContents || ""); 
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingPoster(null);
    setIsModalOpen(false);
    setEditedTitle("");
    // ** RESET NEW EDIT STATE **
    setEditedSubContents(""); 
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();

    if (!editedTitle.trim()) {
      alert("Please enter a poster title");
      return;
    }
    
    try {
      const posterRef = doc(db, "posters", editingPoster.id);

      await updateDoc(posterRef, {
        title: editedTitle.trim(),
        // ** UPDATE NEW FIELD IN FIREBASE **
        subContents: editedSubContents.trim()
      });

      setPosters(posters.map(p =>
        p.id === editingPoster.id ? { 
            ...p, 
            title: editedTitle.trim(),
            // ** UPDATE NEW FIELD IN LOCAL STATE **
            subContents: editedSubContents.trim()
        } : p
      ));

      closeModal();
    } catch (err) {
      console.error("Edit error:", err);
      alert("Edit failed. Please try again.");
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center mb-2">
            <div className="p-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-lg mr-4">
              <FiImage className="text-white text-2xl" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Poster Manager</h1>
              <p className="text-gray-600 text-sm sm:text-base">Manage and organize your poster collection</p>
            </div>
          </div>
        </div>

        {/* Upload Card Section */}
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 mb-8 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <FiPlus className="mr-2 text-green-500" />
            Add New Poster
          </h3>
          
          <form onSubmit={handleAddPoster} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Title Input (md:col-span-1) */}
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Poster Title
                </label>
                <input
                  type="text"
                  placeholder="Enter poster title..."
                  value={posterTitle}
                  onChange={e => setPosterTitle(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  maxLength={100}
                />
              </div>

              {/* ** NEW SUB-CONTENTS INPUT (md:col-span-1) ** */}
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sub-Contents (Optional)
                </label>
                <textarea
                  placeholder="Enter a short description or key points..."
                  value={subContents}
                  onChange={e => setSubContents(e.target.value)}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  maxLength={500}
                />
              </div>
            
            </div>
            
            {/* New Row for File Input and Button */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              
              {/* File Input */}
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image File
                </label>
                <div className="relative">
                  <input
                    id="poster-file-upload"
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*"
                    className="w-full p-3 border border-gray-300 rounded-xl file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="md:col-span-1 flex items-end">
                <button
                  type="submit"
                  disabled={!selectedFile || isUploading}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl py-3 flex justify-center items-center font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:transform-none disabled:hover:shadow-lg disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <FiUploadCloud className="mr-2" /> 
                      Add Poster
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Selected File Preview */}
            {selectedFile && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FiImage className="text-green-500 flex-shrink-0" />
                  <div>
                    <span className="text-green-800 font-medium block">{selectedFile.name}</span>
                    <span className="text-green-600 text-sm">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    document.getElementById("poster-file-upload").value = null;
                  }}
                  className="text-red-500 hover:text-red-700 transition-colors duration-200 flex-shrink-0"
                >
                  <FiXCircle size={18} />
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Posters Grid Section */}
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <FiImage className="mr-2 text-purple-500" />
              Your Posters 
              <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm font-medium">
                {posters.length}
              </span>
            </h3>
          </div>

          {/* Loading State/Empty State */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <h4 className="text-lg font-semibold text-gray-600 mb-2">Loading posters...</h4>
              <p className="text-gray-400">Please wait while we load your collection</p>
            </div>
          ) : posters.length === 0 ? (
            // Empty State
            <div className="text-center py-12">
              <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                <FiImage className="text-gray-400 text-3xl" />
              </div>
              <h4 className="text-xl font-semibold text-gray-500 mb-2">No posters yet</h4>
              <p className="text-gray-400 mb-6">Upload your first poster to get started</p>
              <button
                onClick={() => document.getElementById('poster-file-upload').click()}
                className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                <FiPlus className="inline mr-2" />
                Upload First Poster
              </button>
            </div>
          ) : (
            // Posters Grid
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {posters.map(poster => (
                <div 
                  key={poster.id} 
                  className="border border-gray-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-purple-200 group bg-white"
                >
                  {/* Image Container with Enhanced Loading States */}
                  <div className="relative overflow-hidden bg-gray-100 aspect-[4/3]">
                    
                    {/* Loading Skeleton */}
                    {(loadingImages[poster.id] === undefined || loadingImages[poster.id]) && !imageErrors[poster.id] && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse">
                        <div className="text-center">
                          <FiImage className="text-gray-400 mx-auto mb-2" size={32} />
                          <p className="text-gray-500 text-sm">Loading image...</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Actual Image - Only show if not errored */}
                    {!imageErrors[poster.id] && (
                      <img 
                        src={poster.imageUrl} 
                        alt={poster.title}
                        className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-110 ${
                          loadingImages[poster.id] === false ? 'opacity-100' : 'opacity-0'
                        }`}
                        onLoad={() => handleImageLoad(poster.id)}
                        onError={() => handleImageError(poster.id)}
                        onLoadStart={() => handleImageStartLoad(poster.id)}
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                    
                    {/* Error State with Retry Option */}
                    {imageErrors[poster.id] && (
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center p-4">
                        <FiImage size={32} className="text-gray-400 mx-auto mb-3" />
                        <p className="text-sm font-medium text-gray-600 text-center mb-2">
                          Failed to load image
                        </p>
                        <p className="text-xs text-gray-500 text-center mb-4">
                          {retryCounts[poster.id] > 2 ? 'Image may be corrupted or unavailable' : 'Please check your connection'}
                        </p>
                        <button
                          onClick={() => handleRetryImage(poster.id, poster.imageUrl)}
                          disabled={loadingImages[poster.id]}
                          className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors duration-200 disabled:opacity-50"
                        >
                          <FiRefreshCw size={14} className={loadingImages[poster.id] ? 'animate-spin' : ''} />
                          <span>
                            {loadingImages[poster.id] ? 'Retrying...' : 'Retry Loading'}
                          </span>
                        </button>
                        {retryCounts[poster.id] > 2 && (
                          <p className="text-xs text-gray-400 mt-2 text-center">
                            Try re-uploading the image
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Poster Info */}
                  <div className="p-4">
                    <h4 className="font-semibold text-gray-800 truncate mb-1" title={poster.title}>
                      {poster.title}
                    </h4>
                    {/* ** DISPLAY NEW FIELD ** */}
                    {poster.subContents && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2" title={poster.subContents}>
                            {poster.subContents}
                        </p>
                    )}
                    <p className="text-xs text-gray-500 mb-1">{poster.date}</p>
                    <p className="text-xs text-gray-400 font-mono truncate" title={`ID: ${poster.posterId}`}>
                      ID: {poster.posterId}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleEditClick(poster)}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm py-2 rounded-xl flex items-center justify-center font-medium shadow hover:shadow-md transition-all duration-200"
                      >
                        <FiEdit className="mr-1" size={14} />
                        Edit
                      </button>

                      <button
                        onClick={() => handleDeletePoster(poster.id)}
                        className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm py-2 rounded-xl flex items-center justify-center font-medium shadow hover:shadow-md transition-all duration-200"
                      >
                        <FiTrash2 className="mr-1" size={14} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform animate-slideUp max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 flex items-center">
                <FiEdit className="mr-2 text-blue-500" />
                Edit Poster Details
              </h3>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Poster Title
                </label>
                <input
                  value={editedTitle}
                  onChange={e => setEditedTitle(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  required
                  autoFocus
                  maxLength={100}
                  placeholder="Enter poster title..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  {editedTitle.length}/100 characters
                </p>
              </div>
            
            {/* ** NEW EDIT INPUT FOR SUB-CONTENTS ** */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sub-Contents (Optional)
                </label>
                <textarea
                  value={editedSubContents}
                  onChange={e => setEditedSubContents(e.target.value)}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  maxLength={500}
                  placeholder="Enter a short description or key points..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  {editedSubContents.length}/500 characters
                </p>
            </div>


              <div className="flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all duration-200"
                >
                  Cancel
                </button>

                <button 
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium shadow hover:shadow-md transform hover:-translate-y-0.5 transition-all duration-200 flex items-center"
                >
                  <FiSave className="mr-2" size={16} />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style> 
    </div>
  );
}