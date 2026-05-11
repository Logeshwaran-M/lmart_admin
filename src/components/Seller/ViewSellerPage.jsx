// import React, { useState, useEffect } from 'react';
// import { Link } from 'react-router-dom';
// import { 
//     FiSearch, FiUsers, FiEye, FiEdit2, FiTrash2, 
//     FiMail, FiPhone, FiRefreshCw, FiAlertTriangle, FiCheckCircle, FiClock, FiXCircle 
// } from 'react-icons/fi'; // Added FiClock, FiXCircle for status icons

// // 🚨 IMPORTANT: Ensure this path is correct for your project
// import { db } from "../../../firerbase"; 
// import {
//     collection,
//     getDocs,
//     doc,
//     deleteDoc,
//     getDoc,
//     setDoc,
// } from "firebase/firestore";

// // Helper to format date (assuming the 'createdAt' field is a Firestore Timestamp)
// const formatDate = (timestamp) => {
//     if (!timestamp) return 'N/A';
//     try {
//         // Convert Firestore Timestamp to Date object
//         const date = timestamp.toDate();
//         return date.toLocaleDateString('en-IN', {
//             year: 'numeric',
//             month: 'short',
//             day: 'numeric',
//         });
//     } catch (e) {
//         // Fallback for non-timestamp/malformed dates
//         return 'N/A'; 
//     }
// };

// // --- Skeleton Loader Component (Attractive Feature) ---
// const SkeletonRow = () => (
//     <tr className="border-b animate-pulse">
//         {[...Array(7)].map((_, i) => (
//             <td key={i} className="p-4">
//                 <div className="h-4 bg-gray-200 rounded w-full"></div>
//             </td>
//         ))}
//     </tr>
// );
// // -----------------------------------------------------------

// export default function ViewSellersPage() {
//     const [searchTerm, setSearchTerm] = useState('');
//     const [sellers, setSellers] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);

//     // --- Data Fetching Logic ---
//     useEffect(() => {
//         fetchSellers();
//     }, []);

//     const fetchSellers = async () => {
//         setLoading(true);
//         setError(null);
//         try {
//             // CRITICAL: Use the correct collection name ("sellers")
//             const querySnapshot = await getDocs(collection(db, "sellers"));
//             const fetchedSellers = querySnapshot.docs.map(doc => ({
//                 id: doc.id,
//                 ...doc.data(),
//                 // Ensure a default status is set if not present in Firestore
//                 status: doc.data().status || 'Pending Setup' 
//             }));
//             setSellers(fetchedSellers);
//         } catch (err) {
//             console.error("Error fetching sellers:", err);
//             setError("Failed to load sellers. Check your Firebase connection and rules for the 'sellers' collection.");
//         } finally {
//             setLoading(false);
//         }
//     };
    
//     // --- Archive/Delete Logic ---
//     const handleDelete = async (id, name) => {
//         if (!window.confirm(`Are you sure you want to permanently ARCHIVE seller "${name}" (ID: ${id})? They will be moved to the 'deleted_sellers' collection.`)) {
//             return; // User cancelled
//         }

//         setLoading(true);
//         try {
//             // 1. Get the original seller document data
//             const sellerRef = doc(db, "sellers", id);
//             const sellerSnap = await getDoc(sellerRef);

//             if (!sellerSnap.exists()) {
//                 throw new Error("Seller document not found in active collection.");
//             }

//             const sellerData = sellerSnap.data();

//             // 2. Add the document to the 'deleted_sellers' collection
//             const deletedSellerRef = doc(db, "deleted_sellers", id);
//             await setDoc(deletedSellerRef, {
//                 ...sellerData,
//                 deletedBy: "AdminUser", 
//                 deletedAt: new Date(),
//             });

//             // 3. Delete the document from the active 'sellers' collection
//             await deleteDoc(sellerRef);
            
//             // 4. Update local state
//             setSellers(prevSellers => prevSellers.filter(s => s.id !== id));
//             console.log(`Seller ${id} successfully archived to deleted_sellers.`);

//         } catch (err) {
//             console.error("Error archiving seller:", err);
//             setError(`Failed to archive seller: ${err.message}. Please check console for details.`);
//         } finally {
//             setLoading(false);
//         }
//     };

//     // Apply search term filter, including searching by status
//     const filteredSellers = sellers.filter(seller =>
//         seller.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         seller.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         seller.phone?.toString().includes(searchTerm) ||
//         seller.id.toString().includes(searchTerm) ||
//         seller.status?.toLowerCase().includes(searchTerm.toLowerCase()) 
//     );
    
//     // --- Seller Row Component ---
//     const SellerRow = ({ seller }) => {
        
//         // --- NEW STATUS LOGIC ---
//         const status = seller.status || 'Pending';
//         let statusClass = 'bg-gray-100 text-gray-700 border-gray-300';
//         let statusIcon = <FiAlertTriangle className="w-3 h-3 mr-1" />;

//         switch (status.toLowerCase()) {
//             case 'approved':
//             case 'active':
//                 statusClass = 'bg-green-100 text-green-700 border-green-300';
//                 statusIcon = <FiCheckCircle className="w-3 h-3 mr-1" />;
//                 break;
//             case 'pending':
//             case 'pending_review':
//                 statusClass = 'bg-yellow-100 text-yellow-700 border-yellow-300';
//                 statusIcon = <FiClock className="w-3 h-3 mr-1" />;
//                 break;
//             case 'blocked':
//             case 'rejected':
//                 statusClass = 'bg-red-100 text-red-700 border-red-300';
//                 statusIcon = <FiXCircle className="w-3 h-3 mr-1" />;
//                 break;
//             default:
//                 // Default to a neutral/pending state
//                 statusClass = 'bg-blue-100 text-blue-700 border-blue-300';
//                 statusIcon = <FiUsers className="w-3 h-3 mr-1" />;
//                 break;
//         }

//         return (
//             <tr className="border-b border-gray-100 group transition-colors duration-150 hover:bg-blue-50/50">
//                 {/* SELLER ID */}
//                 <td className="p-4 text-sm font-medium">
//                     <span className="text-gray-700 font-semibold">#{seller.id.substring(0, 8)}...</span>
//                 </td>

//                 {/* NAME */}
//                 <td className="p-4 text-sm font-bold text-gray-900">{seller.name || 'N/A'}</td>

//                 {/* CONTACT INFO */}
//                 <td className="p-4 text-xs">
//                     <div className="flex items-center space-x-1 text-blue-600 font-medium">
//                         <FiMail className="w-3 h-3" />
//                         <span>{seller.email || 'N/A'}</span>
//                     </div>
//                     <div className="flex items-center space-x-1 text-gray-500 mt-1">
//                         <FiPhone className="w-3 h-3" />
//                         <span>{seller.phone || 'N/A'}</span>
//                     </div>
//                 </td>
                
//                 {/* STATUS (NEW COLUMN) */}
//                 <td className="p-4 text-sm">
//                     <div className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border shadow-sm ${statusClass}`}>
//                         {statusIcon}
//                         {status.replace(/_/g, ' ')} {/* Display status with spaces */}
//                     </div>
//                 </td>


//                 {/* LOCATION/CITY */}
//                 <td className="p-4 text-xs font-semibold text-purple-600">
//                     {seller.city || 'N/A'}
//                 </td>
                
//                 {/* DATE ADDED */}
//                 <td className="p-4 text-xs text-gray-500">
//                     {formatDate(seller.createdAt)}
//                 </td>

//                 {/* ACTIONS */}
//                 <td className="p-4 flex space-x-2">
//                     {/* View */}
//                     <Link
//                         to={`/sellers/view/${seller.id}`}
//                         className="p-2 text-white bg-blue-500 hover:bg-blue-600 rounded-full transition-all duration-200 ring-2 ring-transparent group-hover:ring-blue-300"
//                         title="View Details"
//                     >
//                         <FiEye className="w-4 h-4" />
//                     </Link>
//                     {/* Edit */}
//                     <Link
//                         to={`/sellers/edit/${seller.id}`}
//                         className="p-2 text-white bg-orange-500 hover:bg-orange-600 rounded-full transition-all duration-200 ring-2 ring-transparent group-hover:ring-orange-300"
//                         title="Edit Seller"
//                     >
//                         <FiEdit2 className="w-4 h-4" />
//                     </Link>
//                     {/* Archive/Delete */}
//                     <button
//                         onClick={() => handleDelete(seller.id, seller.name)}
//                         className="p-2 text-white bg-red-600 hover:bg-red-700 rounded-full transition-all duration-200 ring-2 ring-transparent group-hover:ring-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
//                         title="Archive/Delete Seller"
//                         disabled={loading}
//                     >
//                         <FiTrash2 className="w-4 h-4" />
//                     </button>
//                 </td>
//             </tr>
//         );
//     };

