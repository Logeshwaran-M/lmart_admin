// DeletedSellersTable.jsx - Complete Component
import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, orderBy } from 'firebase/firestore';
import { db } from "../../firebase";
import { 
  Users, Trash2, Archive, Clock, Calendar, Mail, Phone, 
  MapPin, ChevronLeft, Search, X, AlertTriangle, User,
  ShieldCheck, ExternalLink, FileText, Package
} from 'lucide-react';

const DeletedSellersTable = () => {
  const [deletedSellers, setDeletedSellers] = useState([]);
  const [filteredSellers, setFilteredSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchDeletedSellers();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredSellers(deletedSellers);
    } else {
      const search = searchTerm.toLowerCase();
      const filtered = deletedSellers.filter((seller) => {
        const fullName = `${seller.firstName || ""} ${seller.lastName || ""}`.toLowerCase();
        const business = (seller.businessName || "").toLowerCase();
        const email = (seller.email || "").toLowerCase();
        const phone = seller.phone || "";
        const reason = (seller.deletedReason || "").toLowerCase();

        return (
          fullName.includes(search) ||
          business.includes(search) ||
          email.includes(search) ||
          phone.includes(search) ||
          reason.includes(search)
        );
      });
      setFilteredSellers(filtered);
    }
  }, [searchTerm, deletedSellers]);

  const fetchDeletedSellers = async () => {
    try {
      setLoading(true);
      const deletedRef = collection(db, "deleted_sellers");
      const q = query(deletedRef, orderBy("deletedAt", "desc"));
      const snap = await getDocs(q);
      
      const data = snap.docs.map((doc) => {
        const sellerData = doc.data();
        
        // Handle deletedAt field - it might be string or Firestore timestamp
        let deletedDate = "Unknown";
        if (sellerData.deletedAt) {
          if (typeof sellerData.deletedAt === 'string') {
            deletedDate = new Date(sellerData.deletedAt);
          } else if (sellerData.deletedAt.toDate) {
            deletedDate = sellerData.deletedAt.toDate();
          } else {
            deletedDate = new Date(sellerData.deletedAt);
          }
        }
        
        return { 
          id: doc.id,
          originalId: sellerData.originalId,
          deletedAt: deletedDate,
          deletedReason: sellerData.deletedReason || 'No reason provided',
          deletedBy: sellerData.deletedBy || 'admin',
          ...sellerData
        };
      });
      
      setDeletedSellers(data);
      setFilteredSellers(data);
    } catch (err) {
      console.error("Error fetching deleted sellers:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return 'Unknown';
    
    try {
      const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getSellerName = (seller) => {
    if (seller.firstName && seller.lastName) return `${seller.firstName} ${seller.lastName}`;
    if (seller.firstName) return seller.firstName;
    if (seller.businessName) return seller.businessName;
    return "Unknown Seller";
  };

  const getSellerInitials = (seller) => {
    const name = getSellerName(seller);
    if (name === 'Unknown Seller') return 'S';
    return name.split(" ").map(w => w[0]).join("").toUpperCase().substring(0, 2);
  };

  const clearSearch = () => setSearchTerm("");

  const handleViewDetails = (seller) => {
    setSelectedSeller(seller);
    setShowModal(true);
  };

  const closeModal = () => {
    setSelectedSeller(null);
    setShowModal(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 bg-white min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
        <div className="flex items-center space-x-3">
          <Archive className="h-8 w-8 text-gray-600" />
          <h1 className="text-2xl font-bold text-gray-900">Deleted Sellers Archive</h1>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-500" />
            </div>
            <input
              type="text"
              placeholder="Search deleted sellers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-900"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="bg-gray-700 px-4 py-2 rounded-lg">
            <span className="text-white font-semibold">
              Total: {filteredSellers.length}
            </span>
          </div>
        </div>
      </div>

      {/* Search Results Info */}
      {searchTerm && (
        <div className="mb-4 p-3 bg-gray-100 border border-gray-300 rounded-lg">
          <p className="text-gray-700 text-sm">
            Showing {filteredSellers.length} result{filteredSellers.length !== 1 ? 's' : ''} for "**{searchTerm}**"
            <button 
              onClick={clearSearch}
              className="ml-2 text-red-600 hover:text-red-500 underline"
            >
              Clear search
            </button>
          </p>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-lg overflow-hidden shadow-xl border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Seller Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Deletion Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Original Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSellers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-600">
                    <Archive className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-700">No deleted sellers found</p>
                    <p className="text-sm text-gray-600">
                      {searchTerm ? "No archived sellers match your search" : "Deleted sellers will appear here when available."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSellers.map((seller) => (
                  <tr key={seller.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-600 flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {getSellerInitials(seller)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {getSellerName(seller)}
                          </div>
                          {seller.businessName && (
                            <div className="text-xs text-red-600">
                              {seller.businessName}
                            </div>
                          )}
                          <div className="text-xs text-gray-600 mt-1">
                            Original ID: {seller.originalId?.substring(0, 15)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-700">
                          <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                          {formatDate(seller.deletedAt)}
                        </div>
                        <div className="flex items-start text-sm text-gray-700">
                          <AlertTriangle className="h-4 w-4 mr-2 text-red-500 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">
                            {seller.deletedReason}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {seller.email && (
                          <div className="flex items-center text-sm text-gray-700">
                            <Mail className="h-4 w-4 mr-2 text-red-500" />
                            <span className="truncate">{seller.email}</span>
                          </div>
                        )}
                        {seller.phone && (
                          <div className="flex items-center text-sm text-gray-700">
                            <Phone className="h-4 w-4 mr-2 text-green-600" />
                            {seller.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleViewDetails(seller)}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <User className="h-4 w-4 mr-2" />
                        View Details
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
      {showModal && selectedSeller && (
        <div className="fixed inset-0 bg-gray-900/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-300">
            <div className="sticky top-0 bg-white flex justify-between items-center p-6 border-b border-gray-200 z-10">
              <div className='flex items-center space-x-3'>
                <Archive className='h-7 w-7 text-gray-600'/>
                <h2 className="text-2xl font-bold text-gray-900">Deleted Seller Details</h2>
              </div>
              <button 
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Deletion Info */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-start">
                  <AlertTriangle className="h-6 w-6 text-red-600 mr-3 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-red-700 mb-2">Deletion Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Deleted At:</p>
                        <p className="text-gray-900 font-semibold">{formatDate(selectedSeller.deletedAt)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Deleted By:</p>
                        <p className="text-gray-900 font-semibold">{selectedSeller.deletedBy}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-600">Reason for Deletion:</p>
                        <p className="text-gray-900 mt-1 p-3 bg-white border border-gray-200 rounded-lg">
                          {selectedSeller.deletedReason}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seller Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Info */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Personal Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Name:</p>
                      <p className="text-gray-900 font-medium">{getSellerName(selectedSeller)}</p>
                    </div>
                    {selectedSeller.businessName && (
                      <div>
                        <p className="text-sm text-gray-600">Business Name:</p>
                        <p className="text-gray-900 font-medium text-red-600">{selectedSeller.businessName}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-600">Original ID:</p>
                      <p className="text-gray-900 font-mono text-sm">{selectedSeller.originalId}</p>
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Mail className="h-5 w-5 mr-2" />
                    Contact Information
                  </h3>
                  <div className="space-y-3">
                    {selectedSeller.email && (
                      <div>
                        <p className="text-sm text-gray-600">Email:</p>
                        <p className="text-gray-900 font-medium break-all">{selectedSeller.email}</p>
                      </div>
                    )}
                    {selectedSeller.phone && (
                      <div>
                        <p className="text-sm text-gray-600">Phone:</p>
                        <p className="text-gray-900 font-medium">{selectedSeller.phone}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Location Info */}
                {selectedSeller.address && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <MapPin className="h-5 w-5 mr-2" />
                      Location
                    </h3>
                    <div>
                      <p className="text-sm text-gray-600">Address:</p>
                      <p className="text-gray-900 mt-1">{selectedSeller.address}</p>
                      {(selectedSeller.city || selectedSeller.state) && (
                        <p className="text-gray-900 mt-1">
                          {selectedSeller.city}{selectedSeller.city && selectedSeller.state ? ', ' : ''}
                          {selectedSeller.state}
                          {selectedSeller.pincode ? ` ${selectedSeller.pincode}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Financial Info */}
                {(selectedSeller.gstNumber || selectedSeller.panNumber) && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      Financial Information
                    </h3>
                    <div className="space-y-3">
                      {selectedSeller.gstNumber && (
                        <div>
                          <p className="text-sm text-gray-600">GST Number:</p>
                          <p className="text-gray-900 font-medium">{selectedSeller.gstNumber}</p>
                        </div>
                      )}
                      {selectedSeller.panNumber && (
                        <div>
                          <p className="text-sm text-gray-600">PAN Number:</p>
                          <p className="text-gray-900 font-medium">{selectedSeller.panNumber}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeletedSellersTable;