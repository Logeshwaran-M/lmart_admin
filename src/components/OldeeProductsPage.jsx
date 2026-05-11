import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom"; 
import { 
    collection, 
    query, 
    orderBy, 
    onSnapshot, 
    doc, 
    updateDoc, 
    deleteDoc,
    getDoc,
    setDoc,
    addDoc,
    getDocs,
    writeBatch 
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { db } from "../firebase";
import { 
    FiUser, 
    FiRefreshCw, 
    FiAlertTriangle, 
    FiClock, 
    FiPackage, 
    FiXCircle, 
    FiCheckCircle, 
    FiPhone, 
    FiTag,
    FiEdit,
    FiTrash2,
    FiSave, 
    FiDollarSign, 
    FiFileText,
    FiCheck,
    FiPlus,
    FiX,
    FiMoreVertical,
    FiEye,
    FiMapPin,
    FiMail,
    FiShoppingBag,
    FiInfo,
    FiPercent,
    FiSearch,
    FiFilter
} from "react-icons/fi";
const storage = getStorage();

// Format Firestore timestamp
const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
        return date.toLocaleString();
    } catch {
        return "Invalid Date";
    }
};

// --- PRODUCT VIEW MODAL ---
const ProductViewModal = ({ product, onClose, onEdit, onDelete, onToggleStatus, processingId }) => {
    if (!product) return null;

    const calculateDiscount = () => {
        if (!product.offerPrice || !product.price || product.offerPrice >= product.price) return 0;
        return Math.round(((product.price - product.offerPrice) / product.price) * 100);
    };

    const discount = calculateDiscount();

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
                
                {/* Modal Header */}
                <div className="flex justify-between items-center mb-6 pb-4 border-b">
                    <div className="flex items-center">
                        <FiEye className="w-6 h-6 text-blue-600 mr-3" />
                        <h2 className="text-2xl font-bold text-gray-900">
                            Product Details: <span className="text-blue-600">{product.name}</span>
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <FiX className="w-6 h-6" />
                    </button>
                </div>

                {/* Product Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Left Column - Images & Basic Info */}
                    <div>
                        {/* Product Image */}
                        <div className="mb-6">
                            <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center h-64">
                                <img
                                    src={product.imageURLs?.[0] || "https://via.placeholder.com/300x200"}
                                    alt={product.name}
                                    className="max-h-56 max-w-full object-contain rounded-lg"
                                />
                            </div>
                            {product.imageURLs && product.imageURLs.length > 1 && (
                                <div className="flex mt-2 space-x-2 overflow-x-auto">
                                    {product.imageURLs.slice(1).map((url, index) => (
                                        <img
                                            key={index}
                                            src={url}
                                            alt={`${product.name} ${index + 2}`}
                                            className="w-16 h-16 object-cover rounded border"
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Status & Actions */}
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-4">
                                <span className={`font-bold uppercase text-sm px-3 py-1 rounded-full ${
                                    product.status === 'active' ? 'bg-green-100 text-green-700' :
                                    product.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                }`}>
                                    <FiTag className="inline w-3 h-3 mr-1" />{product.status || 'N/A'}
                                </span>
                                
                                {product.isSold && (
                                    <span className="font-bold uppercase text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">SOLD</span>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => onToggleStatus(product.id, product.status)}
                                    disabled={processingId === product.id}
                                    className={`flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition duration-150 ${
                                        product.status === 'active' 
                                            ? 'bg-red-500 hover:bg-red-600 text-white' 
                                            : 'bg-green-500 hover:bg-green-600 text-white'
                                    } disabled:opacity-50`}
                                >
                                    {processingId === product.id ? (
                                        <FiRefreshCw className="w-4 h-4 animate-spin" />
                                    ) : product.status === 'active' ? (
                                        <>
                                            <FiXCircle className="w-4 h-4 mr-2" />
                                            Deactivate
                                        </>
                                    ) : (
                                        <>
                                            <FiCheckCircle className="w-4 h-4 mr-2" />
                                            Activate
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={() => {
                                        onClose();
                                        onEdit(product.id);
                                    }}
                                    disabled={processingId === product.id}
                                    className="flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition duration-150"
                                >
                                    <FiEdit className="w-4 h-4 mr-2" />
                                    Edit
                                </button>

                                <button
                                    onClick={() => {
                                        onClose();
                                        onDelete(product);
                                    }}
                                    disabled={processingId === product.id}
                                    className="flex items-center justify-center bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition duration-150 col-span-2"
                                >
                                    <FiTrash2 className="w-4 h-4 mr-2" />
                                    Delete Product
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Details */}
                    <div>
                        {/* Price Section */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">{product.name}</h3>
                                    {product.category && (
                                        <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium mt-2">
                                            {product.category}
                                        </span>
                                    )}
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-gray-900">
                                        ₹{product.offerPrice || product.price || '0'}
                                    </div>
                                    {product.offerPrice && product.offerPrice < product.price && (
                                        <div className="flex items-center justify-end mt-1">
                                            <span className="text-sm text-gray-500 line-through mr-2">
                                                ₹{product.price}
                                            </span>
                                            <span className="text-sm font-bold text-red-600 flex items-center">
                                                <FiPercent className="w-3 h-3 mr-1" />
                                                {discount}% OFF
                                            </span>
                                        </div>
                                    )}
                                    <div className="text-sm text-gray-600 mt-1">
                                        {product.negotiation === 'Negotiable' ? 'Negotiable Price' : 'Fixed Price'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="mb-6">
                            <h4 className="flex items-center text-lg font-semibold text-gray-800 mb-2">
                                <FiInfo className="w-5 h-5 mr-2 text-blue-600" />
                                Description
                            </h4>
                            <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                                {product.description || 'No description provided.'}
                            </p>
                        </div>

                        {/* Seller Information */}
                        <div className="mb-6">
                            <h4 className="flex items-center text-lg font-semibold text-gray-800 mb-3">
                                <FiUser className="w-5 h-5 mr-2 text-green-600" />
                                Seller Information
                            </h4>
                            <div className="space-y-3">
                                <div className="flex items-center">
                                    <FiUser className="w-4 h-4 text-gray-500 mr-3" />
                                    <div>
                                        <div className="font-medium text-gray-900">
                                            {product.seller?.displayName || product.sellerId || 'N/A'}
                                        </div>
                                        
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <FiMail className="w-4 h-4 text-gray-500 mr-3" />
                                    <div>
                                        <div className="font-medium text-gray-900">
                                            {product.seller?.email || 'N/A'}
                                        </div>
                                        
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <FiPhone className="w-4 h-4 text-gray-500 mr-3" />
                                    <div>
                                        <div className="font-medium text-gray-900">
                                            {product.contactNumber || 'N/A'}
                                        </div>
                                       
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Location & Dates */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <h4 className="flex items-center text-lg font-semibold text-gray-800 mb-2">
                                    <FiMapPin className="w-5 h-5 mr-2 text-orange-600" />
                                    Location
                                </h4>
                                <p className="text-gray-700 bg-gray-50 p-3 rounded-lg text-sm">
                                    {product.address || 'No address provided.'}
                                </p>
                            </div>
                            <div>
                                <h4 className="flex items-center text-lg font-semibold text-gray-800 mb-2">
                                    <FiClock className="w-5 h-5 mr-2 text-purple-600" />
                                    Timeline
                                </h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Created:</span>
                                        <span className="font-medium">{formatDate(product.createdAt)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Published:</span>
                                        <span className="font-medium">{formatDate(product.publishedAt)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Last Updated:</span>
                                        <span className="font-medium">{formatDate(product.updatedAt) || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="mt-8 pt-4 border-t flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition duration-150"
                    >
                        Close
                    </button>
         
                </div>
            </div>
        </div>
    );
};

// --- SUCCESS NOTIFICATION TOAST ---
const SuccessNotificationToast = ({ message, onClose }) => {
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000); 
            return () => clearTimeout(timer);
        }
    }, [message, onClose]);

    if (!message) return null;

    return (
        <div className="fixed bottom-5 right-5 z-[200]">
            <div className="bg-green-600 text-white p-4 rounded-lg shadow-xl flex items-center space-x-3 transition-opacity duration-300">
                <FiCheck className="w-5 h-5" />
                <span className="font-medium">{message}</span>
            </div>
        </div>
    );
};

// --- CATEGORY MANAGEMENT MODAL ---
const CategoryManagementModal = ({ categories, onAddCategory, onEditCategory, onDeleteCategory, onClose }) => {
    const [newCategory, setNewCategory] = useState("");
    const [editingCategory, setEditingCategory] = useState(null);
    const [editValue, setEditValue] = useState("");
    const [categoryToDelete, setCategoryToDelete] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState("");

    const handleAddCategory = async () => {
        if (!newCategory.trim()) {
            setError("Category name cannot be empty");
            return;
        }

        const trimmedCategory = newCategory.trim();
        
        if (categories.some(cat => cat.toLowerCase() === trimmedCategory.toLowerCase())) {
            setError("Category already exists");
            return;
        }

        setIsAdding(true);
        setError("");
        
        try {
            await onAddCategory(trimmedCategory);
            setNewCategory("");
        } catch (err) {
            setError(`Failed to add category: ${err.message}`);
        } finally {
            setIsAdding(false);
        }
    };

    const handleEditClick = (category) => {
        setEditingCategory(category);
        setEditValue(category);
        setError("");
    };

    const handleSaveEdit = async () => {
        if (!editValue.trim()) {
            setError("Category name cannot be empty");
            return;
        }

        const trimmedValue = editValue.trim();
        
        if (categories.some(cat => cat.toLowerCase() === trimmedValue.toLowerCase() && cat !== editingCategory)) {
            setError("Category already exists");
            return;
        }

        if (trimmedValue === editingCategory) {
            setEditingCategory(null);
            setError("");
            return;
        }

        setIsEditing(true);
        setError("");
        
        try {
            await onEditCategory(editingCategory, trimmedValue);
            setEditingCategory(null);
            setEditValue("");
        } catch (err) {
            setError(`Failed to update category: ${err.message}`);
        } finally {
            setIsEditing(false);
        }
    };

    const handleDeleteClick = (category) => {
        setCategoryToDelete(category);
    };

    const handleConfirmDelete = async () => {
        if (!categoryToDelete) return;
        
        try {
            await onDeleteCategory(categoryToDelete);
            setCategoryToDelete(null);
        } catch (err) {
            setError(`Failed to delete category: ${err.message}`);
        }
    };

    const handleCancelEdit = () => {
        setEditingCategory(null);
        setEditValue("");
        setError("");
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            if (editingCategory) {
                handleSaveEdit();
            } else {
                handleAddCategory();
            }
        }
    };

    // Confirmation Modal for Category Deletion
    const DeleteCategoryConfirmation = () => {
        if (!categoryToDelete) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-[150]">
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm p-6">
                    <div className="flex flex-col items-center space-y-4">
                        <FiTrash2 className="w-12 h-12 text-red-500" />
                        <h3 className="text-xl font-bold text-gray-900">Delete Category</h3>
                        <p className="text-sm text-gray-600 text-center">
                            Are you sure you want to delete the category <strong>"{categoryToDelete}"</strong>?
                            <br />
                            <span className="text-red-500 font-medium">Products using this category will keep it, but it won't be available for new products.</span>
                        </p>
                    </div>
                    
                    <div className="mt-6 flex justify-end space-x-3">
                        <button
                            onClick={() => setCategoryToDelete(null)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirmDelete}
                            className="flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700"
                        >
                            <FiTrash2 className="w-4 h-4 mr-2" />
                            Delete Category
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-[100]">
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900">Manage Categories</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <FiX className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Add Category Section */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Add New Category</label>
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Enter new category name"
                                className="flex-1 p-2 border border-gray-300 rounded-md"
                                disabled={isAdding || isEditing}
                            />
                            <button
                                onClick={handleAddCategory}
                                disabled={isAdding || isEditing || !newCategory.trim()}
                                className={`px-4 py-2 rounded-md text-white ${isAdding ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} disabled:opacity-50`}
                            >
                                {isAdding ? (
                                    <FiRefreshCw className="w-5 h-5 animate-spin" />
                                ) : (
                                    <FiPlus className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Categories List */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-3">Existing Categories ({categories.length})</h3>
                        <div className="max-h-80 overflow-y-auto border rounded-lg">
                            {categories.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">No categories yet. Add your first category!</p>
                            ) : (
                                <div className="divide-y">
                                    {categories.map((category, index) => (
                                        <div
                                            key={index}
                                            className="px-4 py-3 hover:bg-gray-50 flex items-center justify-between group"
                                        >
                                            {editingCategory === category ? (
                                                <div className="flex-1 flex items-center space-x-2">
                                                    <input
                                                        type="text"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        onKeyPress={handleKeyPress}
                                                        className="flex-1 p-2 border border-gray-300 rounded-md text-sm"
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={handleSaveEdit}
                                                        disabled={isEditing}
                                                        className={`px-3 py-2 rounded-md text-white ${isEditing ? 'bg-green-400' : 'bg-green-600 hover:bg-green-700'}`}
                                                    >
                                                        {isEditing ? (
                                                            <FiRefreshCw className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            'Save'
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={handleCancelEdit}
                                                        className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center">
                                                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-sm font-medium">
                                                            {index + 1}
                                                        </span>
                                                        <span className="ml-3 text-gray-800">{category}</span>
                                                    </div>
                                                    <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleEditClick(category)}
                                                            className="p-1 text-blue-600 hover:text-blue-800"
                                                            title="Edit category"
                                                        >
                                                            <FiEdit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClick(category)}
                                                            className="p-1 text-red-600 hover:text-red-800"
                                                            title="Delete category"
                                                        >
                                                            <FiTrash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-red-600 text-sm">{error}</p>
                        </div>
                    )}

                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <DeleteCategoryConfirmation />
        </>
    );
};

// --- INLINE EDIT COMPONENT ---
const InlineEditForm = ({ productData, onSave, onCancel, onSaveSuccess, categories }) => {
   const [formData, setFormData] = useState({
  ...productData,
  price: String(productData.price || 0),
  offerPrice: String(productData.offerPrice || 0),
  imageURLs: productData.imageURLs || [],
});

const [newImages, setNewImages] = useState([]);

    const [isSaving, setIsSaving] = useState(false);
    const [editError, setEditError] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setEditError(null);
        let uploadedImageURLs = [...formData.imageURLs];

if (newImages.length > 0) {
  for (const file of newImages) {
    const imageRef = ref(
      storage,
      `oldee-products/${formData.id}/${Date.now()}-${file.name}`
    );

    await uploadBytes(imageRef, file);
    const downloadURL = await getDownloadURL(imageRef);
    uploadedImageURLs.push(downloadURL);
  }
}


        if (!formData.name || !formData.price) {
            setEditError("Product Name and Price are required.");
            setIsSaving(false);
            return;
        }

        try {
            const productRef = doc(db, "oldee", formData.id);
            
           const updatedData = {
  ...formData,
  price: Number(formData.price),
  offerPrice: Number(formData.offerPrice || 0),
imageURLs: uploadedImageURLs,
  updatedAt: new Date(),
};

            await updateDoc(productRef, updatedData);
            
            onSaveSuccess(`Product "${formData.name}" updated successfully!`); 
            onSave(); 

        } catch (e) {
            console.error("Error updating product:", e);
            setEditError(`Failed to save changes: ${e.message}`);
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
                
                <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b pb-2">
                    <FiEdit className="inline w-6 h-6 mr-2 text-blue-600" />
                    Edit Product: <span className="text-blue-600">{productData.name}</span>
                </h2>

                {editError && (
                    <div className="p-3 mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded">
                        <FiAlertTriangle className="h-5 w-5 inline mr-2" />
                        <span className="text-sm">{editError}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
<div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">

  {/* EXISTING IMAGES */}
  {formData.imageURLs.map((url, index) => (
    <div
      key={`existing-${index}`}
      className="relative group rounded-md overflow-hidden bg-gray-100"
    >
      <img
        src={url}
        alt={`product-${index}`}
        className="w-full h-24 object-cover"
      />

      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition" />

      <button
        type="button"
        onClick={() =>
          setFormData(prev => ({
            ...prev,
            imageURLs: prev.imageURLs.filter((_, i) => i !== index),
          }))
        }
        className="absolute top-2 right-2
                   bg-white/90 text-gray-800
                   rounded-full w-7 h-7
                   flex items-center justify-center
                   opacity-0 group-hover:opacity-100
                   transition shadow-sm hover:bg-red-500 hover:text-white"
      >
        ✕
      </button>

      {index === 0 && (
        <span className="absolute bottom-1 left-1 text-[10px]
                         bg-black/70 text-white px-1.5 py-0.5 rounded">
          MAIN
        </span>
      )}
    </div>
  ))}

  {/* NEW IMAGE PREVIEWS */}
  {newImages.map((file, index) => {
    const previewUrl = URL.createObjectURL(file);

    return (
      <div
        key={`new-${index}`}
        className="relative group rounded-md overflow-hidden bg-gray-100"
      >
        <img
          src={previewUrl}
          alt={`new-${index}`}
          className="w-full h-24 object-cover"
        />

        <div className="absolute inset-0 bg-black/30" />

        <span className="absolute bottom-1 left-1 text-[10px]
                         bg-green-600 text-white px-1.5 py-0.5 rounded">
          NEW
        </span>

        <button
          type="button"
          onClick={() =>
            setNewImages(prev => prev.filter((_, i) => i !== index))
          }
          className="absolute top-2 right-2
                     bg-white/90 text-gray-800
                     rounded-full w-7 h-7
                     flex items-center justify-center
                     transition shadow-sm hover:bg-red-500 hover:text-white"
        >
          ✕
        </button>
      </div>
    );
  })}

  {/* ADD IMAGE TILE */}
  <label className="flex flex-col items-center justify-center
                    h-24 rounded-md
                    border border-dashed border-gray-300
                    text-gray-500 cursor-pointer
                    hover:border-gray-400 hover:bg-gray-50
                    transition">
    <span className="text-xl leading-none">＋</span>
    <span className="text-xs mt-1">Add</span>

    <input
      type="file"
      multiple
      accept="image/*"
      onChange={(e) =>
        setNewImages(prev => [...prev, ...Array.from(e.target.files)])
      }
      className="hidden"
    />
  </label>
</div>


                    <div className="grid grid-cols-5 gap-4">
                        <div className="col-span-1">
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Product Name</label>
                            <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 p-2 block w-full border border-gray-300 rounded-md" />
                        </div>
                        <div className="col-span-1">
                            <label htmlFor="price" className="block text-sm font-medium text-gray-700">Original Price (₹)</label>
                            <input type="number" name="price" id="price" value={formData.price} onChange={handleChange} required className="mt-1 p-2 block w-full border border-gray-300 rounded-md" />
                        </div>
                        
                        <div className="col-span-1">
                            <label htmlFor="offerPrice" className="block text-sm font-medium text-gray-700">Offer Price (₹)</label>
                            <input type="number" name="offerPrice" id="offerPrice" value={formData.offerPrice} onChange={handleChange} className="mt-1 p-2 block w-full border border-gray-300 rounded-md" placeholder="e.g., 16500" />
                        </div>
                        <div className="col-span-1">
                            <label htmlFor="negotiation" className="block text-sm font-medium text-gray-700">Negotiation</label>
                            <select id="negotiation" name="negotiation" value={formData.negotiation} onChange={handleChange} className="mt-1 p-2 block w-full border border-gray-300 rounded-md bg-white">
                                <option value="Fixed">Fixed Price</option>
                                <option value="Negotiable">Negotiable</option>
                            </select>
                        </div>
                        <div className="col-span-1">
                            <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
                            <select 
                                id="category" 
                                name="category" 
                                value={formData.category || ""} 
                                onChange={handleChange} 
                                className="mt-1 p-2 block w-full border border-gray-300 rounded-md bg-white"
                            >
                                <option value="">Select Category</option>
                                {categories.map((category, index) => (
                                    <option key={index} value={category}>
                                        {category}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                            <select id="status" name="status" value={formData.status} onChange={handleChange} className="mt-1 p-2 block w-full border border-gray-300 rounded-md bg-white">
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="Pending">Pending Review</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700">Contact Number</label>
                            <input type="text" name="contactNumber" id="contactNumber" value={formData.contactNumber} onChange={handleChange} className="mt-1 p-2 block w-full border border-gray-300 rounded-md" />
                        </div>
                        <div>
                            <label htmlFor="address" className="block text-sm font-medium text-gray-700">Address</label>
                            <input type="text" name="address" id="address" value={formData.address} onChange={handleChange} className="mt-1 p-2 block w-full border border-gray-300 rounded-md" />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea id="description" name="description" rows="3" value={formData.description} onChange={handleChange} className="mt-1 p-2 block w-full border border-gray-300 rounded-md"></textarea>
                    </div>

                    <div className="pt-4 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-100"
                        >
                            <FiXCircle className="w-5 h-5 mr-2" /> Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className={`flex items-center px-4 py-2 rounded-md text-white ${isSaving ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {isSaving ? (
                                <>
                                    <FiRefreshCw className="w-5 h-5 animate-spin mr-2" /> Saving...
                                </>
                            ) : (
                                <>
                                    <FiSave className="w-5 h-5 mr-2" /> Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- DELETE CONFIRMATION MODAL (Product) ---
const DeleteConfirmationModal = ({ product, onConfirm, onCancel, isDeleting }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-[100]">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm p-6 transform transition-all duration-300 scale-100">
                <div className="flex flex-col items-center space-y-4">
                    <FiTrash2 className="w-12 h-12 text-red-500" />
                    <h3 className="text-xl font-bold text-gray-900">Confirm Deletion</h3>
                    <p className="text-sm text-gray-600 text-center">
                        Are you sure you want to permanently delete **"{product.name}"**? This action cannot be undone.
                    </p>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                    <button
                        onClick={onCancel}
                        disabled={isDeleting}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition duration-150"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white ${isDeleting ? 'bg-red-400' : 'bg-red-600 hover:bg-red-700'} transition duration-150`}
                    >
                        {isDeleting ? (
                            <FiRefreshCw className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                            <FiTrash2 className="w-4 h-4 mr-2" />
                        )}
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- FILTER AND SEARCH COMPONENT ---
const SearchAndFilterBar = ({ 
    searchTerm, 
    onSearchChange, 
    selectedStatus, 
    onStatusChange, 
    selectedCategory, 
    onCategoryChange, 
    categories,
    onClearFilters 
}) => {
    return (
        <div className="bg-white shadow-md rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search Input */}
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiSearch className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={onSearchChange}
                        placeholder="Search products..."
                        className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                {/* Status Filter */}
                <div>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FiFilter className="h-5 w-5 text-gray-400" />
                        </div>
                        <select
                            value={selectedStatus}
                            onChange={onStatusChange}
                            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                        >
                            <option value="all">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="Pending">Pending</option>
                        </select>
                    </div>
                </div>

                {/* Category Filter */}
                <div>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FiTag className="h-5 w-5 text-gray-400" />
                        </div>
                        <select
                            value={selectedCategory}
                            onChange={onCategoryChange}
                            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                        >
                            <option value="all">All Categories</option>
                            {categories.map((category, index) => (
                                <option key={index} value={category}>
                                    {category}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Clear Filters Button */}
                <div>
                    <button
                        onClick={onClearFilters}
                        className="flex items-center justify-center w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition duration-150"
                    >
                        <FiX className="w-4 h-4 mr-2" />
                        Clear Filters
                    </button>
                </div>
            </div>
            
            {/* Active Filters Display */}
            {(searchTerm || selectedStatus !== 'all' || selectedCategory !== 'all') && (
                <div className="mt-3 flex items-center space-x-2 text-sm">
                    <span className="text-gray-600">Active filters:</span>
                    {searchTerm && (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            Search: "{searchTerm}"
                        </span>
                    )}
                    {selectedStatus !== 'all' && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            Status: {selectedStatus}
                        </span>
                    )}
                    {selectedCategory !== 'all' && (
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                            Category: {selectedCategory}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

// --- MAIN COMPONENT: OldeeProductsPage ---
const OldeeProductsPage = () => {
    const [products, setProducts] = useState([]); 
    const [categories, setCategories] = useState([]); 
    const [categoryDocs, setCategoryDocs] = useState([]); // Store full category documents
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processingId, setProcessingId] = useState(null);
    const [notification, setNotification] = useState(null); 
    const [productToDelete, setProductToDelete] = useState(null); 
    const [editingProduct, setEditingProduct] = useState(null); 
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [viewingProduct, setViewingProduct] = useState(null); // State for view modal
    
    // Search and Filter States
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("all");
    const [selectedCategory, setSelectedCategory] = useState("all");

    const navigate = useNavigate();

    // Fetch ALL products
    useEffect(() => {
        try {
            const q = query(
                collection(db, "oldee"),
                orderBy("createdAt", "desc") 
            );

            const unsubscribe = onSnapshot(
                q,
                (snapshot) => {
                    const list = snapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    }));

                    setProducts(list);
                    setLoading(false);
                },
                (err) => {
                    console.error("Error loading all Oldee products:", err);
                    setError("Failed to load all products.");
                    setLoading(false);
                }
            );

            return () => unsubscribe();
        } catch (err) {
            console.error("Listener init error:", err);
            setError("Database connection error.");
            setLoading(false);
        }
    }, []);

    // Fetch categories from Firestore
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const categoriesRef = collection(db, "oldee_categories");
                const querySnapshot = await getDocs(categoriesRef);
                
                const categoriesList = [];
                const docsList = [];
                
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    categoriesList.push(data.name);
                    docsList.push({ id: doc.id, ...data });
                });
                
                // Sort categories alphabetically
                const sortedCategories = categoriesList.sort();
                const sortedDocs = docsList.sort((a, b) => 
                    a.name.localeCompare(b.name)
                );
                
                setCategories(sortedCategories);
                setCategoryDocs(sortedDocs);
                
                // If no categories exist, add default ones
                if (sortedCategories.length === 0) {
                    await initializeDefaultCategories();
                }
            } catch (err) {
                console.error("Error fetching categories:", err);
                // Set default categories if fetch fails
                const defaultCats = ["Electronics", "Furniture", "Vehicles", "Books", "Fashion", "Appliances", "Others"];
                setCategories(defaultCats);
            }
        };

        fetchCategories();
    }, []);

    // Initialize default categories
    const initializeDefaultCategories = async () => {
        const defaultCategories = [
            "Electronics", "Furniture", "Vehicles", "Books", 
            "Fashion", "Appliances", "Sports", "Toys & Games", 
            "Home & Garden", "Music & Instruments", "Others"
        ];

        try {
            const batch = writeBatch(db);
            
            for (const categoryName of defaultCategories) {
                const newDocRef = doc(collection(db, "oldee_categories"));
                batch.set(newDocRef, {
                    name: categoryName,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    isDefault: true
                });
            }
            
            await batch.commit();
            
            const newDocs = defaultCategories.map(name => ({ 
                id: `temp-${name}`, 
                name, 
                createdAt: new Date(), 
                updatedAt: new Date(),
                isDefault: true 
            }));
            
            setCategories(defaultCategories);
            setCategoryDocs(newDocs);
            
        } catch (err) {
            console.error("Error initializing categories:", err);
        }
    };

    // Add new category to Firestore
    const handleAddCategory = async (categoryName) => {
        try {
            // Add to Firestore
            const docRef = await addDoc(collection(db, "oldee_categories"), {
                name: categoryName,
                createdAt: new Date(),
                updatedAt: new Date(),
                isDefault: false
            });

            // Update local state
            const newCategory = { id: docRef.id, name: categoryName, createdAt: new Date(), updatedAt: new Date() };
            const updatedCategories = [...categories, categoryName].sort();
            const updatedDocs = [...categoryDocs, newCategory].sort((a, b) => 
                a.name.localeCompare(b.name)
            );
            
            setCategories(updatedCategories);
            setCategoryDocs(updatedDocs);
            
            // Show success notification
            setNotification(`Category "${categoryName}" added successfully!`);
            
            return true;
        } catch (err) {
            console.error("Error adding category:", err);
            throw err;
        }
    };

    // Edit existing category
    const handleEditCategory = async (oldName, newName) => {
        try {
            // Find the category document
            const categoryDoc = categoryDocs.find(doc => doc.name === oldName);
            
            if (!categoryDoc) {
                throw new Error("Category not found");
            }

            // Update in Firestore
            const categoryRef = doc(db, "oldee_categories", categoryDoc.id);
            await updateDoc(categoryRef, {
                name: newName,
                updatedAt: new Date()
            });

            // Update local state
            const updatedCategories = categories.map(cat => 
                cat === oldName ? newName : cat
            ).sort();
            
            const updatedDocs = categoryDocs.map(doc => 
                doc.name === oldName ? { ...doc, name: newName, updatedAt: new Date() } : doc
            ).sort((a, b) => a.name.localeCompare(b.name));
            
            setCategories(updatedCategories);
            setCategoryDocs(updatedDocs);

            // Update all products that use this category
            await updateProductsCategory(oldName, newName);
            
            setNotification(`Category updated from "${oldName}" to "${newName}" successfully!`);
            
            return true;
        } catch (err) {
            console.error("Error editing category:", err);
            throw err;
        }
    };

    // Update products when category name changes
    const updateProductsCategory = async (oldCategory, newCategory) => {
        try {
            const productsToUpdate = products.filter(product => product.category === oldCategory);
            
            if (productsToUpdate.length > 0) {
                const batch = writeBatch(db);
                
                productsToUpdate.forEach(product => {
                    const productRef = doc(db, "oldee", product.id);
                    batch.update(productRef, {
                        category: newCategory,
                        updatedAt: new Date()
                    });
                });
                
                await batch.commit();
                setNotification(`${productsToUpdate.length} products updated with new category name.`);
            }
        } catch (err) {
            console.error("Error updating products category:", err);
            // Don't throw error here, just log it
        }
    };

    // Delete category
    const handleDeleteCategory = async (categoryName) => {
        try {
            // Find the category document
            const categoryDoc = categoryDocs.find(doc => doc.name === categoryName);
            
            if (!categoryDoc) {
                throw new Error("Category not found");
            }

            // Don't allow deletion of default categories if you want
            if (categoryDoc.isDefault) {
                setNotification("Default categories cannot be deleted.");
                return;
            }

            // Delete from Firestore
            const categoryRef = doc(db, "oldee_categories", categoryDoc.id);
            await deleteDoc(categoryRef);

            // Update local state
            const updatedCategories = categories.filter(cat => cat !== categoryName);
            const updatedDocs = categoryDocs.filter(doc => doc.name !== categoryName);
            
            setCategories(updatedCategories);
            setCategoryDocs(updatedDocs);
            
            setNotification(`Category "${categoryName}" deleted successfully!`);
            
            return true;
        } catch (err) {
            console.error("Error deleting category:", err);
            throw err;
        }
    };

    // Update Status
    const handleUpdateStatus = async (productId, currentStatus) => {
        setProcessingId(productId);
        const newStatus = currentStatus === "active" ? "inactive" : "active"; 
        try {
            const ref = doc(db, "oldee", productId);
            await updateDoc(ref, {
                status: newStatus,
                updatedAt: new Date(),
            });
            // If viewing the product, update the view modal
            if (viewingProduct && viewingProduct.id === productId) {
                setViewingProduct(prev => ({
                    ...prev,
                    status: newStatus
                }));
            }
        } catch (e) {
            console.error(`Error updating product status to ${newStatus}:`, e);
        } finally {
            setProcessingId(null);
        }
    };

    // Open Edit Form
    const handleEditProduct = async (productId) => {
        setProcessingId(productId);
        try {
            const docRef = doc(db, "oldee", productId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setEditingProduct({ id: docSnap.id, ...docSnap.data() }); 
            } else {
                setNotification("Product to edit not found.");
            }
        } catch (err) {
            console.error("Error fetching product for edit:", err);
            setNotification("Failed to load product for editing.");
        } finally {
            setProcessingId(null);
        }
    };
    
    // Open View Modal
    const handleViewProduct = (product) => {
        setViewingProduct(product);
    };

    // Open Delete Confirmation Modal
    const handleDeleteClick = (product) => {
        setProductToDelete(product);
    };

    // Final Delete Action (stores in deleted_oldee)
    const finalizeDeleteProduct = async () => {
        if (!productToDelete) return;

        const productId = productToDelete.id;
        setProcessingId(productId); 

        try {
            // Copy to deleted_oldee collection
            const deletedProductRef = doc(db, "deleted_oldee", productId);
            
            const deletedProductData = {
                ...productToDelete,
                deletedAt: new Date(),
                deletedBy: "admin",
                originalCollection: "oldee",
                deletionReason: "Admin deletion"
            };

            await setDoc(deletedProductRef, deletedProductData);
            
            // Delete from original collection
            const originalRef = doc(db, "oldee", productId);
            await deleteDoc(originalRef);
            
            setNotification(`Product "${productToDelete.name}" moved to deleted collection.`); 
            setProductToDelete(null); 
            // Close view modal if open
            if (viewingProduct && viewingProduct.id === productId) {
                setViewingProduct(null);
            }
        } catch (e) {
            console.error("Error moving/deleting product:", e);
            setNotification(`Failed to delete product: ${e.message}`);
        } finally {
            setProcessingId(null);
        }
    };

    // Function to set success notification message
    const handleSuccessNotification = (message) => {
        setNotification(message);
    };

    // Handle search input change
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    // Handle status filter change
    const handleStatusChange = (e) => {
        setSelectedStatus(e.target.value);
    };

    // Handle category filter change
    const handleCategoryChange = (e) => {
        setSelectedCategory(e.target.value);
    };

    // Clear all filters
    const handleClearFilters = () => {
        setSearchTerm("");
        setSelectedStatus("all");
        setSelectedCategory("all");
    };

    // Filter products based on search and filters
    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            // Search filter
            const matchesSearch = searchTerm === "" || 
                product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.seller?.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.address?.toLowerCase().includes(searchTerm.toLowerCase());

            // Status filter
            const matchesStatus = selectedStatus === "all" || product.status === selectedStatus;

            // Category filter
            const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;

            return matchesSearch && matchesStatus && matchesCategory;
        });
    }, [products, searchTerm, selectedStatus, selectedCategory]);

    // --- UI RENDERING ---

    if (loading) {
        return (
            <div className="flex justify-center items-center p-16 min-h-screen bg-gray-50">
                <FiRefreshCw className="w-8 h-8 text-indigo-600 animate-spin mr-3" />
                <span className="text-xl text-gray-700">Loading all products...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-10 bg-red-50 border-l-4 border-red-500 text-red-700 max-w-lg mx-auto mt-10 rounded-lg">
                <FiAlertTriangle className="h-6 w-6 inline mr-2" />
                <h3 className="font-bold text-xl mb-2">Error</h3>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">

                {/* HEADER */}
                <div className="flex items-center justify-between mb-8 border-b pb-4">
                    <div className="flex items-center space-x-4">
                        <FiUser className="w-10 h-10 text-purple-600" />
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">All Oldee Products</h1>
                            <p className="text-gray-600 mt-1">Manage and search all products in your inventory</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowCategoryModal(true)}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-150"
                    >
                        <FiTag className="w-5 h-5 mr-2" />
                        Manage Categories ({categories.length})
                    </button>
                </div>

                {/* SEARCH AND FILTER BAR */}
                <SearchAndFilterBar 
                    searchTerm={searchTerm}
                    onSearchChange={handleSearchChange}
                    selectedStatus={selectedStatus}
                    onStatusChange={handleStatusChange}
                    selectedCategory={selectedCategory}
                    onCategoryChange={handleCategoryChange}
                    categories={categories}
                    onClearFilters={handleClearFilters}
                />

                {/* COUNTER & CATEGORY STATS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow p-6">
                        <div className="flex items-center">
                            <FiClock className="w-6 h-6 text-indigo-600 mr-3" />
                            <div>
                                <span className="text-xl font-semibold text-gray-700">
                                    {filteredProducts.length} Products
                                </span>
                                <p className="text-sm text-gray-500">Showing {filteredProducts.length} of {products.length} total</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow p-6">
                        <div className="flex items-center">
                            <FiPackage className="w-6 h-6 text-blue-600 mr-3" />
                            <div>
                                <span className="text-xl font-semibold text-gray-700">
                                    {categories.length} Categories
                                </span>
                                <p className="text-sm text-gray-500">Click "Manage Categories" to edit</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow p-6">
                        <div className="flex items-center">
                            <FiFilter className="w-6 h-6 text-green-600 mr-3" />
                            <div>
                                <span className="text-xl font-semibold text-gray-700">
                                    Filtered Results
                                </span>
                                <p className="text-sm text-gray-500">
                                    {searchTerm ? `Search: "${searchTerm}"` : 'No search active'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* TABLE */}
                <div className="bg-white shadow-xl rounded-xl border border-gray-200">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Product & Price</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Details & Contact</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Dates</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Action</th> 
                                </tr>
                            </thead>

                            <tbody className="bg-white divide-y divide-gray-100">
                                {filteredProducts.length > 0 ? (
                                    filteredProducts.map((product) => (
                                        <tr key={product.id} className="hover:bg-gray-50">
                                            {/* PRODUCT CELL */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-3">
                                                    <img
                                                        src={product.imageURLs?.[0] || "https://via.placeholder.com/80"}
                                                        alt={product.name}
                                                        className="w-20 h-22 rounded-lg border object-fit"
                                                    />
                                                    <div>
                                                        <div className="font-semibold text-gray-900">{product.name}</div>
                                                        <div className="text-sm text-gray-500">
                                                            <span className="font-bold">₹{product.price || 'N/A'}</span> 
                                                            <span className="ml-2 text-xs">({product.negotiation || 'Fixed'})</span>
                                                        </div>
                                                        {/* Display category */}
                                                        {product.category && (
                                                            <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full inline-block mt-1">
                                                                {product.category}
                                                            </div>
                                                        )}
                                                        {/* Display offer price */}
                                                        {product.offerPrice && product.offerPrice !== product.price && (
                                                            <div className="text-xs text-red-500 font-medium">Offer: ₹{product.offerPrice}</div>
                                                        )}
                                                        <div className="text-xs text-gray-400 mt-1 truncate max-w-xs">{product.description || 'No description.'}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* DETAILS CELL */}
                                            <td className="px-6 py-4 text-sm text-gray-700">
                                                <div className="mb-2">
                                                    <span className={`font-bold uppercase text-xs px-2 py-1 rounded-full ${
                                                            product.status === 'active' ? 'bg-green-100 text-green-700' :
                                                            product.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-red-100 text-red-700'
                                                        }`}>
                                                        <FiTag className="inline w-3 h-3 mr-1" />{product.status || 'N/A'}
                                                    </span>
                                                    {product.isSold ? (
                                                        <span className="ml-2 font-bold uppercase text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">SOLD</span>
                                                    ) : (
                                                        <span className="ml-2 font-medium text-xs text-green-500">Available</span>
                                                    )}
                                                </div>
                                                <p className="font-medium text-gray-900">Seller: {product.seller?.displayName || product.sellerId || 'N/A'}</p>
                                                <p className="text-xs text-gray-500">Email: {product.seller?.email || 'N/A'}</p>
                                                <p className="text-xs text-gray-500">Address: {product.address || 'N/A'}</p>
                                                <p className="mt-1">
                                                    <FiPhone className="inline w-3 h-3 mr-1 text-gray-500" />
                                                    <span className="font-medium">Contact:</span> {product.contactNumber || 'N/A'}
                                                </p>
                                            </td>

                                            {/* DATES CELL */}
                                            <td className="px-6 py-4 text-center text-sm text-gray-500">
                                                <p><span className="font-medium text-gray-700">Created:</span> {formatDate(product.createdAt)}</p>
                                                <p className="mt-1 text-xs"><span className="font-medium text-gray-700">Published:</span> {formatDate(product.publishedAt)}</p>
                                            </td>

                                            {/* ACTIONS CELL */}
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col space-y-2"> 
                                                    
                                                    {/* View Button */}
                                                    <button
                                                        onClick={() => handleViewProduct(product)}
                                                        disabled={processingId === product.id}
                                                        className="flex items-center justify-center bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition duration-150 ease-in-out"
                                                    >
                                                        <FiEye className="w-4 h-4 mr-1" />
                                                        View Details
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="py-16 text-center text-gray-500">
                                            <FiSearch className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                            <p className="text-lg font-medium">No products found matching your criteria.</p>
                                            <p className="text-sm">
                                                Try adjusting your search or filters. 
                                                {products.length > 0 && ` You have ${products.length} total products.`}
                                            </p>
                                            {(searchTerm || selectedStatus !== 'all' || selectedCategory !== 'all') && (
                                                <button
                                                    onClick={handleClearFilters}
                                                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-150"
                                                >
                                                    Clear All Filters
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
            
            {/* CONDITIONAL RENDER OF MODALS */}
            {/* View Product Modal */}
            {viewingProduct && (
                <ProductViewModal
                    product={viewingProduct}
                    onClose={() => setViewingProduct(null)}
                    onEdit={handleEditProduct}
                    onDelete={handleDeleteClick}
                    onToggleStatus={handleUpdateStatus}
                    processingId={processingId}
                />
            )}

            {editingProduct && (
                <InlineEditForm 
                    productData={editingProduct}
                    onSave={() => setEditingProduct(null)} 
                    onCancel={() => setEditingProduct(null)}
                    onSaveSuccess={handleSuccessNotification}
                    categories={categories}
                />
            )}

            {productToDelete && (
                <DeleteConfirmationModal
                    product={productToDelete}
                    onConfirm={finalizeDeleteProduct}
                    onCancel={() => setProductToDelete(null)}
                    isDeleting={processingId === productToDelete.id} 
                />
            )}

            {showCategoryModal && (
                <CategoryManagementModal
                    categories={categories}
                    onAddCategory={handleAddCategory}
                    onEditCategory={handleEditCategory}
                    onDeleteCategory={handleDeleteCategory}
                    onClose={() => setShowCategoryModal(false)}
                />
            )}

            {/* SUCCESS TOAST */}
            <SuccessNotificationToast 
                message={notification} 
                onClose={() => setNotification(null)} 
            />

        </div>
    );
};

export default OldeeProductsPage;