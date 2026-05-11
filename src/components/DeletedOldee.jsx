import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from "../firebase"; // Ensure this path is correct for your project
import { 
  Archive, Calendar, Search, X, 
  AlertTriangle, Package, Info, User
} from 'lucide-react';

const DeletedOldeeTable = () => {
  const [deletedItems, setDeletedItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchDeletedOldee();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredItems(deletedItems);
    } else {
      const search = searchTerm.toLowerCase();
      const filtered = deletedItems.filter((item) => {
        const title = (item.title || "").toLowerCase();
        const category = (item.category || "").toLowerCase();
        const brand = (item.brand || "").toLowerCase();
        const seller = (item.sellerName || "").toLowerCase();
        const reason = (item.deletedReason || "").toLowerCase();

        return (
          title.includes(search) ||
          category.includes(search) ||
          brand.includes(search) ||
          seller.includes(search) ||
          reason.includes(search)
        );
      });
      setFilteredItems(filtered);
    }
  }, [searchTerm, deletedItems]);

  const fetchDeletedOldee = async () => {
    try {
      setLoading(true);
      const deletedRef = collection(db, "deleted_oldee");
      const q = query(deletedRef, orderBy("deletedAt", "desc"));
      const snap = await getDocs(q);
      
      const data = snap.docs.map((doc) => {
        const itemData = doc.data();
        
        // Handle deletedAt field - supports both Timestamp and String
        let deletedDate = null;
        if (itemData.deletedAt) {
          if (itemData.deletedAt.toDate) {
            deletedDate = itemData.deletedAt.toDate();
          } else {
            deletedDate = new Date(itemData.deletedAt);
          }
        }
        
        return { 
          id: doc.id,
          title: itemData.title || itemData.name || "Untitled Item",
          deletedAt: deletedDate,
          deletedReason: itemData.deletedReason || 'Manual deletion',
          price: itemData.price || "0",
          category: itemData.category || "Uncategorized",
          // Corrected to use imageURLs from your screenshot
          imageURLs: itemData.imageURLs || [], 
          ...itemData
        };
      });
      
      setDeletedItems(data);
      setFilteredItems(data);
    } catch (err) {
      console.error("Error fetching deleted oldee:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateValue) => {
    if (!(dateValue instanceof Date) || isNaN(dateValue)) return 'Unknown Date';
    return dateValue.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const clearSearch = () => setSearchTerm("");

  const handleViewDetails = (item) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
        <div className="flex items-center space-x-3">
          <Archive className="h-8 w-8 text-orange-600" />
          <h1 className="text-2xl font-bold text-gray-900">Deleted Oldee Archive</h1>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search items, categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
            />
            {searchTerm && (
              <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="bg-orange-600 px-4 py-2 rounded-lg shadow-sm">
            <span className="text-white font-semibold">Total: {filteredItems.length}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl overflow-hidden shadow-md border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Product Info</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Category & Price</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Deletion Details</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center">
                    <Package className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                    <p className="text-gray-500">No deleted items found</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-orange-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-12 w-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border">
                          {/* Corrected image check using imageURLs array */}
                          {item.imageURLs && item.imageURLs.length > 0 ? (
                            <img src={item.imageURLs[0]} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-full w-full p-2 text-gray-400" />
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-gray-900">{item.title}</div>
                          <div className="text-xs text-gray-500">ID: {item.id?.substring(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 w-fit">
                          {item.category}
                        </span>
                        <span className="text-sm font-semibold text-gray-900 mt-1">₹{item.price}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-700 space-y-1">
                        <div className="flex items-center font-medium">
                          <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                          {formatDate(item.deletedAt)}
                        </div>
                        <div className="text-red-600 line-clamp-1 italic">"{item.deletedReason}"</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleViewDetails(item)}
                        className="text-orange-600 hover:text-orange-900 font-medium text-sm transition-colors"
                      >
                        View Full History
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {showModal && selectedItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold flex items-center">
                <Info className="mr-2 text-orange-500" /> Item History
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-start space-x-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="h-24 w-24 bg-white rounded-lg border overflow-hidden flex-shrink-0">
                  {/* Corrected image check inside Modal */}
                  {selectedItem.imageURLs && selectedItem.imageURLs.length > 0 ? (
                    <img src={selectedItem.imageURLs[0]} className="h-full w-full object-cover" alt="" />
                  ) : <Package className="h-full w-full p-4 text-gray-300" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{selectedItem.title}</h3>
                  <p className="text-orange-600 font-bold text-xl">₹{selectedItem.price}</p>
                  <p className="text-sm text-gray-500">Category: {selectedItem.category}</p>
                </div>
              </div>

              <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <h4 className="text-sm font-bold text-red-800 uppercase mb-3 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2" /> Deletion Audit
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 text-xs block uppercase">Date Deleted</span>
                    <p className="font-semibold text-gray-900">{formatDate(selectedItem.deletedAt)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs block uppercase">Deleted By</span>
                    <p className="font-semibold text-gray-900">{selectedItem.deletedBy || "Admin"}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500 text-xs block uppercase">Reason for Removal</span>
                    <p className="mt-1 p-3 bg-white rounded border italic text-gray-700">
                      {selectedItem.deletedReason}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border rounded-xl p-4">
                <h4 className="text-sm font-bold text-gray-700 uppercase mb-3 flex items-center">
                  <User className="h-4 w-4 mr-2" /> Seller & Product Details
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 text-xs block uppercase">Seller Name</span>
                    <p className="font-semibold">{selectedItem.sellerName || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs block uppercase">Condition</span>
                    <p className="font-semibold">{selectedItem.condition || "Used"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs block uppercase">Brand</span>
                    <p className="font-semibold">{selectedItem.brand || "Generic"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs block uppercase">Original ID</span>
                    <p className="font-mono text-[10px] break-all">{selectedItem.id}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeletedOldeeTable;