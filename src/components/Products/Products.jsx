import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  updateDoc,
  addDoc,
  serverTimestamp
} from "firebase/firestore";



// Icon imports
import {
    ArrowDownTrayIcon,
    PlusIcon,
    MagnifyingGlassIcon,
    CubeIcon,
    EyeIcon,
    PencilSquareIcon,
    PhotoIcon,
    TagIcon,
    BuildingStorefrontIcon,
    CurrencyRupeeIcon,
    ArchiveBoxIcon,
    ArrowLeftIcon,
    ClockIcon,
    TrashIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon // 🚨 ADDED: Icon for the success modal
} from '@heroicons/react/20/solid';

import { db } from "../../firebase";

// ==========================================================
// UTILITY FUNCTIONS (Unchanged)
// ==========================================================

const getProductImage = (product) => {
  if (product?.mainImageUrl) return product.mainImageUrl;

  if (Array.isArray(product?.imageUrls)) {
    const main = product.imageUrls.find(img => img.isMain);
    if (main?.url) return main.url;
    if (product.imageUrls[0]?.url) return product.imageUrls[0].url;
  }

  if (Array.isArray(product?.sourceImages?.gallery)) {
    const img = product.sourceImages.gallery[0];
    if (typeof img === "string") return img;
    if (img?.url) return img.url;
  }

  return "/no-image.png";
};
// Helper function to aggregate variant data for the list view
const getVariantSummary = (variants) => {
    if (!variants || variants.length === 0) {
        return {
            displayPrice: null,
            totalStock: 0,
            hasOffer: false,
            validPrices: [],
        };
    }

    let minPrice = Infinity;
    let totalStock = 0;
    let hasOffer = false;
    let validPrices = [];

    variants.forEach(variant => {
        const effectivePrice = (variant.offerPrice && Number(variant.offerPrice) > 0)
            ? Number(variant.offerPrice)
            : Number(variant.price);

        if (effectivePrice > 0) {
            if (effectivePrice < minPrice) {
                minPrice = effectivePrice;
            }
            validPrices.push(effectivePrice);
        }

        if (variant.offerPrice && Number(variant.offerPrice) > 0) {
            hasOffer = true;
        }

        totalStock += (Number(variant.stock) || 0);
    });

    return {
        displayPrice: minPrice === Infinity ? null : minPrice,
        totalStock,
        hasOffer,
        validPrices
    };
};

// Helper function to extract and format unique color and size attributes from variants
const getUniqueVariantAttributes = (variants) => {
    const colors = new Set();
    const sizes = new Set();

    if (variants && variants.length > 0) {
        variants.forEach(variant => {
            if (variant.color) colors.add(variant.color);
            if (variant.size) sizes.add(variant.size);
        });
    }

    return {
        colorVariants: Array.from(colors),
        sizeVariants: Array.from(sizes)
    };
};

// Helper to fetch brand name
const fetchBrandName = async (brandId) => {
    if (!brandId) return 'N/A';
    
    try {
        const brandRef = doc(db, "brands", brandId);
        const brandDoc = await getDoc(brandRef);
        if (brandDoc.exists()) {
            return brandDoc.data().name || brandId;
        }
    } catch (error) {
        console.error("Error fetching brand name:", error);
    }
    return brandId;
};

// Helper function to fetch category/sub-category names
const fetchCategoryNames = async (categoryId, subCategoryId) => {
    let categoryName = categoryId || 'N/A';
    let subCategoryName = subCategoryId || 'N/A';
    
    try {
        // Fetch category name
        if (categoryId) {
            const categoryRef = doc(db, "categories", categoryId);
            const categoryDoc = await getDoc(categoryRef);
            if (categoryDoc.exists()) {
                categoryName = categoryDoc.data().name || categoryId;
            }
        }
        
        // Fetch sub-category name
        if (subCategoryId) {
            const subCategoryRef = doc(db, "subcategories", subCategoryId);
            const subCategoryDoc = await getDoc(subCategoryRef);
            if (subCategoryDoc.exists()) {
                subCategoryName = subCategoryDoc.data().name || subCategoryId;
            }
        }
    } catch (error) {
        console.error("Error fetching category names:", error);
    }
    
    return { categoryName, subCategoryName };
};

// ==========================================================
// 4. DELETE CONFIRMATION MODAL COMPONENT (Unchanged)
// ==========================================================
const DeleteConfirmationModal = ({ productName, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
        <div className="bg-white rounded-lg shadow-xl p-6 m-4 max-w-sm w-full">
            <div className="text-center">
                <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">Confirm Deletion</h3>
                <div className="mt-2">
                    <p className="text-sm text-gray-500">
                        Are you sure you want to delete the product: <span className="font-semibold text-gray-700">"{productName}"</span>?
                    </p>
                    <p className="text-xs text-red-500 mt-1 font-medium">
                        This action cannot be undone.
                    </p>
                </div>
            </div>
            <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse space-y-3 sm:space-y-0 sm:space-x-3 sm:space-x-reverse">
                <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-lg border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 transition-colors sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={onConfirm}
                >
                    Delete Permanently
                </button>
                <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors sm:mt-0 sm:w-auto sm:text-sm"
                    onClick={onCancel}
                >
                    Cancel
                </button>
            </div>
        </div>
    </div>
);


// ==========================================================
// 🚨 NEW: DELETE SUCCESS MODAL COMPONENT
// ==========================================================
const DeleteSuccessModal = ({ productName, onConfirm }) => (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
        <div className="bg-white rounded-lg shadow-xl p-6 m-4 max-w-sm w-full">
            <div className="text-center">
                <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">Deletion Successful</h3>
                <div className="mt-2">
                    <p className="text-sm text-gray-500">
                        The product <span className="font-semibold text-gray-700">"{productName}"</span> has been **successfully removed**.
                    </p>
                </div>
            </div>
            <div className="mt-5 sm:mt-6">
                <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-lg border border-transparent bg-green-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-green-700 transition-colors sm:text-sm"
                    onClick={onConfirm}
                >
                    Acknowledge
                </button>
            </div>
        </div>
    </div>
);


// ==========================================================
// 1. MAIN PRODUCTS COMPONENT
// ==========================================================

const Products = () => {
    const [selectedProductId, setSelectedProductId] = useState(null);
    const [productToDelete, setProductToDelete] = useState(null);
    const [products, setProducts] = useState([]);
    const [productsWithNames, setProductsWithNames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    
const handleToggleTrending = async (product) => {
  try {
    await updateDoc(doc(db, "products", product.id), {
  trending: !product.trending
});

  } catch (error) {
    console.error("Failed to update trending status", error);
    alert("Failed to update trending status");
  }
};


    // 🚨 NEW STATE: To control the success message modal
    const [showSuccessModal, setShowSuccessModal] = useState(false); 

    const navigate = useNavigate();

    // --- Data Fetching (Real-time Listener) ---
    useEffect(() => {
        try {
            const productsQuery = query(
                collection(db, "products"),
                orderBy("createdAt", "desc")
            );

            const unsubscribe = onSnapshot(productsQuery, async (snapshot) => {
                const productsList = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                
                // Fetch names for all products
                const productsWithFetchedNames = await Promise.all(
                    productsList.map(async (product) => {
                        let brandName = 'N/A';
                        let categoryName = 'N/A';
                        let subCategoryName = 'N/A';
                        
                        // Fetch brand name
                        if (product.brandId) {
                            brandName = await fetchBrandName(product.brandId);
                        } else if (product.brand?.name) {
                            brandName = product.brand.name;
                        } else if (product.brand && typeof product.brand === 'string') {
                            brandName = product.brand;
                        }
                        
                        // Fetch category and sub-category names
                        if (product.categoryId || product.subCategoryId) {
                            const { categoryName: catName, subCategoryName: subCatName } = 
                                await fetchCategoryNames(product.categoryId, product.subCategoryId);
                            categoryName = catName;
                            subCategoryName = subCatName;
                        } else if (product.category?.name || product.subCategory?.name) {
                            categoryName = product.category?.name || 'N/A';
                            subCategoryName = product.subCategory?.name || 'N/A';
                        } else if (product.category && typeof product.category === 'string') {
                            categoryName = product.category;
                        }
                        
                        return {
                            ...product,
                            brandDisplayName: brandName,
                            categoryDisplayName: categoryName,
                            subCategoryDisplayName: subCategoryName
                        };
                    })
                );
                
                setProducts(productsList);
                setProductsWithNames(productsWithFetchedNames);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching products:", err);
                setError("Failed to load products. Check console for details.");
                setLoading(false);
            });

            return () => unsubscribe();

        } catch (err) {
            console.error("Error setting up product listener:", err);
            setError("Failed to initialize database connection.");
            setLoading(false);
        }
    }, []);

    // --- Filtering & Handlers ---
   const filteredProducts = productsWithNames.filter(product => {
  const name = product.name || ""; // fallback for unnamed products
  return name.toLowerCase().includes(searchTerm.toLowerCase());
});


   const trendingProducts = productsWithNames.filter(
  (product) => product.trending === true
);


    const formatVariants = (variants) => {
        if (!variants || variants.length === 0) {
            return <span className="text-gray-400 italic text-sm">N/A</span>;
        }
        const displayVariants = variants.slice(0, 3).join(", ");
        return variants.length > 3 ? `${displayVariants}, ...` : displayVariants;
    };

    const handleAddProduct = () => navigate("/products/add");
    const handleViewProduct = (productId) => setSelectedProductId(productId);
    const handleEditProduct = (productId) => navigate(`/products/edit/${productId}`);
    const handleDownloadExcel = () => alert("Functionality to download Excel is pending...");
    const handleCloseView = () => setSelectedProductId(null);

    const handleDeleteProduct = (product) => {
        setProductToDelete(product);
    };

    const handleSuccessModalClose = () => {
        setShowSuccessModal(false);
    };

   const confirmDelete = async () => {
  if (!productToDelete) return;

  const product = productToDelete;

  try {
    // 1️⃣ Save product to deletedProducts collection
    await addDoc(collection(db, "deletedProducts"), {
      ...product,
      originalProductId: product.id,
      deletedAt: serverTimestamp(),
      deletedBy: "admin", // optional
    });

    // 2️⃣ Remove product from products collection
    await deleteDoc(doc(db, "products", product.id));

    // 3️⃣ Show success modal
    setShowSuccessModal(true);

    console.log(`Product '${product.name}' moved to deletedProducts`);
  } catch (error) {
    console.error("Delete failed:", error);
    alert("Failed to delete product");
  } finally {
    setProductToDelete(null);
    setSelectedProductId(null);
  }
};




    // --- Loading/Error States ---
    if (loading) {
        return (
            <div className="flex justify-center items-center p-16 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <div className="text-lg font-medium text-indigo-600">Loading Products...</div>
                    <p className="text-gray-500 text-sm mt-2">Fetching your inventory data</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
                <div className="text-center p-10 bg-red-50 border-l-4 border-red-500 text-red-700 max-w-lg shadow-lg rounded-xl">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CubeIcon className="h-8 w-8 text-red-500" />
                    </div>
                    <h3 className="font-bold text-xl mb-2">Operation Failed</h3>
                    <p>{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // --- CONDITIONAL RENDER: Show Detail View if a product is selected ---
    if (selectedProductId) {
        // Find the product data for the view
        const productData = productsWithNames.find(p => p.id === selectedProductId);
        
        return (
            <IntegratedProductView
                productId={selectedProductId}
                productData={productData} // Passing data can avoid re-fetching
                onClose={handleCloseView}
                navigate={navigate}
                onDelete={handleDeleteProduct}
            />
        );
    }

    // --- Main List Render ---
    return (
        <div className="p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
            <div className="max-w-7xl mx-auto">

                {/* Header Section */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full mb-4">
                        <CubeIcon className="h-10 w-10 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                        Product Inventory
                    </h1>
                    <p className="text-gray-600 text-lg">Manage and organize your product catalog</p>
                </div>

                {/* Stats and Actions Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-8">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-6 lg:space-y-0">
                        {/* Stats */}
                        <div className="flex items-center space-x-6">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-indigo-600">{products.length}</div>
                                <div className="text-sm text-gray-500">Total Products</div>
                            </div>
                            <div className="h-12 w-px bg-gray-200"></div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-green-600">
                                    {products.filter(p => getVariantSummary(p.variants).totalStock > 10).length}
                                </div>
                                <div className="text-sm text-gray-500">Total High Stock</div>
                            </div>
                            <div className="h-12 w-px bg-gray-200"></div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-yellow-600">
                                    {products.filter(p => {
                                        const stock = getVariantSummary(p.variants).totalStock;
                                        return stock > 0 && stock <= 10;
                                    }).length}
                                </div>
                                <div className="text-sm text-gray-500">Total Low Stock</div>
                            </div>
                        </div>

                        {/* Search and Actions */}
                        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                            {/* Search Input */}
                            <div className="relative">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search products..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-3 border border-gray-300 rounded-xl w-full sm:w-80 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex space-x-3">
                                {/* <button
                                    onClick={handleDownloadExcel}
                                    className="flex items-center space-x-2 bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-600 transition-all duration-200 transform hover:scale-[1.02] shadow-md"
                                >
                                    <ArrowDownTrayIcon className="h-5 w-5" />
                                    <span>Export</span>
                                </button> */}

                                <button
                                    onClick={handleAddProduct}
                                    className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-indigo-500/50 hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-[1.02]"
                                >
                                    <PlusIcon className="h-5 w-5" />
                                    <span>Add Product</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Products Grid/Table */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    {/* Table Header */}
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                                <BuildingStorefrontIcon className="h-5 w-5 mr-2 text-indigo-600" />
                                Product Catalog
                            </h3>
                            <span className="text-sm text-gray-500">
                                Showing {filteredProducts.length} of {products.length} products
                            </span>
                        </div>
                    </div>
   


                    {/* Products List */}
                    <div className="overflow-x-auto">
                    
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">PRODUCT</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">DETAILS</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">PRICING (MIN)</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">STOCK (TOTAL)</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">VARIANTS</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">ACTIONS</th>
                                </tr>
                            </thead>

                            <tbody className="bg-white divide-y divide-gray-100">
                                {filteredProducts.map((product) => {
                                    const { displayPrice, totalStock, hasOffer } = getVariantSummary(product.variants);
                                    const { colorVariants, sizeVariants } = getUniqueVariantAttributes(product.variants);

                                    return (
                                    <tr key={product.id} className="hover:bg-indigo-50/30 transition-colors duration-150">

                                        {/* PRODUCT COLUMN */}
                                        <td className="px-2 py-4">
                                            <div className="flex items-center space-x-4">
                                                <div className="flex-shrink-0">
                                                    <img
                                                        src={getProductImage(product)}
                                                        alt={product.name}
                                                        className="w-16 h-16 rounded-xl object-cover border border-gray-200 shadow-sm"
                                                    />
                                                </div>
                                                
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
  <span
    className="font-semibold text-gray-900 text-lg hover:text-indigo-600 cursor-pointer"
    onClick={() => handleViewProduct(product.id)}
  >
    {product.name || 'Untitled Product'}
  </span>

  {product.trending && (
  <span className="px-2 py-0.5 text-xs font-bold text-orange-700 bg-orange-100 rounded-full">
 Trending
  </span>
)}

</div>

                                                    <div className="text-sm text-gray-500 truncate max-w-xs">
                                                        {product.description || "No description available"}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>


                                        {/* DETAILS COLUMN - UPDATED TO USE DISPLAY NAMES */}
                                        <td className="px-6 py-4">
                                            <div className="space-y-2">
                                                <div className="flex items-center text-sm text-gray-600">
                                                    <TagIcon className="h-4 w-4 mr-2 text-blue-500" />
                                                    <span className="font-medium">{product.sku || '-'}</span>
                                                </div>
                                                <div className="flex items-center text-sm text-gray-600">
                                                    <BuildingStorefrontIcon className="h-4 w-4 mr-2 text-green-500" />
                                                    {/* UPDATED: Use brandDisplayName instead of brand */}
                                                    <span>{product.brandDisplayName || product.brand || '-'}</span>
                                                </div>
                                                <div className="flex items-center text-sm text-gray-600">
                                                    <ArchiveBoxIcon className="h-4 w-4 mr-2 text-purple-500" />
                                                    {/* UPDATED: Use categoryDisplayName instead of category */}
                                                    <span>{product.categoryDisplayName || product.category || '-'}</span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* PRICING COLUMN */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-lg font-bold text-green-700">
                                                <CurrencyRupeeIcon className="h-5 w-5 mr-1" />
                                                {displayPrice === null ? 'N/A' : displayPrice.toFixed(2)}
                                                {hasOffer && <TagIcon className="h-4 w-4 ml-2 text-red-500" title="Offer Price Available" />}
                                            </div>
                                        </td>

                                        {/* STOCK COLUMN */}
                                        <td className="px-6 py-4 text-center">
                                            {totalStock > 10 ? (
                                                <span className="inline-flex items-center px-3 py-1.5 text-sm font-semibold bg-green-100 text-green-800 rounded-full border border-green-200">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                                    {totalStock} in stock
                                                </span>
                                            ) : totalStock > 0 ? (
                                                <span className="inline-flex items-center px-3 py-1.5 text-sm font-semibold bg-yellow-100 text-yellow-800 rounded-full border border-yellow-200">
                                                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                                                    Low Stock ({totalStock})
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-3 py-1.5 text-sm font-semibold bg-red-100 text-red-800 rounded-full border border-red-200">
                                                    <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                                                    Out of stock
                                                </span>
                                            )}
                                        </td>

                                        {/* VARIANTS COLUMN */}
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="text-sm text-gray-700">
                                                    <span className="font-medium">Colors:</span> {formatVariants(colorVariants)}
                                                </div>
                                                <div className="text-sm text-gray-700">
                                                    <span className="font-medium">Sizes:</span> {formatVariants(sizeVariants)}
                                                </div>
                                            </div>
                                        </td>

                                        {/* ACTIONS COLUMN */}
                                       <td className="px-6 py-4">
<div className="grid grid-cols-2 gap-3 w-[160px] mx-auto">


    {/* Row 1: View */}
    <button
      onClick={() => handleViewProduct(product.id)}
      className="flex items-center justify-center space-x-1 bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-2 rounded-lg transition font-medium text-sm"
      title="View Product"
    >
      {/* <EyeIcon className="h-4 w-4" /> */}
      <span>View</span>
    </button>

    {/* Row 1: Edit */}
    <button
      onClick={() => handleEditProduct(product.id)}
      className="flex items-center justify-center space-x-1 bg-green-50 text-green-600 hover:bg-green-100 px-3 py-2 rounded-lg transition font-medium text-sm"
      title="Edit Product"
    >
      {/* <PencilSquareIcon className="h-4 w-4" /> */}
      <span>Edit</span>
    </button>

    {/* Row 2: Trending */}
    <button
      onClick={() => handleToggleTrending(product)}
      className={`flex items-center justify-center space-x-1 px-2 py-2 rounded-lg transition font-medium text-sm
        ${
          product.trending
            ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }
      `}
      title="Toggle Trending"
    >
    
      <span>{product.trending ? "Trending" : "Mark"}</span>
    </button>

    {/* Row 2: Delete */}
    <button
      onClick={() => handleDeleteProduct(product)}
      className="flex items-center justify-center space-x-1 bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-lg transition font-medium text-sm"
      title="Delete Product"
    >
      {/* <TrashIcon className="h-4 w-4" /> */}
      <span>Delete</span>
    </button>

  </div>
</td>

                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    </div>

                    {/* Empty State */}
                    {filteredProducts.length === 0 && (
                        <div className="text-center p-16 border-t border-gray-200">
                            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CubeIcon className="h-12 w-12 text-gray-400" />
                            </div>
                            <p className="text-2xl font-semibold text-gray-600 mb-2">No Products Found</p>
                            <p className="text-gray-500 mb-6 max-w-md mx-auto">
                                {products.length > 0 && searchTerm
                                    ? `No products match "${searchTerm}". Try a different search term.`
                                    : "Start building your product catalog by adding your first product."
                                }
                            </p>
                            {products.length === 0 && (
                                <button
                                    onClick={handleAddProduct}
                                    className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors inline-flex items-center space-x-2"
                                >
                                    <PlusIcon className="h-5 w-5" />
                                    <span>Add Your First Product</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Deletion Confirmation Modal */}
            {productToDelete && (
                <DeleteConfirmationModal
                    productName={productToDelete.name}
                    onConfirm={confirmDelete}
                    onCancel={() => setProductToDelete(null)}
                />
            )}
            
            {/* 🚨 NEW: Deletion Success Modal */}
            {showSuccessModal && (
                <DeleteSuccessModal
                    productName={productToDelete?.name || 'Unknown Product'} // Use optional chaining in case productToDelete state wasn't perfectly preserved
                    onConfirm={handleSuccessModalClose}
                />
            )}
        </div>
    );
};

// ==========================================================
// 2. DETAIL CARD UTILITY COMPONENT (Unchanged)
// ==========================================================

const DetailCard = ({ icon: Icon, title, values }) => (
    <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
        <h3 className="flex items-center text-lg font-semibold text-gray-800 border-b pb-2 mb-2">
            <Icon className="h-5 w-5 mr-2 text-indigo-500" />
            {title}
        </h3>
        <dl className="space-y-1">
            {values.map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                    <dt className="text-gray-500">{label}:</dt>
                    <dd className="font-medium text-gray-700 max-w-[60%] text-right">{value}</dd>
                </div>
            ))}
        </dl>
    </div>
);
const getYouTubeEmbedUrl = (url) => {
  if (!url || typeof url !== "string") return null;

  try {
    let videoId = null;

    // 1️⃣ Shorts: youtube.com/shorts/VIDEO_ID
    if (url.includes("/shorts/")) {
      videoId = url.split("/shorts/")[1]?.split("?")[0];
    }

    // 2️⃣ youtu.be/VIDEO_ID
    else if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1]?.split("?")[0];
    }

    // 3️⃣ youtube.com/watch?v=VIDEO_ID
    else if (url.includes("youtube.com")) {
      const parsedUrl = new URL(url);
      videoId = parsedUrl.searchParams.get("v");
    }

    // 4️⃣ Already embed URL
    else if (url.includes("/embed/")) {
      videoId = url.split("/embed/")[1]?.split("?")[0];
    }

    if (!videoId) return null;

    return `https://www.youtube.com/embed/${videoId}`;
  } catch (error) {
    console.error("YouTube URL parse failed:", url, error);
    return null;
  }
};



// ==========================================================
// 3. INTEGRATED PRODUCT VIEW COMPONENT (Unchanged - Minor Fix)
// ==========================================================
const IntegratedProductView = ({ productId, onClose, navigate, onDelete }) => {
    const [product, setProduct] = useState(null);
    const [categoryNames, setCategoryNames] = useState({ categoryName: 'N/A', subCategoryName: 'N/A' });
    const [brandName, setBrandName] = useState('N/A');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- Data Fetching ---
    useEffect(() => {
        if (!productId) {
            setError("No product ID provided.");
            setLoading(false);
            return;
        }

        const fetchProductData = async () => {
            try {
                const docRef = doc(db, "products", productId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const productData = { id: docSnap.id, ...docSnap.data() };
                    setProduct(productData);
                    
                    // Fetch brand name
                    if (productData.brandId) {
                        const brand = await fetchBrandName(productData.brandId);
                        setBrandName(brand);
                    } else if (productData.brand?.name) {
                        setBrandName(productData.brand.name);
                    } else if (productData.brand && typeof productData.brand === 'string') {
                        setBrandName(productData.brand);
                    }
                    
                    // Fetch category names
                    if (productData.categoryId || productData.subCategoryId) {
                        const names = await fetchCategoryNames(productData.categoryId, productData.subCategoryId);
                        setCategoryNames(names);
                    } else if (productData.category?.name || productData.subCategory?.name) {
                        setCategoryNames({
                            categoryName: productData.category?.name || 'N/A',
                            subCategoryName: productData.subCategory?.name || 'N/A'
                        });
                    } else if (productData.category && typeof productData.category === 'string') {
                        setCategoryNames({
                            categoryName: productData.category,
                            subCategoryName: 'N/A'
                        });
                    }
                } else {
                    setError(`Product with ID ${productId} not found.`);
                }
            } catch (err) {
                console.error("Error fetching product details:", err);
                setError("Failed to load product details due to a database error.");
            } finally {
                setLoading(false);
            }
        };

        // Reset state before fetching new product details
        setProduct(null);
        setCategoryNames({ categoryName: 'N/A', subCategoryName: 'N/A' });
        setBrandName('N/A');
        setLoading(true);
        setError(null);

        fetchProductData();
    }, [productId]);

    // --- Utility Functions ---
    const formatVariants = (variants) => {
        if (!variants || variants.length === 0) {
            return 'None';
        }
        return variants.join(", ");
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        try {
            const date = timestamp.toDate();
            return date.toLocaleString();
        } catch (e) {
            return String(timestamp);
        }
    };

    // --- UI: Loading State ---
    if (loading) {
        return (
            <div className="flex justify-center items-center p-16 min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
                <div className="text-lg font-medium text-indigo-600">Loading Product Details...</div>
            </div>
        );
    }

    // --- UI: Error/Not Found State ---
    if (error || !product) {
        return (
            <div className="text-center p-10 bg-red-50 border-l-4 border-red-500 text-red-700 mx-auto max-w-lg mt-10 shadow-lg rounded-xl">
                <h3 className="font-bold text-xl mb-2">Error</h3>
                <p>{error || "Product data is missing or inaccessible."}</p>
                <button
                    onClick={onClose}
                    className="mt-4 bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors"
                >
                    Back to Products List
                </button>
            </div>
        );
    }

    // Calculate summary from variants array
    const { displayPrice, totalStock, hasOffer, validPrices } = getVariantSummary(product.variants);
    const { colorVariants, sizeVariants } = getUniqueVariantAttributes(product.variants);

    // --- UI: Main Component Render ---
    return (
        <div className="p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
            <div className="max-w-6xl mx-auto">

                {/* Header and Actions */}
                <div className="flex justify-between items-center mb-6">
                    <button
                        onClick={onClose}
                        className="flex items-center text-indigo-600 hover:text-indigo-800 transition duration-150"
                    >
                        <ArrowLeftIcon className="h-5 w-5 mr-1" />
                        <span className="font-medium">Back to Products List</span>
                    </button>
                    <div className="flex space-x-3">
                         {/* Re-enable Delete button for IntegratedProductView if needed */}
                         {/* <button
                            onClick={() => onDelete(product)}
                            className="flex items-center space-x-2 bg-red-500 text-white px-4 py-2 rounded-xl font-semibold shadow-md hover:bg-red-600 transition"
                        >
                            <TrashIcon className="h-5 w-5" />
                            <span>Delete Product</span>
                        </button> */}
                        <button
                            onClick={() => navigate(`/products/edit/${product.id}`)}
                            className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-xl font-semibold shadow-md hover:bg-green-600 transition"
                        >
                            <PencilSquareIcon className="h-5 w-5" />
                            <span>Edit Product</span>
                        </button>
                    </div>
                </div>  

                <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">

                    {/* Main Product Info and Image */}     
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 border-b pb-6 mb-6">

                        {/* Image Gallery */}
                        <div className="lg:col-span-1">
                            <h3 className="flex items-center text-xl font-semibold text-gray-800 mb-4">
                                <PhotoIcon className="h-6 w-6 mr-2 text-indigo-500" />
                                Product Images
                            </h3>
 <img
  src={getProductImage(product)}
  alt={product.name}
  onError={(e) => {
    e.currentTarget.src = FALLBACK_IMAGE;
  }}
/>

                           <div className="flex space-x-2 mt-4 overflow-x-auto">
  {product.imageUrls?.slice(0, 4).map((img, i) => {
    const imageUrl = typeof img === "string" ? img : img?.url;

    return (
      <img
        key={i}
        src={imageUrl}
        alt={`Gallery ${i + 1}`}
        className="w-16 h-16 object-cover rounded-lg cursor-pointer border-2 border-transparent hover:border-indigo-500 transition"
      />
    );
  })}
</div>

                        </div>

                        {/* Pricing & Inventory Card */}
                        <div className="lg:col-span-2 p-6 bg-gray-50 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="flex items-center text-xl font-semibold text-gray-800 mb-6 border-b pb-3">
                                <CurrencyRupeeIcon className="h-6 w-6 mr-2 text-green-600" />
                                Pricing & Inventory Summary
                            </h3>

                            <div className="space-y-4">
                                {/* Min. Effective Price */}
                                <div>
                                    <div className="flex justify-between items-center pb-2">
                                        <div className="text-lg text-gray-600">Min. Effective Price</div>
                                        <div className="text-2xl font-bold text-green-700 flex items-center">
                                            <CurrencyRupeeIcon className="h-5 w-5 mr-0.5" />
                                            {displayPrice === null ? 'N/A' : displayPrice.toFixed(2)}
                                            {hasOffer && <TagIcon className="h-5 w-5 ml-2 text-red-500" title="Offer Price Available" />}
                                        </div>
                                    </div>
                                    {validPrices.length > 0 && (
                                        <div className="text-xs text-gray-500 mt-1 italic bg-gray-100 p-2 rounded">
                                            Calculated as the minimum of all non-zero variant prices ({validPrices.length} valid prices).
                                            Prices considered: {validPrices.map((price, i) => 
                                                `₹${price}` + (i < validPrices.length - 1 ? ', ' : '.')
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Total Stock Quantity */}
                                <div className="flex justify-between items-center border-t pt-2">
                                    <div className="text-lg text-gray-600">Total Stock Quantity</div>
                                    <span className="inline-flex items-center px-3 py-1 text-lg font-bold bg-indigo-100 text-indigo-800 rounded-full">
                                        {totalStock} units
                                    </span>
                                </div>

                                {/* Stock Status */}
                                <div className="flex justify-between items-center border-t pt-2">
                                    <div className="text-lg text-gray-600">Overall Stock Status</div>
                                    {totalStock > 10 ? (
                                        <span className="inline-flex items-center px-3 py-1 text-sm font-semibold bg-green-500 text-white rounded-full">
                                            High Stock
                                        </span>
                                    ) : totalStock > 0 ? (
                                        <span className="inline-flex items-center px-3 py-1 text-sm font-semibold bg-yellow-500 text-white rounded-full">
                                            Low Stock
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-3 py-1 text-sm font-semibold bg-red-500 text-white rounded-full">
                                            Out of Stock
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
{/* 🎥 PRODUCT VIDEO */}

{product.videoUrl && (
  <div className="mt-6">
    <h3 className="flex items-center text-xl font-semibold text-gray-800 mb-3">
      <PhotoIcon className="h-6 w-6 mr-2 text-indigo-500" />
      Product Video
    </h3>

    {product.videoType === "youtube" ? (
      (() => {
        const embedUrl = getYouTubeEmbedUrl(product.videoUrl);

        if (!embedUrl) {
          return (
            <p className="text-sm text-red-500">
              Invalid YouTube URL
            </p>
          );
        }

        return (
          <div className="relative w-md aspect-video rounded-xl ">
            <iframe
              src={embedUrl}
              title="Product YouTube Video"
              className="absolute inset-0 w-md"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        );
      })()
    ) : (
      <video
        src={product.videoUrl}
        controls
        className="w-md rounded-xl border shadow-sm"
      />
    )}
  </div>
)}


                    {/* Description */}
                    <div className="border-b pb-6 mb-6">
                         <h3 className="text-2xl font-semibold text-gray-900 mb-4">Product Overview</h3>
                         <p className="text-gray-700 bg-indigo-50 p-4 rounded-lg italic">
                            {product.description || "No detailed product description available."}
                         </p>
                         
                    </div>

                    {/* Technical Specifications */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 pt-6">

                        {/* Detail Card 1: Identification */}
                        <DetailCard
                            icon={TagIcon}
                            title="Product Identification"
                            values={[
                                ['SKU', product.sku || 'N/A'],
                                ['HSN Code', product.hsnCode || 'N/A'],
                                ['Seller ID', product.sellerId || 'N/A'],
                                ['Status', product.status || 'N/A'],
                            ]}
                        />

                        {/* Detail Card 2: Classification - UPDATED TO USE FETCHED NAMES */}
                        <DetailCard
                            icon={ArchiveBoxIcon}
                            title="Classification"
                            values={[
                                // UPDATED: Use fetched brandName instead of brand
                                ['Brand', brandName],
                                // UPDATED: Use fetched categoryNames instead of IDs
                                ['Category', categoryNames.categoryName],
                                ['Sub-Category', categoryNames.subCategoryName],
                            ]}
                        />

                        {/* Detail Card 3: Variants */}
                        <DetailCard
                            icon={PhotoIcon}
                            title="Unique Variants"
                            values={[
                                ['Colors', formatVariants(colorVariants)],
                                ['Sizes/Storage', formatVariants(sizeVariants)]
                            ]}
                        />

                        {/* Detail Card 4: Timestamps */}
                        <DetailCard
                            icon={ClockIcon}
                            title="Timeline"
                            values={[
                                ['Created At', formatDate(product.createdAt)],
                                ['Last Updated', formatDate(product.updatedAt)],
                            ]}
                        />
                    </div>

                    {/* Detailed Variants Table */}
                    {product.variants && product.variants.length > 0 && (
                        <div className="mt-8">
                             <h3 className="flex items-center text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
                                <CubeIcon className="h-5 w-5 mr-2 text-indigo-500" />
                                All Individual Variants ({product.variants.length})
                            </h3>
                            
                            <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Color</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Regular Price (₹)</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Offer Price (₹)</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                                            
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {product.variants.map((v, i) => {
                                            const effectivePrice = (v.offerPrice && Number(v.offerPrice) > 0)
                                                ? Number(v.offerPrice)
                                                : Number(v.price);
                                            const isZeroPrice = effectivePrice <= 0;
                                            
                                            return (
                                                <tr key={v.variantId || i} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{v.color || 'N/A'}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{v.size || 'N/A'}</td>
                                                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${isZeroPrice ? 'text-gray-400 italic' : 'text-gray-900'}`}>
                                                        {Number(v.price || 0).toFixed(2)}
                                                        {isZeroPrice && <span className="ml-1 text-xs">(skipped)</span>}
                                                    </td>
                                                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${v.offerPrice ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                                                        {v.offerPrice ? Number(v.offerPrice).toFixed(2) : '-'}
                                                        {v.offerPrice && Number(v.offerPrice) <= 0 && <span className="ml-1 text-xs">(skipped)</span>}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{v.stock || 0}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default Products;