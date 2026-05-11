import React, { useState, useEffect, useCallback } from "react";
import {db} from  "./firebase"
import { collection, getDocs, updateDoc, doc, query, orderBy } from "firebase/firestore";
import {
  FiStar,
  FiSearch,
  FiSlash,
  FiTrendingUp,
  FiGrid,
  FiList,
  FiPackage,
  FiFilter,
  FiRefreshCw,
  FiShoppingBag,
  FiAlertCircle,
} from "react-icons/fi";

/* ---------- Helpers ---------- */

// Placeholder image
const getPlaceholderImage = (productName, productId) => {
  const colors = [
    "bg-blue-100",
    "bg-green-100",
    "bg-yellow-100",
    "bg-purple-100",
    "bg-pink-100",
    "bg-indigo-100",
  ];
  const textColors = [
    "text-blue-800",
    "text-green-800",
    "text-yellow-800",
    "text-purple-800",
    "text-pink-800",
    "text-indigo-800",
  ];
  const colorIndex = productId?.length ? productId.charCodeAt(0) % colors.length : 0;

  return (
    <div className={`${colors[colorIndex]} w-full h-full flex items-center justify-center rounded-xl`}>
      <div className="text-center p-4">
        <FiShoppingBag className={`${textColors[colorIndex]} w-12 h-12 mx-auto mb-2`} />
        <span className={`${textColors[colorIndex]} font-semibold text-sm`}>
          {productName?.substring(0, 10) || "Product"}
        </span>
      </div>
    </div>
  );
};

// Get summary price + stock from variants array
const getVariantSummary = (variants) => {
  if (!variants || !Array.isArray(variants) || variants.length === 0) {
    return { price: 0, stock: 0 };
  }

  let minPrice = Infinity;
  let totalStock = 0;

  variants.forEach((v) => {
    if (!v) return;
    const effectivePrice =
      Number(v.offerPrice) > 0 ? Number(v.offerPrice) : Number(v.price);
    if (!Number.isNaN(effectivePrice) && effectivePrice < minPrice) {
      minPrice = effectivePrice;
    }
    const s = Number(v.stock);
    if (!Number.isNaN(s)) {
      totalStock += s;
    }
  });

  return {
    price: minPrice === Infinity ? 0 : minPrice,
    stock: totalStock,
  };
};

/* ---------- Component ---------- */

