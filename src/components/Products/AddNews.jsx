import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from "react-router-dom"; 
import {
    FiFileText,
    FiTag,
    FiCalendar,
    FiImage,
    FiVideo,
    FiX,
    FiSave,
    FiUpload,
    FiRefreshCw,
    FiPlus,
    FiChevronDown,
    FiTrash2,
    FiGlobe,
    FiArrowLeft
} from 'react-icons/fi';
import { 
    collection, 
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    serverTimestamp
} from "firebase/firestore";
import { 
    ref,
    uploadBytes,
    getDownloadURL
} from "firebase/storage";
import { db, storage } from "../../firebase"; 

const AddNewsToday = () => {
    const navigate = useNavigate();
    const { newsId } = useParams();
    const isEditMode = !!newsId;

   const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    category: '',
    date: '',
    mainImage: null,
    images: [],
    video: null,
    location: '',
    marketRates: [{ itemName: '', price: '' }],
});

const [existingData, setExistingData] = useState(null);

const [mainImagePreview, setMainImagePreview] = useState(null);


 const [imagePreviews, setImagePreviews] = useState([]);

    const [videoPreview, setVideoPreview] = useState(null);

    const [allCategories, setAllCategories] = useState([]);
    const [showCategoryInput, setShowCategoryInput] = useState(false);
    const [newCategory, setNewCategory] = useState('');
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [loadingCategories, setLoadingCategories] = useState(false);

    const isFormDisabled = isSaving;

    // -------------------------
    // Fetch Categories
    // -------------------------
    useEffect(() => {
        fetchExistingCategories();
        if (isEditMode) {
            fetchNewsDetails();
        }
    }, [newsId]);

    const fetchNewsDetails = async () => {
        try {
            setIsSaving(true);
            const docRef = doc(db, "news", newsId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                setExistingData(data);
                setFormData({
                    title: data.title || '',
                    excerpt: data.excerpt || '',
                    category: data.category || '',
                    date: data.date || '',
                    mainImage: null,
                    images: [],
                    video: null,
                    location: data.location || '',
                    marketRates: data.marketRates?.length ? data.marketRates : [{ itemName: '', price: '' }],
                });

                if (data.mainImageUrl) setMainImagePreview(data.mainImageUrl);
                if (data.gallery) setImagePreviews(data.gallery);
                if (data.videoUrl) setVideoPreview(data.videoUrl);
            } else {
                setSaveMessage("News article not found.");
            }
        } catch (error) {
            console.error("Error fetching news details:", error);
            setSaveMessage("Failed to fetch news details.");
        } finally {
            setIsSaving(false);
        }
    };

    const fetchExistingCategories = async () => {
        try {
            setLoadingCategories(true);
            const snapshot = await getDocs(collection(db, "news"));
            const categories = new Set();

            snapshot.docs.forEach(doc => {
                if (doc.data().category) {
                    categories.add(doc.data().category.trim());
                }
            });

            setAllCategories([...categories].sort());
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingCategories(false);
        }
    };

    // -------------------------
    // Handlers
    // -------------------------
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleMainImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFormData(prev => ({ ...prev, mainImage: file }));
    setMainImagePreview(URL.createObjectURL(file));
};

const handleRemoveMainImage = () => {
    if (mainImagePreview && mainImagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(mainImagePreview);
    }
    setFormData(prev => ({ ...prev, mainImage: null }));
    setMainImagePreview(null);
};


    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);

        if (!files.length) return;

        setFormData(prev => ({
            ...prev,
            images: [...prev.images, ...files]
        }));

        const previews = files.map(file => URL.createObjectURL(file));
        setImagePreviews(prev => [...prev, ...previews]);
    };


    const handleVideoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, video: file }));
            setVideoPreview(URL.createObjectURL(file));
        }
    };

    const handleRemoveImage = (index) => {
        const previewToRemove = imagePreviews[index];
        if (previewToRemove && previewToRemove.startsWith('blob:')) {
            URL.revokeObjectURL(previewToRemove);
        }

        // We need to find the correct index in formData.images
        // In Edit mode, imagePreviews contains existing URLs + new blobs
        // formData.images ONLY contains new files.
        
        const isNewFile = previewToRemove && previewToRemove.startsWith('blob:');
        
        if (isNewFile) {
            // Find which File it corresponds to.
            // This is tricky because we don't store the mapping.
            // Let's change the approach: Use a unified array for editing.
            
            // Actually, let's just count how many blobs were before this one.
            let blobIndex = 0;
            for(let i=0; i<index; i++) {
                if (imagePreviews[i].startsWith('blob:')) blobIndex++;
            }
            
            setFormData(prev => ({
                ...prev,
                images: prev.images.filter((_, i) => i !== blobIndex)
            }));
        }

        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };


const handleReplaceMainImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (mainImagePreview && mainImagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(mainImagePreview);
    }

    setFormData(prev => ({ ...prev, mainImage: file }));
    setMainImagePreview(URL.createObjectURL(file));
};

const handleReplaceGalleryImage = (index, file) => {
    if (!file) return;

    const oldPreview = imagePreviews[index];
    if (oldPreview && oldPreview.startsWith('blob:')) {
        URL.revokeObjectURL(oldPreview);
    }

    const newPreview = URL.createObjectURL(file);

    const isExisting = oldPreview && !oldPreview.startsWith('blob:');

    if (isExisting) {
        // If it was an existing URL, we treat it as a removal of the URL and addition of a new file
        setImagePreviews(prev => {
            const updated = [...prev];
            updated[index] = newPreview;
            return updated;
        });
        setFormData(prev => ({
            ...prev,
            images: [...prev.images, file]
        }));
    } else {
        // It was a blob, find its index in formData.images
        let blobIndex = 0;
        for(let i=0; i<index; i++) {
            if (imagePreviews[i].startsWith('blob:')) blobIndex++;
        }
        
        setFormData(prev => {
            const updatedImages = [...prev.images];
            updatedImages[blobIndex] = file;
            return { ...prev, images: updatedImages };
        });
        
        setImagePreviews(prev => {
            const updated = [...prev];
            updated[index] = newPreview;
            return updated;
        });
    }
};

