import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, getDocs, doc, updateDoc, 
  query, where, deleteDoc, writeBatch, addDoc
} from 'firebase/firestore';
import {db} from "../../firebase"
import { 
  Users, Mail, Phone, MapPin, Calendar, X, Search, 
  FileText, CheckCircle, Clock, Package, DollarSign, ExternalLink, ShieldCheck,
  MessageCircle, Smartphone, User, Shield, Send, MessageSquare,
  CheckCircle2, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, Trash2,
  Archive, AlertTriangle
} from 'lucide-react';

const Sellers = () => {
  const [sellers, setSellers] = useState([]);
  const [filteredSellers, setFilteredSellers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedSeller, setSelectedSeller] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  const [searchTerm, setSearchTerm] = useState("");
  const [messageText, setMessageText] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('');
  const [sending, setSending] = useState(false);

  // PRODUCT STATES
  const [sellerProducts, setSellerProducts] = useState([]);
  const [filteredSellerProducts, setFilteredSellerProducts] = useState([]);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(false);

  // SORTING STATE
  const [sortConfig, setSortConfig] = useState({
    key: 'registrationDate',
    direction: 'desc'
  });

  useEffect(() => {
    fetchSellers();
  }, []);

  // Apply sorting and filtering
  useEffect(() => {
    let result = [...sellers];

    if (searchTerm.trim() !== "") {
      const search = searchTerm.toLowerCase();
      result = result.filter((s) => {
        const fullName = `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase();
        const business = (s.businessName || "").toLowerCase();
        const email = (s.email || "").toLowerCase();
        const phone = s.phone || "";

        return (
          fullName.includes(search) ||
          business.includes(search) ||
          email.includes(search) ||
          phone.includes(search)
        );
      });
    }

    // Apply sorting by date
    result.sort((a, b) => {
      const getDateValue = (seller) => {
        if (seller.registrationDate) {
          return new Date(seller.registrationDate).getTime();
        }
        if (seller.createdAt) {
          if (seller.createdAt.toDate) {
            return seller.createdAt.toDate().getTime();
          }
          return new Date(seller.createdAt).getTime();
        }
        return 0;
      };

      const aValue = getDateValue(a);
      const bValue = getDateValue(b);

      if (sortConfig.direction === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

    setFilteredSellers(result);
  }, [searchTerm, sellers, sortConfig]);

  // Filter products
  useEffect(() => {
    if (productSearchTerm.trim() === "") {
      setFilteredSellerProducts(sellerProducts);
    } else {
      const search = productSearchTerm.toLowerCase();
      const filtered = sellerProducts.filter((p) => {
        const name = (p.name?.name || p.name || "").toLowerCase();
        const category = (p.category?.name || p.category || "").toLowerCase();
        const description = (p.description || "").toLowerCase();

        return (
          name.includes(search) ||
          category.includes(search) ||
          description.includes(search)
        );
      });
      setFilteredSellerProducts(filtered);
    }
  }, [productSearchTerm, sellerProducts]);

  // Fetch sellers
  const fetchSellers = async () => {
    try {
      const snap = await getDocs(collection(db, "sellers"));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSellers(data);
    } catch (err) {
      console.error("Error loading sellers:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch products by seller
  const fetchSellerProducts = async (sellerId) => {
    try {
      setLoadingProducts(true);
      const productsCollectionRef = collection(db, "products"); 
      const q = query(productsCollectionRef, where("sellerid", "==", sellerId)); 
      const snap = await getDocs(q);
      
      const sellerItems = snap.docs.map(d => ({ 
        id: d.id, 
        ...d.data() 
      }));
      
      setSellerProducts(sellerItems);
    } catch (err) {
      console.error("Error loading seller products:", err);
      setSellerProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  // DELETE SELLER FUNCTION
  const handleDeleteSeller = async (sellerId, reason = 'No reason provided') => {
    try {
      setDeleting(true);
      
      // Get seller data before deletion
      const sellerRef = doc(db, 'sellers', sellerId);
      const sellerDoc = await getDocs(query(collection(db, 'sellers'), where('__name__', '==', sellerId)));
      
      if (sellerDoc.empty) {
        throw new Error('Seller not found');
      }
      
      const sellerData = sellerDoc.docs[0].data();
      
      // Create deleted seller document with timestamp and reason
      const deletedSellerData = {
        ...sellerData,
        originalId: sellerId,
        deletedAt: new Date().toISOString(),
        deletedReason: reason,
        deletedBy: 'admin', // You can replace this with actual admin ID
        status: 'deleted'
      };
      
      // Add to deleted_sellers collection
      await addDoc(collection(db, 'deleted_sellers'), deletedSellerData);
      
      // Delete from original sellers collection
      await deleteDoc(sellerRef);
      
      // Also delete seller's products (optional - based on your requirements)
      try {
        const productsQuery = query(collection(db, "products"), where("sellerid", "==", sellerId));
        const productsSnap = await getDocs(productsQuery);
        
        const batch = writeBatch(db);
        productsSnap.docs.forEach(productDoc => {
          batch.delete(productDoc.ref);
        });
        
        if (productsSnap.docs.length > 0) {
          await batch.commit();
        }
      } catch (productError) {
        console.warn("Error deleting seller's products:", productError);
        // Continue even if product deletion fails
      }
      
      // Update local state
      setSellers(prevSellers => prevSellers.filter(seller => seller.id !== sellerId));
      
      // Close modals if open
      setShowDeleteModal(false);
      if (showModal) closeModal();
      
      // Show success message
      alert(`Seller ${sellerData.businessName || sellerData.firstName} has been deleted and moved to archived records.`);
      
    } catch (error) {
      console.error('Error deleting seller:', error);
      alert('Failed to delete seller. Please try again.');
    } finally {
      setDeleting(false);
      setDeleteReason('');
    }
  };

  const openDeleteModal = (seller) => {
    setSelectedSeller(seller);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedSeller(null);
    setDeleteReason('');
    setDeleting(false);
  };

  // Block seller
  const handleBlockSeller = async (sellerId) => {
    try {
      const sellerRef = doc(db, 'sellers', sellerId); 
      await updateDoc(sellerRef, {
        status: 'blocked'
      });
      
      setSellers(prevSellers => 
        prevSellers.map(seller => 
          seller.id === sellerId 
            ? { ...seller, status: 'blocked' }
            : seller
        )
      );
      
      alert('Seller blocked successfully!');
    } catch (error) {
      console.error('Error blocking seller:', error);
      alert('Failed to block seller. Please try again.');
    }
  };

  // Approve seller
  const handleApproveSeller = async (sellerId) => {
    try {
      const sellerRef = doc(db, 'sellers', sellerId);
      await updateDoc(sellerRef, {
        status: 'approved'
      });
      
      setSellers(prevSellers => 
        prevSellers.map(seller => 
          seller.id === sellerId 
            ? { ...seller, status: 'approved' }
            : seller
        )
      );
      
      alert('Seller approved successfully!');
    } catch (error) {
      console.error('Error approving seller:', error);
      alert('Failed to approve seller. Please try again.');
    }
  };
  
  // Document verification
  const handleVerifyDocument = async (sellerId, documentKey, newStatus) => {
      try {
          const sellerRef = doc(db, 'sellers', sellerId);
          await updateDoc(sellerRef, {
              [`verificationStatus.${documentKey}`]: newStatus
          });

          setSelectedSeller(prev => {
              if (!prev) return null;
              return {
                  ...prev,
                  verificationStatus: {
                      ...(prev.verificationStatus || {}),
                      [documentKey]: newStatus
                  }
              };
          });

          setSellers(prevSellers => prevSellers.map(s => {
              if (s.id === sellerId) {
                  return {
                      ...s,
                      verificationStatus: {
                          ...(s.verificationStatus || {}),
                          [documentKey]: newStatus
                      }
                  };
              }
              return s;
          }));

          alert(`Document '${documentKey}' status updated to '${newStatus}'!`);
      } catch (error) {
          console.error(`Error updating document ${documentKey}:`, error);
          alert('Failed to update document status.');
      }
  };

  const handleViewSeller = (seller) => {
    setSelectedSeller(seller);
    fetchSellerProducts(seller.id);
    setProductSearchTerm("");
    setShowModal(true);
  };

  const closeModal = () => {
    setSelectedSeller(null);
    setShowModal(false);
    setSellerProducts([]);
    setFilteredSellerProducts([]);
    setProductSearchTerm("");
  };

  // MESSAGING FUNCTIONS
  const handleMessageSeller = (seller) => {
    setSelectedSeller(seller);
    setMessageText(`Hello ${seller.businessName || seller.firstName || 'there'}! We have an important update regarding your seller account.`);
    setShowMessageModal(true);
  };

  const closeMessageModal = () => {
    setShowMessageModal(false);
    setSelectedSeller(null);
    setMessageText('');
  };

  const handleSendConfirmation = (channel) => {
    setSelectedChannel(channel);
    setShowConfirmationModal(true);
  };

  const closeConfirmationModal = () => {
    setShowConfirmationModal(false);
    setSelectedChannel('');
    setSending(false);
  };

  const handleSendMessage = async () => {
    if (!selectedSeller || !selectedChannel) return;

    setSending(true);

    try {
      let success = false;
      
      if (selectedChannel === 'whatsapp') {
        success = sendWhatsAppMessage();
      } else if (selectedChannel === 'email') {
        success = sendEmailMessage();
      } else if (selectedChannel === 'gmail') {
        success = sendGmailMessage();
      }

      if (success) {
        setTimeout(() => {
          setSending(false);
          closeConfirmationModal();
          closeMessageModal();
        }, 1500);
      } else {
        throw new Error('Failed to send message');
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setSending(false);
      alert('Failed to send message. Please try again.');
    }
  };

  const sendWhatsAppMessage = () => {
    try {
      const phone = selectedSeller.phone;
      if (!phone) {
        alert('No phone number available for this seller');
        return false;
      }

      const cleanedPhone = phone.replace(/\D/g, '');
      const message = encodeURIComponent(messageText);
      const whatsappUrl = `https://wa.me/${cleanedPhone}?text=${message}`;
      
      window.open(whatsappUrl, '_blank');
      return true;
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      return false;
    }
  };
  
  const sendGmailMessage = () => {
    try {
      if (!selectedSeller.email) {
        alert('No email address available for this seller');
        return false;
      }

      const subject = encodeURIComponent('Message from Store Administration');
      const body = encodeURIComponent(messageText);
      const to = encodeURIComponent(selectedSeller.email);
      
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`;
      
      window.open(gmailUrl, '_blank');
      
      return true;
    } catch (error) {
      console.error('Error opening Gmail:', error);
      return false;
    }
  };

  const sendEmailMessage = () => {
    try {
      if (!selectedSeller.email) {
        alert('No email address available for this seller');
        return false;
      }

      const subject = encodeURIComponent('Message from Store Administration');
      const body = encodeURIComponent(messageText);
      
      const mailtoUrl = `mailto:${selectedSeller.email}?subject=${subject}&body=${body}`;
      
      const emailLink = document.createElement('a');
      emailLink.href = mailtoUrl;
      emailLink.style.display = 'none';
      document.body.appendChild(emailLink);
      emailLink.click();
      document.body.removeChild(emailLink);
      
      return true;
    } catch (error) {
      console.error('Error opening email client:', error);
      
      try {
        const subject = encodeURIComponent('Message from Store Administration');
        const body = encodeURIComponent(messageText);
        const mailtoUrl = `mailto:${selectedSeller.email}?subject=${subject}&body=${body}`;
        window.location.href = mailtoUrl;
        return true;
      } catch (fallbackError) {
        console.error('Fallback email method also failed:', fallbackError);
        return false;
      }
    }
  };

  // Sort handler
  const handleSort = () => {
    setSortConfig(prev => ({
      key: 'registrationDate',
      direction: prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = () => {
    if (sortConfig.direction === 'asc') {
      return <ArrowUp className="h-4 w-4 ml-1" />;
    } else {
      return <ArrowDown className="h-4 w-4 ml-1" />;
    }
  };

  const getSortLabel = () => {
    return sortConfig.direction === 'asc' ? ' (Oldest First)' : ' (Newest First)';
  };

  const getSellerName = (s) => {
    if (s.firstName && s.lastName) return `${s.firstName} ${s.lastName}`;
    if (s.firstName) return s.firstName;
    if (s.businessName) return s.businessName;
    return "Unknown Seller";
  };

  const getSellerInitials = (s) => {
    const name = getSellerName(s);
    if (name === 'Unknown Seller') return 'S';
    return name.split(" ").map(w => w[0]).join("").toUpperCase().substring(0, 2);
  };

  const clearSearch = () => setSearchTerm("");

  const getSellerDocuments = (seller) => {
    const docs = [];
    const categories = seller.documents || {};
    const verify = seller.verificationStatus || {};

    for (const key in categories) {
      const docItem = categories[key];
      if (docItem?.fileUrl) {
        const documentKey = Object.keys(seller.documents).find(k => seller.documents[k] === docItem) || key;

        docs.push({
          key: documentKey,
          category: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim().replace(/_/g, ' '), 
          fileName: docItem.fileName,
          fileUrl: docItem.fileUrl,
          fileSize: docItem.fileSize,
          uploadDate: docItem.uploadDate  
            ? new Date(docItem.uploadDate).toLocaleDateString()  
            : "N/A",
          status: verify[key] || docItem.status || "pending"
        });
      }
    }
    return docs;
  };

  const renderDocStatus = (status) => {
    const s = status.toLowerCase();
    let color = "bg-gray-200 text-gray-700";
    let icon = <Clock className="h-4 w-4 mr-1" />;

    if (s === "approved" || s === 'verified') {
      color = "bg-green-100 text-green-700 border border-green-300";
      icon = <CheckCircle className="h-4 w-4 mr-1" />;
    } else if (s === "pending" || s === 'uploaded') {
      color = "bg-yellow-100 text-yellow-700 border border-yellow-300";
      icon = <Clock className="h-4 w-4 mr-1" />;
    } else if (s === "rejected") {
      color = "bg-red-100 text-red-700 border border-red-300";
      icon = <X className="h-4 w-4 mr-1" />;
    }

    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${color} capitalize`}
      >
        {icon} {s}
      </span>
    );
  };

  const renderStatusBadge = (status) => {
    const s = status ? status.toLowerCase() : 'pending';
    const base = "inline-flex px-3 py-1 text-sm font-bold rounded-full capitalize";
    let colorClass = '';

    if (s === 'active' || s === 'approved') {
      colorClass = 'bg-green-100 text-green-700 border border-green-300';
    } else if (s === 'pending') {
      colorClass = 'bg-yellow-100 text-yellow-700 border border-yellow-300';
    } else if (s === 'blocked') {
      colorClass = 'bg-red-100 text-red-700 border border-red-300';
    } else if (s === 'deleted') {
      colorClass = 'bg-gray-300 text-gray-700 border border-gray-400';
    } else {
      colorClass = 'bg-gray-100 text-gray-700 border border-gray-300';
    }
    
    return (
      <span className={`${base} ${colorClass}`}>
        {s}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 bg-white h-full min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
        <div className="flex items-center space-x-3">
          <Users className="h-8 w-8 text-red-600" />
          <h1 className="text-2xl font-bold text-gray-900">Sellers Management</h1>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-500" />
            </div>
            <input
              type="text"
              placeholder="Search sellers..."
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

          <div className="bg-red-600 px-4 py-2 rounded-lg">
            <span className="text-white font-semibold">
              Total: {filteredSellers.length}
              {searchTerm && filteredSellers.length !== sellers.length && (
                <span className="text-red-200 ml-1">
                  (of {sellers.length})
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {searchTerm && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
          <p className="text-red-800 text-sm">
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

      <div className="mb-4 p-3 bg-gray-100 border border-gray-300 rounded-lg flex justify-between items-center">
        <p className="text-gray-700 text-sm">
          Sorted by: <span className="font-semibold text-gray-900">
            Registration Date{getSortLabel()}
          </span>
        </p>
        <button
          onClick={handleSort}
          className="flex items-center text-red-600 hover:text-red-500 transition-colors text-sm font-medium"
        >
          <ArrowUpDown className="h-4 w-4 mr-1" />
          {sortConfig.direction === 'asc' ? 'Oldest First' : 'Newest First'}
        </button>
      </div>

      {/* --- Desktop Table View --- */}
      <div className="hidden md:block bg-white rounded-lg overflow-hidden shadow-xl border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Seller Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={handleSort}
                >
                  <div className="flex items-center">
                    Joined Date
                    {getSortIcon()}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSellers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-600">
                    <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-700">No sellers found</p>
                    <p className="text-sm text-gray-600">
                        {searchTerm ? "No sellers match your search criteria" : "Sellers data will appear here when available."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSellers.map((seller) => (
                  <tr key={seller.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-red-600 flex items-center justify-center">
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
                          <div className="text-xs text-gray-600">
                            ID: {seller.id.substring(0, 15)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {seller.email && (
                          <div className="flex items-center text-sm text-gray-700">
                            <Mail className="h-4 w-4 mr-2 text-red-500" />
                            {seller.email}
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
                    <td className="px-6 py-4 whitespace-nowrap">
                        {renderStatusBadge(seller.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-purple-600" />
                        {seller.registrationDate 
                          ? new Date(seller.registrationDate).toLocaleDateString()
                          : seller.createdAt 
                          ? (seller.createdAt.toDate 
                              ? new Date(seller.createdAt.toDate()).toLocaleDateString()
                              : new Date(seller.createdAt).toLocaleDateString()
                            )
                          : 'N/A'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-lg"
                          onClick={() => handleViewSeller(seller)}
                          title="View Details"
                        >
                          <User size={16} />
                        </button>
                        <button 
                          className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-lg"
                          onClick={() => handleMessageSeller(seller)}
                          title="Send Message"
                        >
                          <MessageSquare size={16} />
                        </button>
                        <button 
                          className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-lg"
                          onClick={() => handleApproveSeller(seller.id)}
                          title="Approve Seller"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                        <button 
                          className="p-2 bg-red-700 hover:bg-red-800 text-white rounded-lg transition-colors shadow-lg"
                          onClick={() => handleBlockSeller(seller.id)}
                          title="Block Seller"
                        >
                          <Shield size={16} />
                        </button>
                        {/* DELETE BUTTON ADDED */}
                        <button 
                          className="p-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg transition-colors shadow-lg"
                          onClick={() => openDeleteModal(seller)}
                          title="Delete Seller"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- Mobile Card View --- */}
      <div className="md:hidden space-y-4">
        {filteredSellers.length === 0 ? (
          <div className="bg-white rounded-lg p-6 text-center shadow-lg border border-gray-200">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-700">No sellers found</p>
          </div>
        ) : (
          filteredSellers.map((seller) => (
            <div key={seller.id} className="bg-white rounded-lg p-4 border border-gray-200 shadow-lg">
              <div className="flex items-center mb-4">
                <div className="h-12 w-12 rounded-full bg-red-600 flex items-center justify-center">
                  <span className="text-white font-medium text-lg">{getSellerInitials(seller)}</span>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{getSellerName(seller)}</h3>
                  {seller.businessName && <div className="text-sm text-red-600">{seller.businessName}</div>}
                  <p className="text-sm text-gray-600">ID: {seller.id.substring(0, 20)}...</p>
                </div>
                <div className="ml-2">
                  {renderStatusBadge(seller.status)}
                </div>
              </div>

              <div className="space-y-2 mb-4 border-t border-b border-gray-200 py-3">
                {seller.email && (<div className="flex items-center text-sm text-gray-700"><Mail className="h-4 w-4 mr-2 text-red-500" /><span className="break-all">{seller.email}</span></div>)}
                {seller.phone && (<div className="flex items-center text-sm text-gray-700"><Phone className="h-4 w-4 mr-2 text-green-600" /><span>{seller.phone}</span></div>)}
                <div className="flex items-center text-sm text-gray-700"><Calendar className="h-4 w-4 mr-2 text-purple-600" /><span>
                  {seller.registrationDate 
                    ? new Date(seller.registrationDate).toLocaleDateString()
                    : seller.createdAt 
                    ? (seller.createdAt.toDate 
                        ? new Date(seller.createdAt.toDate()).toLocaleDateString()
                        : new Date(seller.createdAt).toLocaleDateString()
                      )
                    : 'N/A'
                  }
                </span></div>
              </div>

              <div className="flex space-x-2">
                <button 
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors shadow-md flex items-center justify-center gap-2"
                  onClick={() => handleViewSeller(seller)}
                >
                  <User size={16} />
                  View
                </button>
                <button 
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors shadow-md flex items-center justify-center gap-2"
                  onClick={() => handleMessageSeller(seller)}
                >
                  <MessageSquare size={16} />
                  Message
                </button>
                <button 
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors shadow-md flex items-center justify-center gap-2"
                  onClick={() => handleApproveSeller(seller.id)}
                >
                  <CheckCircle2 size={16} />
                  Approve
                </button>
                <button 
                  className="flex-1 bg-red-700 hover:bg-red-800 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors shadow-md flex items-center justify-center gap-2"
                  onClick={() => handleBlockSeller(seller.id)}
                >
                  <Shield size={16} />
                  Block
                </button>
                {/* DELETE BUTTON ADDED FOR MOBILE */}
                <button 
                  className="flex-1 bg-gray-700 hover:bg-gray-800 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors shadow-md flex items-center justify-center gap-2"
                  onClick={() => openDeleteModal(seller)}
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- SELLER DETAIL MODAL --- */}
      {showModal && selectedSeller && (
        <div className="fixed inset-0 bg-gray-900/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[95vh] overflow-y-auto shadow-2xl border border-gray-300">
            <div className="sticky top-0 bg-white flex justify-between items-center p-6 border-b border-gray-200 z-10">
              <div className='flex items-center space-x-3'>
                <ShieldCheck className='h-7 w-7 text-red-600'/>
                <h2 className="text-2xl font-bold text-gray-900">Seller Profile & Verification</h2>
              </div>
              <button 
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              
              {/* Profile Card & Status */}
              <div className="bg-gray-50 p-6 rounded-lg shadow-inner flex flex-col md:flex-row justify-between items-start md:items-center border border-gray-200">
                <div className="flex items-center space-x-4 mb-4 md:mb-0">
                  <div className="flex-shrink-0 h-16 w-16 rounded-full bg-red-600 flex items-center justify-center">
                    <span className="text-white font-semibold text-2xl">
                      {getSellerInitials(selectedSeller)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{getSellerName(selectedSeller)}</h3>
                    {selectedSeller.businessName && (
                      <p className="text-md font-medium text-red-600">{selectedSeller.businessName}</p>
                    )}
                    <p className="text-sm text-gray-600 font-mono mt-1">ID: {selectedSeller.id}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <span className='text-sm text-gray-600'>Current Status:</span>
                  {renderStatusBadge(selectedSeller.status)}
                </div>
              </div>

              {/* Contact and Location Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Contact */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                  <h4 className="text-lg font-semibold text-red-600 flex items-center mb-2"><Mail className='h-5 w-5 mr-2'/> Contact</h4>
                  <div className='space-y-2'>
                    <p className="text-sm text-gray-600">Email:</p>
                    <p className="text-gray-900 font-medium break-all">{selectedSeller.email || 'N/A'}</p>
                    <p className="text-sm text-gray-600 pt-2 border-t border-gray-200">Phone:</p>
                    <p className="text-gray-900 font-medium">{selectedSeller.phone || 'N/A'}</p>
                  </div>
                </div>
                
                {/* Location */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                  <h4 className="text-lg font-semibold text-purple-600 flex items-center mb-2"><MapPin className='h-5 w-5 mr-2'/> Location</h4>
                  <p className="text-gray-900 font-medium">
                    {selectedSeller.city}, {selectedSeller.state} {selectedSeller.pincode}
                  </p>
                  <p className="text-sm text-gray-600 border-t border-gray-200 pt-2">Address:</p>
                  <p className="text-gray-900 text-sm">{selectedSeller.address || 'N/A'}</p>
                </div>

                {/* Financial Info Snippet */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                  <h4 className="text-lg font-semibold text-yellow-600 flex items-center mb-2"><DollarSign className='h-5 w-5 mr-2'/> Financials</h4>
                  <p className="text-sm text-gray-600">GST Number:</p>
                  <p className="text-gray-900 font-medium break-all">{selectedSeller.gstNumber || 'N/A'}</p>
                  <p className="text-sm text-gray-600 pt-2 border-t border-gray-200">PAN Number:</p>
                  <p className="text-gray-900 font-medium">{selectedSeller.panNumber || 'N/A'}</p>
                </div>
              </div>

              {/* DOCUMENTS SECTION - TABLE VIEW */}
              <div>
                <h3 className="text-xl font-bold text-yellow-600 mb-4 flex items-center"><FileText className='h-6 w-6 mr-2'/> Documents for Verification</h3>
                <div className="overflow-x-auto bg-gray-50 rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Document Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">File Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {getSellerDocuments(selectedSeller).length > 0 ? (
                        getSellerDocuments(selectedSeller).map((doc) => (
                          <tr key={doc.fileUrl} className="hover:bg-gray-100 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{doc.category}</td>
                            <td className="px-4 py-3 whitespace-nowrap">{renderDocStatus(doc.status)}</td>
                            <td className="px-4 py-3 whitespace-nowrap space-x-2">
                                <a 
                                    href={doc.fileUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-red-600 hover:text-red-500 text-sm font-medium transition-colors inline-flex items-center"
                                >
                                    View File <ExternalLink className='h-3 w-3 ml-1'/>
                                </a>
                                <button 
                                    className='text-green-600 hover:text-green-500 text-sm font-medium ml-2'
                                    onClick={() => handleVerifyDocument(selectedSeller.id, doc.key, 'verified')}
                                >
                                    Verify
                                </button>
                                <button 
                                    className='text-red-700 hover:text-red-600 text-sm font-medium'
                                    onClick={() => handleVerifyDocument(selectedSeller.id, doc.key, 'rejected')}
                                >
                                    Reject
                                </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                            <td colSpan="3" className="px-4 py-6 text-center text-gray-600">
                                No documents uploaded yet.
                            </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* SELLER PRODUCTS SECTION */}
              <div>
                <h3 className="text-xl font-bold text-pink-600 mb-4 flex items-center">
                  <Package className='h-6 w-6 mr-2'/> 
                  Seller Products ({loadingProducts ? '...' : sellerProducts.length})
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 min-h-[150px]">
                    
                    {sellerProducts.length > 0 && (
                      <div className="relative mb-4">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search className="h-4 w-4 text-gray-500" />
                        </div>
                        <input
                          type="text"
                          placeholder="Search products by name or category..."
                          value={productSearchTerm}
                          onChange={(e) => setProductSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-10 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500 text-sm"
                        />
                        {productSearchTerm && (
                          <button
                            onClick={() => setProductSearchTerm("")}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-900"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}

                    {loadingProducts ? (
                        <div className="flex items-center justify-center h-full text-pink-600">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mr-3"></div>
                            Loading Products...
                        </div>
                    ) : sellerProducts.length > 0 ? (
                        <div className='overflow-hidden'>
                            {productSearchTerm && (
                                <p className="text-gray-600 text-sm mb-2">
                                    Showing **{filteredSellerProducts.length}** product{filteredSellerProducts.length !== 1 ? 's' : ''} for "{productSearchTerm}"
                                </p>
                            )}
                            
                            <div className="grid grid-cols-12 text-xs font-semibold uppercase text-gray-600 pb-2 border-b border-gray-300">
                                <span className="col-span-6">Product Name</span>
                                <span className="col-span-3">Category</span>
                                <span className="col-span-3 text-right">Price</span>
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 pt-2">
                                {filteredSellerProducts.length === 0 ? (
                                    <p className="text-gray-600 text-center pt-4">No products match your search.</p>
                                ) : (
                                    filteredSellerProducts.map((product) => ( 
                                        <div key={product.id} className="grid grid-cols-12 items-center bg-white p-3 rounded-md hover:bg-gray-100 transition-colors border border-gray-200">
                                            <p className="col-span-6 text-gray-900 font-medium truncate text-sm">
                                                {product.name?.name || product.name || 'Untitled Product'}
                                            </p>
                                            <p className="col-span-3 text-gray-700 text-sm">
                                                {product.category?.name || product.category || 'N/A'}
                                            </p>
                                            <div className="col-span-3 flex justify-end items-center">
                                                <DollarSign className='h-4 w-4 text-green-600 mr-1' />
                                                <span className="text-green-600 font-semibold text-sm">
                                                    {typeof product.price === 'number' ? product.price.toFixed(2) : 'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-600 text-center pt-8">This seller has no products listed yet.</p>
                    )}
                </div>
              </div>

              {/* Action Buttons (Footer) */}
              <div className="flex space-x-4 pt-4 border-t border-gray-200">
                <button 
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-bold transition-transform transform hover:scale-[1.01] shadow-lg flex items-center justify-center gap-2"
                  onClick={() => handleMessageSeller(selectedSeller)}
                >
                  <MessageSquare size={20} />
                  Send Message
                </button>
                <button 
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-bold transition-transform transform hover:scale-[1.01] shadow-lg flex items-center justify-center gap-2"
                  onClick={() => {
                    handleApproveSeller(selectedSeller.id);
                    closeModal();
                  }}
                >
                  <CheckCircle2 size={20} />
                  Approve Seller
                </button>
                <button 
                  className="flex-1 bg-red-700 hover:bg-red-800 text-white py-3 px-4 rounded-lg font-bold transition-transform transform hover:scale-[1.01] shadow-lg flex items-center justify-center gap-2"
                  onClick={() => {
                    handleBlockSeller(selectedSeller.id);
                    closeModal();
                  }}
                >
                  <Shield size={20} />
                  Block Seller
                </button>
                {/* DELETE BUTTON ADDED IN MODAL */}
                <button 
                  className="flex-1 bg-gray-700 hover:bg-gray-800 text-white py-3 px-4 rounded-lg font-bold transition-transform transform hover:scale-[1.01] shadow-lg flex items-center justify-center gap-2"
                  onClick={() => openDeleteModal(selectedSeller)}
                >
                  <Trash2 size={20} />
                  Delete Seller
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {showDeleteModal && selectedSeller && (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full border border-gray-300 shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    Delete Seller
                  </>
                )}
              </h2>
              {!deleting && (
                <button
                  onClick={closeDeleteModal}
                  className="text-gray-500 hover:text-gray-900 transition-colors p-2 hover:bg-gray-100 rounded-xl"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            <div className="p-6">
              {!deleting ? (
                <>
                  <div className="mb-6">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                      <AlertTriangle className="h-6 w-6 text-red-600 mb-2" />
                      <p className="text-red-700 font-semibold mb-2">Warning: This action cannot be undone!</p>
                      <p className="text-sm text-red-600">
                        The seller will be moved to archived records and their products will be removed.
                      </p>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-gray-700 mb-2">
                        You are about to delete: 
                        <span className="font-bold text-gray-900 ml-1">
                          {getSellerName(selectedSeller)}
                        </span>
                      </p>
                      {selectedSeller.businessName && (
                        <p className="text-red-600 font-medium">{selectedSeller.businessName}</p>
                      )}
                      <p className="text-sm text-gray-600 mt-1">ID: {selectedSeller.id}</p>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-600 mb-2">
                        Reason for deletion (optional):
                      </label>
                      <textarea
                        value={deleteReason}
                        onChange={(e) => setDeleteReason(e.target.value)}
                        className="w-full bg-gray-100 text-gray-900 p-3 rounded-lg border border-gray-300 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 resize-none text-sm"
                        rows="3"
                        placeholder="Enter reason for deletion..."
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={closeDeleteModal}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-900 px-6 py-3 rounded-xl transition-colors font-semibold"
                      disabled={deleting}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDeleteSeller(selectedSeller.id, deleteReason || 'No reason provided')}
                      className="bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white px-6 py-3 rounded-xl transition-all duration-200 font-semibold shadow-lg flex items-center gap-2"
                      disabled={deleting}
                    >
                      <Archive size={18} />
                      Archive Seller
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                  <p className="text-gray-900 font-semibold">Archiving seller...</p>
                  <p className="text-gray-600 text-sm mt-2">Moving to deleted_sellers collection</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- MESSAGE MODAL --- */}
      {showMessageModal && selectedSeller && (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full border border-gray-300 shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Send Message to Seller</h2>
              <button
                onClick={closeMessageModal}
                className="text-gray-500 hover:text-gray-900 transition-colors p-2 hover:bg-gray-100 rounded-xl"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6 bg-gray-100 rounded-xl p-4 border border-gray-200">
                <label className="block text-sm font-medium text-gray-600 mb-2">Seller</label>
                <p className="text-gray-900 font-semibold">{getSellerName(selectedSeller)}</p>
                {selectedSeller.businessName && (
                  <p className="text-red-600 text-sm">{selectedSeller.businessName}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  {selectedSeller.phone && (
                    <span className="flex items-center gap-1">
                      <Smartphone size={14} />
                      {selectedSeller.phone}
                    </span>
                  )}
                  {selectedSeller.email && (
                    <span className="flex items-center gap-1">
                      <Mail size={14} />
                      {selectedSeller.email}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-600 mb-3">Message Content</label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full bg-gray-100 text-gray-900 p-4 rounded-xl border border-gray-300 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 resize-none"
                  rows="4"
                  placeholder="Type your message here..."
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-600 mb-3">Send Via</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleSendConfirmation('whatsapp')}
                    disabled={!selectedSeller.phone}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl font-semibold transition-all duration-200 ${
                      selectedSeller.phone 
                        ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <MessageCircle size={18} />
                    WhatsApp
                  </button>
                  <button
                    onClick={() => handleSendConfirmation('gmail')}
                    disabled={!selectedSeller.email}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl font-semibold transition-all duration-200 ${
                      selectedSeller.email 
                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Mail size={18} />
                    Gmail
                  </button>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeMessageModal}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-900 px-6 py-3 rounded-xl transition-colors font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MESSAGE CONFIRMATION MODAL --- */}
      {showConfirmationModal && selectedSeller && (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full border border-gray-300 shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    Confirm Send
                  </>
                )}
              </h2>
              {!sending && (
                <button
                  onClick={closeConfirmationModal}
                  className="text-gray-500 hover:text-gray-900 transition-colors p-2 hover:bg-gray-100 rounded-xl"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            <div className="p-6">
              {!sending ? (
                <>
                  <div className="mb-6">
                    <p className="text-gray-700 mb-4">
                      Are you sure you want to send this message via{' '}
                      <span className="font-semibold text-gray-900">
                        {selectedChannel === 'whatsapp' ? 'WhatsApp' : selectedChannel === 'gmail' ? 'Gmail' : 'Email'}
                      </span>?
                    </p>
                    <div className="bg-gray-100 rounded-xl p-4 border border-gray-300">
                      <label className="block text-sm font-medium text-gray-600 mb-2">Message Preview</label>
                      <p className="text-gray-900 text-sm whitespace-pre-wrap">{messageText}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={closeConfirmationModal}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-900 px-6 py-3 rounded-xl transition-colors font-semibold"
                      disabled={sending}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendMessage}
                      className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-3 rounded-xl transition-all duration-200 font-semibold shadow-lg flex items-center gap-2"
                      disabled={sending}
                    >
                      <Send size={18} />
                      Send Message
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                  <p className="text-gray-900 font-semibold">Message sent successfully!</p>
                  <p className="text-gray-600 text-sm mt-2">Redirecting you back...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>    
  );
};

export default Sellers;