//     return (
//         <div className="flex-1 p-6 lg:p-8 bg-gray-100 min-h-screen">
//             <div className="sellers-container bg-white rounded-xl shadow-2xl p-6 transition-transform hover:shadow-3xl"> 

//                 {/* Header and Add Button */}
//                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-gray-200 mb-6">
//                     <h2 className="text-3xl font-extrabold text-gray-900 flex items-center mb-3 sm:mb-0">
//                         <FiUsers className="w-7 h-7 mr-3 text-blue-600" /> 
//                         Active Sellers 
//                         <span className="ml-3 px-3 py-1 text-sm font-bold text-white bg-blue-500 rounded-full shadow-md">
//                             {filteredSellers.length} / {sellers.length}
//                         </span>
//                     </h2>
//                     <Link 
//                         to="/sellers/add" 
//                         className="px-6 py-2 text-base font-semibold bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
//                     >
//                         + Add New Seller
//                     </Link>
//                 </div>

//                 {/* Search Bar */}
//                 <div className="mb-8 relative">
//                     <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
//                     <input
//                         type="text"
//                         placeholder="Search name, email, phone, ID, or status across all {sellers.length} records..."
//                         value={searchTerm}
//                         onChange={(e) => setSearchTerm(e.target.value)}
//                         className="w-full p-4 pl-12 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-200 text-sm shadow-inner"
//                         disabled={loading}
//                     />
//                 </div>

//                 {/* Loading / Error State */}
//                 {loading && (
//                     <div className="p-10">
//                         {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
//                     </div>
//                 )}

//                 {error && (
//                     <div className="p-4 mb-6 bg-red-50 border-l-4 border-red-600 text-red-800 flex items-center rounded-lg shadow-md">
//                         <FiAlertTriangle className="w-6 h-6 mr-3 flex-shrink-0" />
//                         <div>
//                             <p className="font-bold">Database Error</p>
//                             <p className="text-sm">{error}</p>
//                         </div>
//                         <button onClick={fetchSellers} className="ml-auto px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
//                             Retry Load
//                         </button>
//                     </div>
//                 )}

//                 {/* Sellers Table */}
//                 <div className="overflow-x-auto">
//                     <table className="min-w-full divide-y divide-gray-200">
//                         <thead className="bg-gray-100">
//                             <tr>
//                                 {/* Updated Headers to include 'STATUS' */}
//                                 {['ID', 'NAME', 'CONTACT INFO', 'STATUS', 'CITY', 'JOINED', 'ACTIONS'].map(header => (
//                                     <th
//                                         key={header}
//                                         className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider"
//                                     >
//                                         {header}
//                                     </th>
//                                 ))}
//                             </tr>
//                         </thead>
//                         <tbody className="bg-white divide-y divide-gray-200">
//                             {!loading && filteredSellers.length > 0 ? (
//                                 filteredSellers.map(seller => <SellerRow key={seller.id} seller={seller} />)
//                             ) : (
//                                 !loading && (
//                                     <tr>
//                                         <td colSpan="7" className="p-10 text-center text-lg text-gray-500 bg-gray-50">
//                                             {searchTerm ? "🔍 No sellers found matching your search term. Try a different query." : "😔 No sellers available in the database. Click 'Add New Seller' to begin."}
//                                         </td>
//                                     </tr>
//                                 )
//                             )}
//                         </tbody>
//                     </table>
//                 </div>
//             </div>
//         </div>
//     );
// }