const handleReplaceVideo = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
    }

    setFormData(prev => ({ ...prev, video: file }));
    setVideoPreview(URL.createObjectURL(file));
};


    const handleRemoveVideo = () => {
        URL.revokeObjectURL(videoPreview);
        setFormData(prev => ({ ...prev, video: null }));
        setVideoPreview(null);
    };

    const handleAddCategory = () => {
        if (!newCategory.trim()) return;

        const trimmed = newCategory.trim();
        if (!allCategories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
            setAllCategories(prev => [...prev, trimmed].sort());
        }

        setFormData(prev => ({ ...prev, category: trimmed }));
        setNewCategory('');
        setShowCategoryInput(false);
    };

    // -------------------------
    // Market Rates Handlers
    // -------------------------
    const handleMarketRateChange = (index, field, value) => {
        const updatedRates = [...formData.marketRates];
        updatedRates[index][field] = value;
        setFormData(prev => ({ ...prev, marketRates: updatedRates }));
    };

    const addMarketRate = () => {
        if (formData.marketRates.length >= 3) return;
        setFormData(prev => ({
            ...prev,
            marketRates: [...prev.marketRates, { itemName: '', price: '' }]
        }));
    };

    const removeMarketRate = (index) => {
        if (formData.marketRates.length === 1) {
            setFormData(prev => ({
                ...prev,
                marketRates: [{ itemName: '', price: '' }]
            }));
            return;
        }
        setFormData(prev => ({
            ...prev,
            marketRates: prev.marketRates.filter((_, i) => i !== index)
        }));
    };

    const handleCancel = () => {
        if (window.confirm("Unsaved data will be lost. Continue?")) {
            navigate('/news/view');
        }
    };

    
    // -------------------------
    // SAVE NEWS
    // -------------------------
    const handleSave = async (e) => {
        e.preventDefault();

        if (!formData.title || !formData.excerpt || !formData.category || !formData.date) {
            setSaveMessage("Please fill all required fields.");
            return;
        }

        setIsSaving(true);
        setSaveMessage('');

        try {
            let mainImageUrl = existingData?.mainImageUrl || null;
            let mainImagePath = existingData?.mainImagePath || null;

            if (formData.mainImage) {
                mainImagePath = `news/main/${Date.now()}_${formData.mainImage.name}`;
                const imageRef = ref(storage, mainImagePath);
                await uploadBytes(imageRef, formData.mainImage);
                mainImageUrl = await getDownloadURL(imageRef);
            } else if (mainImagePreview === null) {
                // Image was removed
                mainImageUrl = null;
                mainImagePath = null;
            }

            let videoUrl = existingData?.videoUrl || null;
            let videoPath = existingData?.videoPath || null;

            if (formData.video) {
                videoPath = `news/videos/${Date.now()}_${formData.video.name}`;
                const videoRef = ref(storage, videoPath);
                await uploadBytes(videoRef, formData.video);
                videoUrl = await getDownloadURL(videoRef);
            } else if (videoPreview === null) {
                // Video was removed
                videoUrl = null;
                videoPath = null;
            }

            let galleryUrls = isEditMode ? (existingData?.gallery || []) : [];
            let galleryPaths = isEditMode ? (existingData?.galleryPaths || []) : [];

            // If images were removed from preview but they were existing ones
            if (isEditMode) {
                const updatedGallery = [];
                const updatedPaths = [];
                imagePreviews.forEach((preview, index) => {
                    // If it's a URL (existing image) and it's in the original gallery
                    if (typeof preview === 'string' && preview.startsWith('http')) {
                        const originalIdx = existingData.gallery.indexOf(preview);
                        if (originalIdx !== -1) {
                            updatedGallery.push(preview);
                            updatedPaths.push(existingData.galleryPaths[originalIdx]);
                        }
                    }
                });
                galleryUrls = updatedGallery;
                galleryPaths = updatedPaths;
            }

            // Upload new gallery images
            if (formData.images.length > 0) {
                for (const image of formData.images) {
                    const path = `news/gallery/${Date.now()}_${image.name}`;
                    const imageRef = ref(storage, path);
                    await uploadBytes(imageRef, image);
                    const url = await getDownloadURL(imageRef);
                    galleryUrls.push(url);
                    galleryPaths.push(path);
                }
            }

            const newsData = {
                title: formData.title.trim(),
                excerpt: formData.excerpt.trim(),
                category: formData.category.trim(),
                date: formData.date,
                mainImageUrl,
                mainImagePath,
                gallery: galleryUrls,
                galleryPaths,
                videoUrl,
                videoPath,
                location: formData.location.trim(),
                marketRates: formData.marketRates.filter(rate => rate.itemName.trim() || rate.price.trim()),
                updatedAt: serverTimestamp(),
            };

            if (isEditMode) {
                const docRef = doc(db, "news", newsId);
                await updateDoc(docRef, newsData);
                setSaveMessage("News article updated successfully!");
            } else {
                const docRef = doc(collection(db, "news"));
                await setDoc(docRef, {
                    ...newsData,
                    id: docRef.id,
                    createdAt: serverTimestamp(),
                });
                setSaveMessage("News article added successfully!");
            }

            setTimeout(() => navigate('/news/view'), 1200);

        } catch (error) {
            console.error(error);
            setSaveMessage("Failed to save news. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };


    // -------------------------
    // UI
    // -------------------------
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8 text-center relative">
                    <button
                        onClick={() => navigate('/news/view')}
                        className="absolute left-0 top-1/2 -translate-y-1/2 p-3 bg-white rounded-full shadow-md hover:shadow-lg transition-all text-gray-600 hover:text-blue-600"
                    >
                        <FiArrowLeft size={20} />
                    </button>
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4 shadow-lg">
                        <FiGlobe className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {isEditMode ? 'Edit News Article' : 'Add News Today'}
                    </h1>
                    <p className="text-gray-600 mt-2">
                        {isEditMode ? 'Update existing news information' : 'Share the latest updates with your audience'}
                    </p>
                </div>

                {/* Main Form Card */}
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                    <div className="p-8">
                        {/* Status Message */}
                        {saveMessage && (
                            <div className={`mb-6 p-4 rounded-lg ${saveMessage.includes('✅') || saveMessage.includes('successfully') 
                                ? 'bg-green-50 text-green-700 border border-green-200' 
                                : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                <div className="flex items-center">
                                    {saveMessage.includes('✅') || saveMessage.includes('successfully') ? (
                                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                    {saveMessage.replace('❌', '').replace('✅', '')}
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSave} className="space-y-8">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    <FiFileText className="inline mr-2" />
                                    News Title *
                                </label>
                                <input
                                    type="text"
                                    name="title"
                                    placeholder="Enter a compelling headline..."
                                    value={formData.title}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                                    required
                                    disabled={isFormDisabled}
                                />
                            </div>

                            {/* Category Section */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    <FiTag className="inline mr-2" />
                                    Category *
                                </label>
                                <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <select
                                            name="category"
                                            value={formData.category}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none transition duration-200"
                                            required
                                            disabled={isFormDisabled}
                                        >
                                            <option value="" hidden >Select a category</option>
                                            {loadingCategories ? (
                                                <option disabled>Loading categories...</option>
                                            ) : (
                                                allCategories.map((c, i) => (
                                                    <option key={i} value={c}>{c}</option>
                                                ))
                                            )}
                                        </select>
                                        <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowCategoryInput(!showCategoryInput)}
                                        className="px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition duration-200 flex items-center whitespace-nowrap"
                                        disabled={isFormDisabled}
                                    >
                                        <FiPlus className="mr-2" />
                                        New Category
                                    </button>
                                </div>
                                
                                {showCategoryInput && (
                                    <div className="mt-3 p-4 bg-blue-50 rounded-xl border border-blue-200 animate-fadeIn">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newCategory}
                                                onChange={(e) => setNewCategory(e.target.value)}
                                                placeholder="Enter new category name"
                                                className="flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                disabled={isFormDisabled}
                                            />
                                            <button
                                                type="button"
                                                onClick={handleAddCategory}
                                                className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition duration-200"
                                                disabled={isFormDisabled}
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Media Upload Section */}
                            <div className="border rounded-2xl p-6 ">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
        <FiImage /> News Image
    </h3>

    <div className="grid md:grid-cols-2 gap-6">
        {/* MAIN IMAGE */}
        <div>
           {!mainImagePreview ? (
    <label className="border-2 border-dashed border-pink-400 rounded-xl h-40 flex flex-col items-center justify-center cursor-pointer">
        <FiUpload className="mb-2" />
        <p>Upload Main News Image</p>
        <p className="text-xs text-gray-500">(Recommended)</p>
        <input
            type="file"
            accept="image/*"
            hidden
            onChange={handleMainImageChange}
        />
    </label>
) : (
    <div className="relative group">
        <img
            src={mainImagePreview}
            className="h-40 w-full object-contain rounded-xl border"
        />

        {/* ❌ REMOVE */}
        <button
            onClick={handleRemoveMainImage}
            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
        >
            <FiX />
        </button>

        {/* 🔄 REPLACE (THIS WAS MISSING) */}
        <label className="absolute bottom-2 right-2 bg-blue-600 text-white text-xs px-3 py-1 rounded-lg cursor-pointer flex items-center gap-1 shadow opacity-0 group-hover:opacity-100 transition">
            <FiRefreshCw size={12} />
            Replace
            <input
                type="file"
                accept="image/*"
                hidden
                onChange={handleReplaceMainImage}
            />
        </label>
    </div>
)}

        </div>

        {/* VIDEO */}
        <div>
            {/* VIDEO */}
<div>
    {!videoPreview ? (
        <label className="border-2 border-dashed border-purple-400 rounded-xl h-40 flex flex-col items-center justify-center cursor-pointer">
            <FiVideo className="mb-2" />
            <p>Upload News Video</p>
            <p className="text-xs text-gray-500">(Max 1 file)</p>
            <input
                type="file"
                accept="video/*"
                hidden
                onChange={handleVideoChange}
            />
        </label>
    ) : (
        <div className="relative group">
            <video
                src={videoPreview}
                controls
                className="h-40 w-full rounded-xl border"
            />

            {/* ❌ REMOVE VIDEO */}
            <button
                onClick={handleRemoveVideo}
                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
            >
                <FiX />
            </button>

            {/* 🔄 REPLACE VIDEO */}
            <label className="absolute bottom-2 right-2 bg-blue-600 text-white text-xs px-3 py-1 rounded-lg cursor-pointer flex items-center gap-1 shadow opacity-0 group-hover:opacity-100 transition">
                <FiRefreshCw size={12} />
                Replace
                <input
                    type="file"
                    accept="video/*"
                    hidden
                    onChange={handleReplaceVideo}
                />
            </label>
        </div>
    )}
</div>

        </div>
    </div>
</div>
<div className="border rounded-2xl p-6  mt-6">
    {/* Header */}
    <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">
           News Gallery Image Previews ({imagePreviews.length})
        </h3>

        <label className="text-blue-600 cursor-pointer font-medium">
            + Add More
            <input
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={handleImageChange}
            />
        </label>
    </div>

    {/* EMPTY STATE (show upload box ONLY if no images) */}
    {imagePreviews.length === 0 ? (
        <label className="border-2 border-dashed border-blue-400 rounded-xl h-40 flex flex-col items-center justify-center cursor-pointer">
            <FiImage className="mb-2" />
            <p className="font-medium">Upload News Gallery Images (N number)</p>
            <p className="text-xs text-gray-500">(Optional)</p>
            <input
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={handleImageChange}
            />
        </label>
    ) : (
        /* GALLERY CARDS (replace upload box) */
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {imagePreviews.map((src, index) => (
               <div key={index} className="relative bg-white rounded-xl shadow border group">
    <span className="absolute top-1 left-1 bg-pink-600 text-white text-xs px-2 py-0.5 rounded">
        GALLERY
    </span>

    <img src={src} className="h-28 w-full object-contain rounded-t-xl" />

    {/* REMOVE */}
    <button
        onClick={() => handleRemoveImage(index)}
        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full"
    >
        <FiX size={12} />
    </button>

    {/* 🔄 REPLACE */}
    <label className="absolute bottom-1 right-1 bg-blue-600 text-white text-xs px-2 py-0.5 rounded cursor-pointer opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
        <FiRefreshCw size={12} />
        Replace
        <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) =>
                handleReplaceGalleryImage(index, e.target.files[0])
            }
        />
    </label>
</div>

            ))}
        </div>
    )}
</div>


                            {/* Content */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    <FiFileText className="inline mr-2" />
                                    News Content *
                                </label>
                                <textarea
                                    name="excerpt"
                                    rows="5"
                                    placeholder="Write your news content here..."
                                    value={formData.excerpt}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 resize-none"
                                    required
                                    disabled={isFormDisabled}
                                />
                            </div>
                            {/* Publication Date & Location */}
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        <FiCalendar className="inline mr-2" />
                                        Publication Date *
                                    </label>

                                    <input
                                        type="date"
                                        name="date"
                                        value={
                                            formData.date
                                                ? formData.date.split('/').reverse().join('-')
                                                : ''
                                        }
                                        onChange={(e) => {
                                            const [y, m, d] = e.target.value.split('-');
                                            handleChange({
                                                target: {
                                                    name: 'date',
                                                    value: `${d}/${m}/${y}` // DD/MM/YYYY
                                                }
                                            });
                                        }}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                                        required
                                        disabled={isFormDisabled}
                                    />

                                    <p className="text-sm text-gray-500 mt-1">
                                        Pick a date from calendar
                                    </p>
                                </div>

                                {/* Location */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        <FiGlobe className="inline mr-2" />
                                        Location
                                    </label>
                                    <input
                                        type="text"
                                        name="location"
                                        placeholder=""
                                        value={formData.location}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                                        disabled={isFormDisabled}
                                    />
                                </div>
                            </div>



                            {/* Contact Details (Dynamic Inputs) */}
                            <div className="space-y-6 border-t pt-8">
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <FiGlobe className="text-blue-500" />
                                    News Contact Details
                                </h3>

                                <div className="space-y-4">

                                    {formData.marketRates.map((rate, index) => (
                                        <div key={index} className="flex gap-4 items-end animate-fadeIn">
                                            <div className="flex-1">
                                                <input
                                                    type="text"
                                                    placeholder=""
                                                    value={rate.itemName}
                                                    onChange={(e) => handleMarketRateChange(index, 'itemName', e.target.value)}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                                                    disabled={isFormDisabled}
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <input
                                                    type="text"
                                                    placeholder=""
                                                    value={rate.price}
                                                    onChange={(e) => handleMarketRateChange(index, 'price', e.target.value)}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                                                    disabled={isFormDisabled}
                                                />
                                            </div>
                                            {formData.marketRates.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeMarketRate(index)}
                                                    className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                                    disabled={isFormDisabled}
                                                >
                                                    <FiTrash2 size={20} />
                                                </button>
                                            )}
                                        </div>
                                    ))}

                                    {formData.marketRates.length < 3 && (
                                        <button
                                            type="button"
                                            onClick={addMarketRate}
                                            className="flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-700 transition-colors py-2"
                                            disabled={isFormDisabled}
                                        >
                                            <FiPlus className="p-1 bg-blue-100 rounded-full" size={24} />
                                            Add more Rows
                                        </button>
                                    )}
                                </div>
                            </div>


                            {/* Action Buttons */}
                            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className={`px-6 py-3 border ${isFormDisabled ? 'border-gray-300 text-gray-400' : 'border-gray-300 text-gray-700 hover:bg-gray-50'} rounded-xl font-medium transition duration-200`}
                                    disabled={isFormDisabled}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isFormDisabled}
                                    className={`px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-purple-700 transition duration-200 flex items-center ${isFormDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isSaving ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <FiSave className="mr-2" />
                                            {isEditMode ? 'Update News' : 'Publish News'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Info Footer */}
                <div className="mt-8 text-center text-sm text-gray-500">
                    <p>Fields marked with * are required</p>
                    <p className="mt-1">All uploaded media will be stored securely</p>
                </div>
            </div>

            {/* Add custom animations */}
            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};

export default AddNewsToday;