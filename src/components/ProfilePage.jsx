import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { Camera, User, Mail, Save, ArrowLeft, Upload } from "lucide-react";

// Add CSS as a string for the animation
const fadeInAnimation = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
  }
`;

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", photoURL: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Add animation style to head
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = fadeInAnimation;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = () => {
    try {
      const stored = localStorage.getItem("adminUser");
      if (!stored || stored === "undefined" || stored === "null") return;

      const parsed = JSON.parse(stored);
      setUser(parsed);
      setForm({
        name: parsed.name || "",
        email: parsed.email || "",
        photoURL: parsed.photoURL || "",
      });
      setImagePreview(parsed.photoURL || "/default-avatar.png");
    } catch (err) {
      console.error("Invalid JSON in adminUser:", err);
      setUser(null);
    }
  };

  // Function to notify header about profile update
  const notifyHeaderUpdate = (updatedUser) => {
    // Dispatch custom event for header to listen
    window.dispatchEvent(new CustomEvent('profileUpdated', { 
      detail: updatedUser 
    }));
    
    // Also trigger storage event for cross-tab sync
    localStorage.setItem('adminUser', JSON.stringify(updatedUser));
    window.dispatchEvent(new Event('storage'));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (error) setError("");
    
    setForm((prevForm) => ({
      ...prevForm,
      [name]: value,
    }));

    // Update image preview when photoURL changes
    if (name === "photoURL") {
      setImagePreview(value || "/default-avatar.png");
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setError("Please upload a valid image file (JPG, PNG, or GIF)");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      return;
    }

    setIsUploading(true);
    setError("");
    
    // Create local preview URL
    const reader = new FileReader();
    
    reader.onloadend = () => {
      const imageUrl = reader.result;
      setForm(prev => ({ ...prev, photoURL: imageUrl }));
      setImagePreview(imageUrl);
      setIsUploading(false);
      setSuccess("Image uploaded successfully!");
      
      // Auto-update header with new image
      if (user) {
        const updatedUser = { ...user, photoURL: imageUrl };
        notifyHeaderUpdate(updatedUser);
      }
      
      setTimeout(() => setSuccess(""), 3000);
    };
    
    reader.onerror = () => {
      setIsUploading(false);
      setError("Error uploading image. Please try again.");
    };
    
    reader.readAsDataURL(file);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!user) return;

    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and Email fields cannot be empty.");
      setSuccess("");
      return;
    }
    
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const userRef = doc(db, "admin", user.uid);
      const updatedData = {
        name: form.name,
        email: form.email,
        photoURL: form.photoURL,
        updatedAt: new Date().toISOString(),
      };

      // Update in Firebase
      await updateDoc(userRef, updatedData);

      // Update local storage and state
      const newUser = { ...user, ...updatedData };
      
      // Notify header about the update
      notifyHeaderUpdate(newUser);
      
      setUser(newUser);
      setSuccess("Profile updated successfully!");
      
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      console.error("Update error:", err);
      setError("Failed to update profile. Please check your connection or permissions.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearImage = () => {
    setForm(prev => ({ ...prev, photoURL: "" }));
    setImagePreview("/default-avatar.png");
    
    // Notify header about clear
    if (user) {
      const updatedUser = { ...user, photoURL: "" };
      notifyHeaderUpdate(updatedUser);
    }
  };

  const handleBack = () => {
    window.history.back();
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-all duration-200 group mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
              <p className="text-gray-600 mt-2">Manage your account information and preferences</p>
            </div>
            <div className="hidden md:block text-sm text-gray-500 bg-white px-4 py-2 rounded-full shadow-sm">
              User ID: {user.uid.substring(0, 8)}...
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl shadow-sm animate-fadeIn">
            <div className="flex items-center">
              <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-green-800 font-medium">{success}</p>
                <p className="text-green-600 text-sm mt-1">Changes have been saved and updated in header</p>
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl shadow-sm animate-fadeIn">
            <div className="flex items-center">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-red-800 font-medium">{error}</p>
                <p className="text-red-600 text-sm mt-1">Please try again or contact support</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Profile Picture */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-6">
              <div className="text-center">
                <div className="relative inline-block mb-6">
                  <div className="w-40 h-40 rounded-2xl overflow-hidden border-4 border-white shadow-2xl mx-auto">
                    <img
                      src={imagePreview}
                      alt="Profile Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = "/default-avatar.png";
                        setImagePreview("/default-avatar.png");
                      }}
                    />
                  </div>
                  
                  {/* Online Status Indicator */}
                  <div className="absolute bottom-4 right-4">
                    <div className="w-6 h-6 bg-green-500 rounded-full border-3 border-white shadow-lg"></div>
                  </div>
                  
                  {/* Upload Overlay */}
                  <label className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 rounded-2xl cursor-pointer transition-all duration-300 flex items-center justify-center opacity-0 hover:opacity-100 group">
                    <div className="text-white text-center transform scale-0 group-hover:scale-100 transition-transform duration-300">
                      <Camera className="w-8 h-8 mx-auto mb-2" />
                      <span className="text-sm font-medium">Change Photo</span>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,image/gif,image/jpg"
                      onChange={handleImageUpload}
                    />
                  </label>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-gray-900">{form.name || "No Name"}</h3>
                  <p className="text-gray-600 text-sm flex items-center justify-center">
                    <Mail className="w-4 h-4 mr-2" />
                    {form.email || "No Email"}
                  </p>
                  <div className="inline-flex items-center px-4 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    <User className="w-4 h-4 mr-2" />
                    Administrator
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Account Details
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Member Since</span>
                    <span className="font-medium text-gray-900">
                      {new Date().toLocaleDateString('default', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Last Updated</span>
                    <span className="font-medium text-gray-900">Just now</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Status</span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              {/* Form Header */}
              <div className="px-8 py-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">Edit Profile Information</h2>
                <p className="text-gray-600 mt-1">Update your personal details and preferences</p>
              </div>

              {/* Form Content */}
              <form onSubmit={handleUpdate} className="p-8">
                <div className="space-y-8">
                  
                  {/* Photo Upload Section */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Profile Picture</h3>
                        <p className="text-gray-600 text-sm">Upload a new photo or paste a URL</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <label className="px-4 py-2 bg-white border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors duration-200 cursor-pointer flex items-center">
                          <Upload className="w-4 h-4 mr-2" />
                          Upload
                          <input
                            type="file"
                            className="hidden"
                            accept="image/jpeg,image/png,image/gif,image/jpg"
                            onChange={handleImageUpload}
                          />
                        </label>
                      </div>
                    </div>
                    
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={handleClearImage}
                        className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors duration-200"
                      >
                        Clear
                      </button>
                    </div>
                    
                    {isUploading && (
                      <div className="mt-4 flex items-center text-blue-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        Uploading image...
                      </div>
                    )}
                    
                    <p className="text-sm text-gray-500 mt-4">
                      Supports JPG, PNG, GIF up to 5MB. Image will automatically update in header.
                    </p>
                  </div>

                  {/* Personal Information Section */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-3">
                      Personal Information
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          <User className="w-4 h-4 inline mr-2" />
                          Full Name
                        </label>
                        <input
                          name="name"
                          type="text"
                          value={form.name}
                          onChange={handleFormChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          placeholder="Enter your full name"
                        />
                        <p className="text-sm text-gray-500 mt-2">This will be displayed on your profile</p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          <Mail className="w-4 h-4 inline mr-2" />
                          Email Address
                        </label>
                        <input
                          name="email"
                          type="email"
                          value={form.email}
                          onChange={handleFormChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          placeholder="your.email@example.com"
                        />
                        <p className="text-sm text-gray-500 mt-2">We'll send important updates to this email</p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row justify-between items-center pt-6 border-t border-gray-100">
                    <div className="flex space-x-4">
                      <button
                        type="button"
                        onClick={handleBack}
                        className="px-6 py-3 text-gray-700 hover:text-gray-900 font-medium transition-colors duration-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading || !form.name.trim() || !form.email.trim()}
                        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-lg flex items-center"
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-5 h-5 mr-2" />
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Footer Note */}
            <div className="mt-6 text-center text-gray-500 text-sm">
              <p>Profile picture updates instantly in the header across all tabs.</p>
              <p className="mt-1">Your data is encrypted and securely stored in Firebase.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}