export default function TrendingProducts() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [filterTrending, setFilterTrending] = useState("all");
  const [sortBy, setSortBy] = useState("name");

  // Fetch products
 const fetchProducts = useCallback(async () => {
  setLoading(true);
  setError(null);

  try {
    const productsRef = collection(db, "products");
    const querySnapshot = await getDocs(productsRef);

    const data = querySnapshot.docs.map((docSnap) => {
      const raw = docSnap.data() || {};
      const summary = getVariantSummary(raw.variants || []);

      return {
        id: docSnap.id,
        name: raw.name || "Unnamed Product",
        brand: raw.brand || "No Brand",
        price: summary.price || Number(raw.price || 0),
        stock: summary.stock || Number(raw.stock || 0),
        category: raw.category || "Uncategorized",
        trending: Boolean(raw.trending),
        mainImageUrl: raw.mainImageUrl || "",
        ...raw,
      };
    });

    setProducts(data);
  } catch (err) {
    console.error("Error fetching products:", err);
    setError(err.message); // <-- show real error
  } finally {
    setLoading(false);
  }
}, []);


  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Update trending flag
  const updateTrendingStatus = async (productId, status) => {
    try {
      const ref = doc(db, "products", productId);
      await updateDoc(ref, { trending: status, updatedAt: new Date().toISOString() });

      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, trending: status } : p))
      );
    } catch (err) {
      console.error("Error updating trending status:", err);
      setError("Failed to update trending status. Please try again.");
    }
  };

  // Stats
  const totalProducts = products.length;
  const trendingProducts = products.filter((p) => p.trending).length;
  const nonTrendingProducts = totalProducts - trendingProducts;

  // Filter
 const filteredProducts = products.filter((p) => {
  if (!p || !p.trending) return false; // 🔥 ONLY TRENDING

  const searchTerm = search.toLowerCase();
  const productName = (p.name || "").toLowerCase();
  const productBrand = (p.brand || "").toLowerCase();

  const productCategory = (
    typeof p.category === "object" && p.category?.name
      ? p.category.name
      : typeof p.category === "string"
      ? p.category
      : ""
  ).toLowerCase();

  return (
    productName.includes(searchTerm) ||
    productBrand.includes(searchTerm) ||
    productCategory.includes(searchTerm)
  );
});

    

  // Sort
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case "price":
        return (b.price || 0) - (a.price || 0);
      case "trending":
        return (b.trending ? 1 : 0) - (a.trending ? 1 : 0);
      default:
        return (a.name || "").localeCompare(b.name || "");
    }
  });

  // Format price
  const formatPrice = (price) => {
    const num = Number(price);
    if (Number.isNaN(num)) return "₹0.00";
    return `₹${num.toFixed(2)}`;
  };

  /* ---------- Error-state full screen ---------- */
  if (error && products.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-white rounded-2xl p-12 shadow-lg">
            <FiAlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={fetchProducts}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <FiTrendingUp className="mr-3 text-yellow-500 w-8 h-8" />
                Trending Products Manager
              </h1>
              <p className="text-gray-600 mt-2">
                Manage {totalProducts} products in your catalog
              </p>
            </div>

            <div className="flex items-center space-x-3 mt-4 md:mt-0">
              
              <button
                onClick={fetchProducts}
                className="px-4 py-2 bg-white border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors duration-200 flex items-center"
              >
                <FiRefreshCw className="mr-2" />
                Refresh
              </button>
            </div>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Products</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{totalProducts}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FiPackage className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Trending Now</p>
                  <p className="text-3xl font-bold text-yellow-600 mt-2">{trendingProducts}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <FiStar className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
              {totalProducts > 0 && (
                <div className="mt-4">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                      style={{ width: `${(trendingProducts / totalProducts) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {((trendingProducts / totalProducts) * 100).toFixed(1)}% of all products
                  </p>
                </div>
              )}
            </div>

            
          </div>

          {/* CONTROLS */}
          <div className="bg-white rounded-2xl p-4 shadow-lg mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
              <div className="relative flex-1 md:max-w-md">
                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search products by name, brand, or category..."
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <FiFilter className="text-gray-500" />
                  <select
                    value={filterTrending}
                    onChange={(e) => setFilterTrending(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Products</option>
                    <option value="trending">Trending Only</option>
                    <option value="non-trending">Non-Trending</option>
                  </select>
                </div>

                <div className="flex border border-gray-300 rounded-lg overflow-hidden bg-white">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`px-4 py-2 flex items-center ${
                      viewMode === "grid"
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <FiGrid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`px-4 py-2 flex items-center ${
                      viewMode === "list"
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <FiList className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* PRODUCTS */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mb-4"></div>
              <p className="text-gray-600">Loading products...</p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex justify-between items-center">
                <p className="text-gray-600">
                  Showing <span className="font-bold">{sortedProducts.length}</span> of{" "}
                  {totalProducts} products
                </p>
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear search
                  </button>
                )}
              </div>

              {sortedProducts.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl shadow">
                  <FiSearch className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No products found</h3>
                  <p className="text-gray-500">
                    {search ? "Try a different search term" : "Add products to get started"}
                  </p>
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sortedProducts.map((p) => (
                    <div
                      key={p.id}
                      className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100"
                    >
                      <div className="relative h-48 overflow-hidden">
                        {p.mainImageUrl ? (
                          <img
                            src={p.mainImageUrl}
                            alt={p.name}
                            className="w-full h-full object-contain transition-transform duration-500 hover:scale-110"
                            onError={(e) => {
                              e.target.style.display = "none";
                              e.target.parentElement.innerHTML = "";
                              e.target.parentElement.appendChild(
                                getPlaceholderImage(p.name, p.id)
                              );
                            }}
                          />
                        ) : (
                          getPlaceholderImage(p.name, p.id)
                        )}
                        {p.trending && (
                          <div className="absolute top-4 right-4">
                            <div className="px-3 py-1 bg-yellow-500 text-white text-xs font-bold rounded-full flex items-center shadow-lg">
                              <FiStar className="w-3 h-3 mr-1" />
                              TRENDING
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="p-6">
                        <div className="mb-4">
                          <h3 className="text-lg font-bold text-gray-900 truncate">{p.name}</h3>
                          <p className="text-gray-500 text-sm mt-1">{p.brand}</p>
                        </div>

                        <div className="space-y-3 mb-6">
                          <div className="flex justify-between items-center">
                            <span className="text-xl font-bold text-blue-600">
                              {formatPrice(p.price)}
                            </span>
                            {p.category && (
                              <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                {typeof p.category === "object" ? p.category.name : p.category}
                              </span>
                            )}
                          </div>
                          {p.stock !== undefined && (
                            <div className="flex items-center text-sm text-gray-500">
                              <span
                                className={`w-2 h-2 rounded-full mr-2 ${
                                  p.stock > 0 ? "bg-green-500" : "bg-red-500"
                                }`}
                              ></span>
                              Stock: {p.stock} units
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => updateTrendingStatus(p.id, !p.trending)}
                          className={`w-full py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center ${
                            p.trending
                              ? "bg-gradient-to-r from-red-500 to-pink-600 text-white hover:shadow-lg hover:-translate-y-0.5"
                              : "bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:shadow-lg hover:-translate-y-0.5"
                          }`}
                        >
                          {p.trending ? (
                            <>
                              <FiSlash className="w-5 h-5 mr-2" />
                              Remove from Trending
                            </>
                          ) : (
                            <>
                              <FiStar className="w-5 h-5 mr-2" />
                              Make Trending
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedProducts.map((p) => (
                    <div
                      key={p.id}
                      className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between">
                        <div className="flex items-start space-x-6 mb-4 md:mb-0 flex-1">
                          <div className="relative flex-shrink-0">
                            <div className="w-24 h-24 rounded-xl overflow-hidden">
                              {p.mainImageUrl ? (
                                <img
                                  src={p.mainImageUrl}
                                  alt={p.name}
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                    e.target.parentElement.innerHTML = "";
                                    e.target.parentElement.appendChild(
                                      getPlaceholderImage(p.name, p.id)
                                    );
                                  }}
                                />
                              ) : (
                                getPlaceholderImage(p.name, p.id)
                              )}
                            </div>
                            {p.trending && (
                              <div className="absolute -top-2 -right-2">
                                <FiStar className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-xl font-bold text-gray-900">{p.name}</h3>
                              {p.trending && (
                                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full">
                                  TRENDING
                                </span>
                              )}
                            </div>
                            <p className="text-gray-600">{p.brand}</p>
                            <div className="flex flex-wrap gap-3 mt-3">
                              <span className="text-lg font-bold text-blue-600">
                                {formatPrice(p.price)}
                              </span>
                              {p.category && (
                                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                  {typeof p.category === "object"
                                    ? p.category.name
                                    : p.category}
                                </span>
                              )}
                              {p.stock !== undefined && (
                                <span
                                  className={`text-sm px-3 py-1 rounded-full ${
                                    p.stock > 0
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  Stock: {p.stock}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="md:w-auto w-full">
                          <button
                            onClick={() => updateTrendingStatus(p.id, !p.trending)}
                            className={`w-full md:w-auto px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center ${
                              p.trending
                                ? "bg-gradient-to-r from-red-500 to-pink-600 text-white hover:shadow-lg"
                                : "bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:shadow-lg"
                            }`}
                          >
                            {p.trending ? (
                              <>
                                <FiSlash className="w-5 h-5 mr-2" />
                                Remove Trending
                              </>
                            ) : (
                              <>
                                <FiStar className="w-5 h-5 mr-2" />
                                Set Trending
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          
        </div>
      </div>
    </div>
  );
}
