import React, { useState, useEffect, useMemo } from "react";
import { 
    Search,
    Download,
    Users,
    Loader,
    Mail,
    Phone,
    IdCard,
    Gift,
    ChevronDown,
    ChevronUp,
    Ban, 
    CheckCircle,
    AlertTriangle,
    Shield,
  Trash2
} from 'lucide-react';


// --- Firebase/Firestore Imports ---
import { db } from "../../firebase"; 
import { 
  collection, 
  onSnapshot,
  orderBy,
  query,
  doc,
  setDoc,          // ✅ ADD THIS
  deleteDoc,      
  updateDoc   
} from "firebase/firestore";


// Define the columns without fixed widths, using flexible widths where possible (e.g., Email is wider)
const COLUMNS = [
    { key: "name", label: "Customer Name", icon: Users, width: "w-[15%]" },
    { key: "email", label: "Email", icon: Mail, width: "w-[25%]" }, // Largest width to hold emails
    { key: "contactNo", label: "Contact", icon: Phone, width: "w-[15%]" },
    { key: "customerId", label: "Customer ID", icon: IdCard, width: "w-[15%]" },
    { key: "referralCode", label: "Referral", icon: Gift, width: "w-[15%]" },
    { key: "isBlocked", label: "Status", icon: CheckCircle, width: "w-[10%]" }
];
// Action column will take the remaining width (approx 5%)

// --- Main Component ---
const CustomerDirectory = () => {
    
    // Internal States for Data and UI Management
    const [deleteInProgress, setDeleteInProgress] = useState(null);

    const [customers, setCustomers] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true); 
    const [error, setError] = useState(null);
    const [sortField, setSortField] = useState("customerId");
    const [sortDirection, setSortDirection] = useState("desc");
    const [updateInProgress, setUpdateInProgress] = useState(null); 
    const [showDeleteModal, setShowDeleteModal] = useState(false);
const [selectedCustomerId, setSelectedCustomerId] = useState(null);


    // 1. FIREBASE DATA FETCHING (Real-time listener)
    useEffect(() => {
        try {
            const q = query(
                collection(db, "users"),
                orderBy("customerId", "desc") 
            );

            const unsubscribe = onSnapshot(
                q,
                (snapshot) => {
                    const list = snapshot.docs.map((doc) => ({
                        id: doc.id, 
                        ...doc.data()
                    }));

                    setCustomers(list);
                    setLoading(false);
                },
                (err) => {
                    console.error("Error fetching users:", err);
                    setError("Failed to load customers. Check Firestore connection/rules.");
                    setLoading(false);
                }
            );

            return () => unsubscribe();
        } catch (err) {
            console.error("Firestore setup error:", err);
            setError("Failed to initialize Firestore.");
            setLoading(false);
        }
    }, []);
