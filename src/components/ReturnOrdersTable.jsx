// ReturnOrdersTable.jsx

import React, { useState, useEffect } from 'react';
import { FiSearch, FiArchive, FiClock, FiFileText, FiEye, FiX, FiCheckCircle, FiInfo } from 'react-icons/fi';
import { collection, getDocs, query, doc, getDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from "../firebase";

/* ------------------------------------
    Helper Functions
------------------------------------ */

const formatAmount = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

const formatFirestoreTimestamp = (timestamp) => {
    if (!timestamp) return "N/A";
    if (typeof timestamp.toDate === "function") {
        return timestamp
            .toDate()
            .toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
    }
    const d = new Date(timestamp);
    return !isNaN(d)
        ? d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })
        : "Invalid Date";
};

const getActionStyles = (action) => {
    switch (action?.toLowerCase()) {

        case 'requested':
        case 'return_requested':
            return 'bg-orange-100 text-orange-700 border-orange-300';

        case 'approved':
            return 'bg-green-100 text-green-700 border-green-300';

        case 'processed':
            return 'bg-blue-100 text-blue-700 border-blue-300';

        case 'pending':
            return 'bg-yellow-100 text-yellow-700 border-yellow-300';

        case 'rejected':
            return 'bg-red-100 text-red-700 border-red-300';

        case 'completed':
            return 'bg-purple-100 text-purple-700 border-purple-300';

        default:
            return 'bg-gray-100 text-gray-700 border-gray-300';
    }
};

const ReturnActionChip = ({ action }) => {
    const classes = getActionStyles(action);
    return (
        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${classes} shadow-sm min-w-[100px] text-center`}>
            {action || 'Unknown'}
        </span>
    );
};

/* ------------------------------------
    Modal Component
------------------------------------ */

const ReturnDetailsModal = ({ order, onClose }) => {
    if (!order) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fadeIn">
                {/* Header */}
                <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">Return Request Details</h3>
                        <p className="text-sm text-gray-500 mt-1">Order ID: {order.firestoreOrderId || order.orderId || order.firestoreId}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <FiX className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Status & Type */}
                    <div className="flex flex-wrap gap-4">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</span>
                            <div className="mt-1"><ReturnActionChip action={order.status} /></div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Return Type</span>
                            <span className={`mt-1 px-3 py-1 rounded-full text-xs font-bold border ${order.returnType === 'refund' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                                {order.returnType?.toUpperCase() || 'N/A'}
                            </span>
                        </div>
                    </div>

                    {/* Bank Details (If Refund) */}
                    {order.returnType === 'refund' && order.bankDetails && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                            <h4 className="text-blue-800 font-bold flex items-center gap-2 mb-3">
                                <FiInfo className="w-5 h-5" /> Bank Details for Refund
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-xs text-blue-600 font-medium">Bank Name</p>
                                    <p className="text-sm font-bold text-blue-900">{order.bankDetails.bankName || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-blue-600 font-medium">Account Number</p>
                                    <p className="text-sm font-bold text-blue-900 font-mono">{order.bankDetails.accNo || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-blue-600 font-medium">IFSC Code</p>
                                    <p className="text-sm font-bold text-blue-900 font-mono">{order.bankDetails.ifscCode || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Customer Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="text-sm font-bold text-gray-700 mb-3 border-b pb-1">Customer Info</h4>
                            <div className="space-y-2">
                                <p className="text-sm"><span className="text-gray-400">Name:</span> <span className="font-medium text-gray-800">{order.customer}</span></p>
                                <p className="text-sm"><span className="text-gray-400">Email:</span> <span className="font-medium text-gray-800">{order.email}</span></p>
                                <p className="text-sm"><span className="text-gray-400">Phone:</span> <span className="font-medium text-gray-800">{order.phone}</span></p>
                                <p className="text-sm"><span className="text-gray-400">Address:</span> <span className="font-medium text-gray-800">{order.address}</span></p>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-gray-700 mb-3 border-b pb-1">Request Info</h4>
                            <div className="space-y-2">
                                <p className="text-sm"><span className="text-gray-400">Requested At:</span> <span className="font-medium text-gray-800">{order.date}</span></p>
                                <p className="text-sm"><span className="text-gray-400">Refund Amount:</span> <span className="font-bold text-red-600 text-base">{formatAmount(order.amount)}</span></p>
                            </div>
                        </div>
                    </div>

                    {/* Reason & Notes */}
                    <div className="space-y-4">
                        <div>
                            <h4 className="text-sm font-bold text-gray-700 mb-2">Reason for Return</h4>
                            <p className="p-3 bg-gray-50 border rounded-lg text-sm italic text-gray-700">"{order.reason}"</p>
                        </div>
                        {order.notes && (
                            <div>
                                <h4 className="text-sm font-bold text-gray-700 mb-2">Additional Notes</h4>
                                <p className="p-3 bg-gray-50 border rounded-lg text-sm text-gray-700">{order.notes}</p>
                            </div>
                        )}
                    </div>

                    {/* Items */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-700 mb-3">Items to Return</h4>
                        <div className="border rounded-xl overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="p-3 font-bold text-gray-600">Item</th>
                                        <th className="p-3 font-bold text-gray-600 text-center">Qty</th>
                                        <th className="p-3 font-bold text-gray-600 text-right">Price</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {Array.isArray(order.items) && order.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="p-3 font-medium text-gray-800">{item.name}</td>
                                            <td className="p-3 text-center text-gray-600">{item.quantity}</td>
                                            <td className="p-3 text-right text-gray-600">₹{item.price}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Photo */}
                    {order.damagePhoto && (
                        <div>
                            <h4 className="text-sm font-bold text-gray-700 mb-3">Damage Evidence</h4>
                            <div className="relative group rounded-2xl overflow-hidden border-4 border-gray-100">
                                <img src={order.damagePhoto} alt="Damage evidence" className="w-full max-h-96 object-contain bg-gray-900" />
                                <button 
                                    onClick={() => window.open(order.damagePhoto, '_blank')}
                                    className="absolute bottom-4 right-4 bg-white/90 hover:bg-white p-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-bold text-gray-800 transition-all"
                                >
                                    <FiEye className="w-5 h-5" /> View Full Image
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t bg-gray-50 flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-xl font-bold text-gray-700 transition-colors">Close</button>
                </div>
            </div>
        </div>
    );
};


/* ------------------------------------
    Main Component
------------------------------------ */
export default function ReturnOrdersTable() {
    const [searchTerm, setSearchTerm] = useState('');
    const [returnOrders, setReturnOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);

    useEffect(() => {

        const fetchReturnOrders = async () => {

            try {

                const returnQuery = query(
                    collection(db, "returns"),
                );

                const snapshot = await getDocs(returnQuery);

                const returnsList = [];

                // 🔥 IMPORTANT: using for...of for async order fetch
                for (const docSnap of snapshot.docs) {

                    const data = docSnap.data();

                    const userId = data.userId || "unknown_user";

                    const customerInfo = data.customerInfo || {};

                    // 🔥 FETCH ORDER STATUS FROM ORDERS COLLECTION
                    let orderStatus = "pending";

                    if (data.firestoreOrderId) {

                        try {

                            const orderRef = doc(db, "users", userId, "orders", data.firestoreOrderId);

                            const orderSnap = await getDoc(orderRef);

                            if (orderSnap.exists()) {

                                orderStatus = orderSnap.data().status || "pending";

                            }

                        } catch (err) {

                            console.error("Error fetching order status:", err);

                        }

                    }

                    // ✅ Calculate total refund from items
                    const calculatedAmount = Array.isArray(data.items)
                        ? data.items.reduce((total, item) =>
                            total + ((item.price || 0) * (item.quantity || 0)), 0)
                        : 0;

                    returnsList.push({

                        firestoreId: data.returnRequestId || docSnap.id,

                        userId,

                        ...data,

                        customer: customerInfo.name || "Unknown Customer",

                        email: customerInfo.email || "N/A",

                        phone: customerInfo.phone || "N/A",

                        address: customerInfo.address
                            ? `${customerInfo.address}, ${customerInfo.city || ""} - ${customerInfo.pincode || ""}`
                            : "N/A",

                        reason: data.reason || "No reason provided",

                        damagePhoto: data.damagePhoto || null,

                        returnType: data.returnType || "N/A",

                        status: data.status || "requested",

                        // 🔥 USE STATUS FROM RETURNS COLLECTION
                        returnAction: data.status || "requested",
                        amount: calculatedAmount,
                        items: data.items || [], // Preserve original array
                        itemsSummary: Array.isArray(data.items)
                            ? data.items.map(i => `${i.quantity} × ${i.name}`).join("\n")
                            : "N/A",
                        date: formatFirestoreTimestamp(data.requestedAt),
                        createdAt: data.requestedAt,
                    });

                }

                returnsList.sort((a, b) => {
                    const dateA = a.createdAt?.toDate?.()?.getTime() || 0;
                    const dateB = b.createdAt?.toDate?.()?.getTime() || 0;
                    return dateB - dateA;
                });

                setReturnOrders(returnsList);

            }

            catch (err) {

                console.error("Error fetching return requests:", err);

            }

            setLoading(false);

        };

        fetchReturnOrders();

    }, []);

    const handleAcceptReturn = async (order) => {
        if (!window.confirm("Are you sure you want to accept this return request?")) return;

        try {
            const { userId, originalOrderId, returnType, items, customerInfo } = order;

            // 1. Update status in returns collection
            const returnRef = doc(db, "returns", order.firestoreId);
            await updateDoc(returnRef, { status: "approved" });

            // 2. Handle based on return type
            if (userId && originalOrderId) {
                const orderRef = doc(db, "users", userId, "orders", originalOrderId);
                
                if (returnType === "replacement") {
                    // Create NEW replacement order
                    const newOrderId = `REP-${Date.now()}`;
                    const replacementOrder = {
                        orderId: newOrderId,
                        originalOrderId: originalOrderId,
                        amount: 0,
                        items: items.map(item => ({ ...item, price: 0 })), // Price is 0 for replacements
                        customerInfo: customerInfo || order.customerData || {}, // Fallback to customerData if customerInfo missing
                        paymentMethod: "replacement",
                        status: "confirmed",
                        createdAt: serverTimestamp(),
                        isReplacement: true,
                        damagePhoto: order.damagePhoto || null
                    };
                    
                    await addDoc(collection(db, "users", userId, "orders"), replacementOrder);
                    
                    // Update original order status to 'replaced'
                    await updateDoc(orderRef, { status: "replaced" });
                } else if (returnType === "refund") {
                    // Update original order status to 'refunded'
                    await updateDoc(orderRef, { status: "refunded" });
                } else {
                    // Default fallback
                    await updateDoc(orderRef, { status: "return_approved" });
                }
            }

            // Update local state
            setReturnOrders(prev => prev.map(o => 
                o.firestoreId === order.firestoreId ? { ...o, status: "approved", returnAction: "approved" } : o
            ));

            alert("Return request accepted and processed successfully!");
        } catch (err) {
            console.error("Error accepting return:", err);
            alert("Failed to accept return request.");
        }
    };

    const filteredOrders = returnOrders.filter(order =>
        order.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.phone?.includes(searchTerm) ||
        order.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.firestoreId?.includes(searchTerm)
    );

    const ReturnOrderRow = ({ order }) => {

        const initials = order.customer?.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

        const avatarColor = ['#7c3aed', '#f97316', '#10b981'][order.firestoreId.length % 3];

        return (

            <tr className="border-b border-gray-100 group hover:bg-gradient-to-r from-purple-50/50 to-white transition-all duration-200">

                <td className="p-4 text-sm font-semibold text-gray-800 flex items-center min-w-[200px]">

                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white mr-4 text-sm font-bold shadow-md ring-2 ring-gray-100"
                        style={{ backgroundColor: avatarColor, backgroundImage: `linear-gradient(45deg, ${avatarColor}, ${avatarColor}B0)` }}
                    >
                        {initials}
                    </div>

                    <div className="flex flex-col">

                        <span className="font-semibold text-gray-900">{order.customer}</span>

                        <span className="text-xs text-gray-400 font-medium mt-0.5">

                            Order ID: {order.firestoreOrderId || order.orderId || order.firestoreId}

                        </span>

                    </div>

                </td>

                <td className="p-4 text-xs text-gray-600 min-w-[150px]">

                    <p className="font-medium text-gray-700 truncate">{order.email}</p>

                    <p className="text-gray-500 mt-0.5">{order.phone}</p>

                </td>

                <td className="p-4 text-xs text-gray-500 max-w-[250px] min-w-[200px] truncate">

                    {order.address}

                </td>

                <td className="p-4 text-xs text-gray-500 whitespace-pre-line font-mono max-w-[150px]">

                    <div className='max-h-12 overflow-hidden text-ellipsis'>

                        {order.itemsSummary}

                    </div>

                </td>

                <td className="p-4 font-extrabold text-red-600 text-lg min-w-[100px]">

                    {formatAmount(order.amount)}

                </td>

                <td className="p-4 text-xs text-gray-700 max-w-xs min-w-[200px]">

                    <div className='max-h-12 overflow-hidden text-ellipsis italic'>

                        "{order.reason}"

                    </div>

                </td>

                <td className="p-4 text-xs text-gray-500 font-medium min-w-[100px]">

                    {order.date}

                </td>

                <td className="p-4 text-center">
                    {order.damagePhoto ? (
                        <div className="relative group/img cursor-pointer" onClick={() => window.open(order.damagePhoto, '_blank')}>
                            <img 
                                src={order.damagePhoto} 
                                alt="Damage" 
                                className="w-12 h-12 rounded-lg object-cover border-2 border-gray-200 hover:border-purple-500 transition-colors"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center rounded-lg transition-opacity">
                                <FiSearch className="text-white w-4 h-4" />
                            </div>
                        </div>
                    ) : (
                        <span className="text-xs text-gray-400 italic">No Image</span>
                    )}
                </td>
                <td className="p-4 min-w-[100px]">
                    <ReturnActionChip action={order.returnAction} />
                </td>
                <td className="p-4 min-w-[120px]">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setSelectedOrder(order)}
                            className="flex-1 px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs font-bold rounded-md shadow-sm transition-colors flex items-center justify-center gap-1"
                        >
                            <FiEye className="w-3 h-3" /> View
                        </button>

                        {order.status === "requested" && (
                            <button
                                onClick={() => handleAcceptReturn(order)}
                                className="flex-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-md shadow-sm transition-colors"
                            >
                                Accept
                            </button>
                        )}
                    </div>
                </td>

            </tr>

        );

    };

    return (

        <div className="flex-1 p-4 lg:p-8 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen font-sans">

            <div className="orders-container bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 border-b border-gray-100 bg-white">

                    <h2 className="text-2xl font-bold text-gray-800 flex items-center mb-3 md:mb-0">

                        <FiArchive className="w-6 h-6 mr-3 text-purple-600" /> Return Orders

                        <span className="ml-3 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">

                            {returnOrders.length} Total

                        </span>

                    </h2>

                </div>

                <div className="p-6 pt-4 relative border-b border-gray-100">

                    <FiSearch className="absolute left-9 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />

                    <input
                        type="text"
                        placeholder="Search customer name, email, phone, or reason..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full md:w-1/2 p-3 pl-10 border border-gray-300 rounded-lg text-sm bg-gray-50"
                    />

                </div>

                <div className="overflow-x-auto">

                    <table className="min-w-full divide-y divide-gray-200">

                        <thead className="bg-gray-50 sticky top-0 shadow-sm z-10">

                            <tr>

                                {['CUSTOMER', 'CONTACT', 'ADDRESS', 'ITEMS', 'REFUND AMOUNT', 'REASON', 'DATE', 'IMAGE', 'STATUS', 'ACTION'].map(header => (

                                    <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">

                                        {header}

                                    </th>

                                ))}

                            </tr>

                        </thead>

                        <tbody className="bg-white divide-y divide-gray-100">

                            {loading ? (

                                <tr>

                                    <td colSpan="9" className="p-12 text-center text-gray-500 text-lg">

                                        <FiClock className="w-8 h-8 mx-auto text-purple-400 mb-3 animate-spin" />

                                        Fetching return requests...

                                    </td>

                                </tr>

                            ) : filteredOrders.length > 0 ? (

                                filteredOrders.map(order => (

                                    <ReturnOrderRow key={order.firestoreId} order={order} />

                                ))

                            ) : (

                                <tr>

                                    <td colSpan="9" className="p-12 text-center text-gray-500 text-lg">

                                        <FiArchive className="w-8 h-8 mx-auto text-gray-400 mb-3" />

                                        No return requests found.

                                    </td>

                                </tr>

                            )}

                        </tbody>

                    </table>

                </div>

                {!loading && (

                    <div className="p-4 border-t border-gray-100 bg-gray-50/50 text-sm text-gray-600 flex justify-end">

                        <span className="font-medium">Showing {filteredOrders.length} returns.</span>

                    </div>

                )}

            </div>

            {/* Modal */}
            <ReturnDetailsModal 
                order={selectedOrder} 
                onClose={() => setSelectedOrder(null)} 
            />

        </div>

    );

}