const deleteCustomer = async () => {
  if (!selectedCustomerId) return;

  setDeleteInProgress(selectedCustomerId);
  setError(null);

  try {
    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer) throw new Error("Customer not found");

    // Save to deletedCustomers
    await setDoc(doc(db, "deletedCustomers", selectedCustomerId), {
      ...customer,
      originalId: selectedCustomerId,
      deletedAt: new Date(),
      deletedBy: "admin"
    });

    // Remove from users
    await deleteDoc(doc(db, "users", selectedCustomerId));

    setShowDeleteModal(false);
    setSelectedCustomerId(null);
  } catch (err) {
    console.error(err);
    setError("Failed to archive customer");
  } finally {
    setDeleteInProgress(null);
  }
};



    // 2. FIREBASE BLOCK STATUS TOGGLE FUNCTION
    const toggleBlockStatus = async (customerId, currentStatus) => {
        setUpdateInProgress(customerId);
        setError(null);
        
        try {
            const customerRef = doc(db, "users", customerId);
            const newStatus = !currentStatus;
            
            await updateDoc(customerRef, {
                isBlocked: newStatus,
            });
            
        } catch (err) {
            console.error("Error updating block status:", err);
            setError(`Failed to update customer status: ${err.message}`);
        } finally {
            setUpdateInProgress(null);
        }
    };
    
    // 3. SEARCH & SORT LOGIC (Memoized for performance)
    const filteredAndSortedCustomers = useMemo(() => {
        const s = searchTerm.toLowerCase();
        
        const filtered = customers.filter((customer) => {
            return (
                (customer.name || "").toLowerCase().includes(s) ||
                (customer.email || "").toLowerCase().includes(s) ||
                (customer.contactNo || "").toLowerCase().includes(s) ||
                (customer.customerId || "").toLowerCase().includes(s)
            );
        });

        return filtered.sort((a, b) => {
            const aValue = a[sortField] || "";
            const bValue = b[sortField] || "";
            
            if (sortDirection === "asc") {
                return aValue.toString().localeCompare(bValue.toString());
            } else {
                return bValue.toString().localeCompare(aValue.toString());
            }
        });
    }, [customers, searchTerm, sortField, sortDirection]);

    // 4. UI HANDLERS & HELPERS

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleSortClick = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    const SortIcon = ({ field }) => {
        if (sortField !== field) return <ChevronDown className="w-4 h-4 opacity-50" />;
        return sortDirection === "asc" ? 
            <ChevronUp className="w-4 h-4 text-indigo-600" /> : 
            <ChevronDown className="w-4 h-4 text-indigo-600" />;
    };

    const getStatusBadge = (isBlocked) => {
        if (isBlocked) {
            return (
                <span className="inline-flex items-center gap-1 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    <Ban className="w-3 h-3" /> Blocked
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                <CheckCircle className="w-3 h-3" /> Active
            </span>
        );
    };
    
    const exportToCSV = () => {
        const headers = ["Customer ID", "Name", "Email", "Contact No", "Referral Code", "Status"];
        const csvData = filteredAndSortedCustomers.map(customer => [
            customer.customerId || "",
            customer.name || "",
            customer.email || "",
            customer.contactNo || "",
            customer.referralCode || "",
            customer.isBlocked ? "Blocked" : "Active" 
        ]);

        const csvContent = [
            headers.join(","),
            ...csvData.map(row => row.map(field => `"${field}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement("a");
        a.href = url;
        a.download = "customer_directory.csv"; 
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };


    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Main Card Container */}
            <div className="max-w-full mx-auto bg-white rounded-xl shadow-lg border border-gray-100">

                {/* --- HEADER & CONTROLS --- */}
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between">
                    
                    <div className="flex items-center mb-4 md:mb-0">
                        <Users className="w-6 h-6 text-indigo-600 mr-3" />
                        <h1 className="text-xl font-bold text-gray-900">
                            Customer Directory ({customers.length})
                        </h1>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                placeholder="Search by name, email, or ID..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                            />
                        </div>

                        <button
                            onClick={exportToCSV} 
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition-colors flex-shrink-0"
                        >
                            <Download className="w-5 h-5" />
                            Export CSV
                        </button>
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="p-4 bg-red-50 border border-red-300 text-red-800 rounded-b-xl flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                )}

                {/* --- TABLE STRUCTURE (FULLY RESPONSIVE - NO SCROLL) --- */}
                
                {/* Removed overflow-x-auto from here */}
                <div> 
                    {loading ? (
                        <div className="p-16 text-center">
                            <Loader className="w-10 h-10 animate-spin mx-auto text-indigo-500" />
                            <p className="mt-4 text-lg text-gray-600 font-medium">Loading customers...</p>
                        </div>
                    ) : filteredAndSortedCustomers.length === 0 ? (
                        <div className="p-10 text-center text-gray-500">
                            <Users className="w-10 h-10 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg font-medium">No customers found matching your criteria.</p>
                        </div>
                    ) : (
                        // table-fixed allows column widths (w-[...]) to be respected and shrink/stretch
                        <table className="w-full table-fixed">
                            <thead className="bg-gray-50 border-t border-gray-200">
                                <tr>
                                    {COLUMNS.map(({ key, label, icon: Icon, width }) => (
                                        <th 
                                            key={key}
                                            className={`p-4 text-left text-xs font-bold tracking-wider text-gray-600 uppercase cursor-pointer hover:bg-gray-100 ${width}`}
                                            onClick={() => handleSortClick(key)}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <Icon className="w-4 h-4 text-indigo-500" />
                                                <span className="truncate">{label}</span>
                                                <SortIcon field={key} />
                                            </div>
                                        </th>
                                    ))}
                                    {/* Action column takes the remaining space */}
                                    <th className="p-4 text-xs font-bold tracking-wider text-center text-gray-600 uppercase w-[10%]">ACTION</th> 
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                                {filteredAndSortedCustomers.map((customer) => (
                                    <tr 
  key={customer.id} 
  className={`group hover:bg-indigo-50/20 transition-colors ${customer.isBlocked ? 'bg-red-50' : ''}`}
>

                                        
                                        {/* Name (w-[15%]) */}
                                        <td className="p-4 font-medium text-gray-900 truncate">{customer.name || "N/A"}</td>

                                        {/* Email (w-[25%]) - Critical: Must be truncated to prevent overflow */}
                                        <td className="p-4 text-sm text-gray-600 truncate">{customer.email || "N/A"}</td>
                                        
                                        {/* Contact (w-[15%]) */}
                                        <td className="p-4 text-sm text-gray-600 truncate">{customer.contactNo || "N/A"}</td>

                                        {/* Customer ID (w-[15%]) */}
                                        <td className="p-4">
                                            <span className="bg-indigo-50 px-3 py-1 rounded-full text-indigo-700 text-xs font-mono font-medium truncate inline-block max-w-full">
                                                {customer.customerId || "—"}
                                            </span>
                                        </td>

                                        {/* Referral Code (w-[15%]) - Critical: Must be truncated */}
                                        <td className="p-4 text-sm text-gray-600 truncate">
                                            {customer.referralCode || "—"}
                                        </td>

                                        {/* Status (w-[10%]) */}
                                        <td className="p-4 text-center">
                                            {getStatusBadge(customer.isBlocked)}
                                        </td>
                                        
<td className="p-4 text-center">
  <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">

    {/* BLOCK / UNBLOCK */}
    <button
      onClick={() => toggleBlockStatus(customer.id, customer.isBlocked)}
      disabled={updateInProgress === customer.id}
      title={customer.isBlocked ? "Unblock Customer" : "Block Customer"}
      className={`p-2 rounded-lg text-white shadow-md transition-colors ${
        customer.isBlocked
          ? "bg-blue-600 hover:bg-blue-700"
          : "bg-red-600 hover:bg-red-700"
      } ${updateInProgress === customer.id ? "opacity-60 cursor-not-allowed" : ""}`}
    >
      {updateInProgress === customer.id ? (
        <Loader className="w-4 h-4 animate-spin" />
      ) : (
        <Shield className="w-4 h-4" />
      )}
    </button>

    {/* DELETE */}
    <button
      onClick={() => {
        setSelectedCustomerId(customer.id);
        setShowDeleteModal(true);
      }}
      title="Delete Customer"
      className="p-2 rounded-lg bg-gray-800 hover:bg-black text-white shadow-md transition-colors"
    >
      <Trash2 className="w-4 h-4" />
    </button>

  </div>
</td>


                                        
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                {showDeleteModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
                Delete Customer
            </h2>
            <p className="text-sm text-gray-600 mb-6">
                This action cannot be undone. Do you want to continue?
            </p>

            <div className="flex justify-end gap-3">
                <button
                    onClick={() => {
                        setShowDeleteModal(false);
                        setSelectedCustomerId(null);
                    }}
                    className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-100"
                >
                    Cancel
                </button>

                <button
                    onClick={deleteCustomer}
                    disabled={deleteInProgress === selectedCustomerId}
                    className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center gap-2"
                >
                    {deleteInProgress === selectedCustomerId && (
                        <Loader className="w-4 h-4 animate-spin" />
                    )}
                    Delete
                </button>
            </div>
        </div>
    </div>
)}

            </div>
        </div>
    );
};

export default CustomerDirectory;