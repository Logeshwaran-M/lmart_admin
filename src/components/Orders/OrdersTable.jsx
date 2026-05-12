import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FiSearch, 
    FiShoppingBag, 
    FiEdit, 
    FiX, 
    FiCheckCircle, 
    FiDownload, 
    FiCalendar, 
    FiEye 
} from 'react-icons/fi';
import { FiRefreshCw } from 'react-icons/fi';

import {
    collectionGroup,
    query,
    getDocs,
    doc,
    updateDoc,
    Timestamp
} from 'firebase/firestore'; 
import { db } from '../../firebase'; // Ensure this path is correct

// --- Helper Functions ---
const formatAmount = (amount) => Number(amount || 0);
const formatDisplayAmount = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

const formatDisplayDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    let date;
    if (timestamp.toDate) {
        date = timestamp.toDate();
    } else {
        try {
            date = new Date(timestamp);
            if (isNaN(date)) return 'Invalid Date';
        } catch(e) {
            return 'Invalid Date';
        }
    }
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatFirestoreTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    if (timestamp.toDate) return timestamp.toDate().toISOString();
    try {
        const date = new Date(timestamp);
        return !isNaN(date) ? date.toISOString() : 'N/A';
    } catch {
        return 'Invalid Date';
    }
};

// --- CSV Export Logic ---
const convertToCSV = (data) => {
    if (!data || data.length === 0) return '';
    const headers = [
        "Order ID", "User ID", "Customer Name", "Email", "Phone", 
        "Address", "Total Items", "Amount (INR)", "Status", "Order Date"
    ];

    const sanitize = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    const rows = data.map(order => [
        order.id,
        order.userId,
        order.customer,
        order.email,
        order.phone,
        (order.address || '').replace(/\n/g, ' '),
        Array.isArray(order.items) ? order.items.length : 0,
        formatAmount(order.amount),
        order.status || 'Pending',
        formatFirestoreTimestamp(order.createdAt)
    ]);

    return [headers.join(','), ...rows.map(r => r.map(sanitize).join(','))].join('\n');
};

const ORDER_STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'];

const STATUS_FLOW = {
  Pending: ['Processing', 'Cancelled'],
  Processing: ['Shipped', 'Refunded', 'Cancelled'],
  Shipped: ['Delivered', 'Cancelled'],
  Delivered: [],
  Cancelled: [],
  Refunded: []
};

const StatusBadge = ({ status }) => {
    const styles = {
        Delivered: 'bg-green-100 text-green-700',
        Shipped: 'bg-indigo-100 text-indigo-700',
        Processing: 'bg-yellow-100 text-yellow-700',
        Cancelled: 'bg-red-100 text-red-700 line-through',
        Refunded: 'bg-red-100 text-red-700',
        Pending: 'bg-blue-100 text-blue-700'
    };

    return (
        <span
            key={status}
            className={`
              inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full shadow-sm
              animate-pop
              ${styles[status]}
            `}
        >
            {status}
        </span>
    );
};
const StatusChangeModal = ({ order, currentStatus, onSave, onClose }) => {
  const allowedStatuses = STATUS_FLOW[currentStatus] || [];
  const [newStatus, setNewStatus] = useState(
    allowedStatuses[0] || currentStatus
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsSaving(true);
      await onSave(order.userId, order.id, newStatus);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <FiEdit className="mr-2 text-red-600" /> Update Order Status
          </h3>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <FiX className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4">
          <p className="text-sm">
            Order:{" "}
            <span className="font-mono font-bold">
              {order.id.substring(0, 12)}
            </span>
          </p>

          {allowedStatuses.length > 0 ? (
            <select
              value={newStatus}
              disabled={isSaving}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
            >
              {allowedStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          ) : (
            <div className="w-full p-3 rounded-lg bg-gray-100 text-gray-500 text-sm">
              This order status can no longer be changed.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg"
          >
            Close
          </button>

          {allowedStatuses.length > 0 && (
            <button
              onClick={handleConfirm}
              disabled={isSaving}
              className={`px-4 py-2 rounded-lg text-white flex items-center gap-2
                ${isSaving ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600'}
              `}
            >
              {isSaving && (
                <FiRefreshCw className="w-4 h-4 animate-spin" />
              )}
              {isSaving ? 'Updating...' : 'Confirm Change'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};


// --- Main Component ---
const OrdersTable = () => {
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const navigate = useNavigate();
    const [updatingId, setUpdatingId] = useState(null);



    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            // collectionGroup 'orders' fetches from /users/{uid}/orders/
            const ordersGroupRef = query(collectionGroup(db, 'orders'));
            const querySnapshot = await getDocs(ordersGroupRef);

            const ordersList = querySnapshot.docs.map(docSnap => {
                const data = docSnap.data();
                const pathParts = docSnap.ref.path.split('/');
                // Path is users/USER_ID/orders/ORDER_ID
                const userId = pathParts[1]; 

                return {
                    id: docSnap.id,
                    userId: userId,
                    linkToDetail: `/orders/${userId}/${docSnap.id}`,
                    ...data,
                    customer: data.customer || data.customerInfo?.name || "Unknown",
                    email: data.email || data.customerInfo?.email || "N/A",
                    phone: data.phone || data.customerInfo?.phone || "N/A",
                    address: data.address || data.customerInfo?.address || "N/A",
                };
            }).filter(order => {
                const status = (order.status || '').toLowerCase();
                return (
                    !order.isReplacement && 
                    status !== 'replaced' && 
                    status !== 'refunded' && 
                    status !== 'return_approved'
                );
            });

            // Sort by createdAt descending
            ordersList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setOrders(ordersList);
            setFilteredOrders(ordersList);
        } catch (e) {
            console.error("Fetch Error:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    useEffect(() => {
        const term = searchTerm.toLowerCase();
        const filtered = orders.filter(o => 
            [o.customer, o.email, o.id, o.status].some(val => 
                val?.toLowerCase().includes(term)
            )
        );
        setFilteredOrders(filtered);
    }, [searchTerm, orders]);

   const updateOrderStatus = async (userId, orderId, newStatus) => {
    try {
        setUpdatingId(orderId);
        const orderRef = doc(db, 'users', userId, 'orders', orderId);
        const now = Timestamp.now();

        await updateDoc(orderRef, { status: newStatus, updatedAt: now });

        setOrders(prev =>
            prev.map(o =>
                o.id === orderId ? { ...o, status: newStatus, updatedAt: now } : o
            )
        );
    } catch {
        alert("Update failed.");
    } finally {
        setUpdatingId(null);
    }
};


    if (loading) return (
        <div className="flex flex-col items-center justify-center h-screen bg-white">
            <div className="animate-spin h-12 w-12 border-4 border-red-600 border-t-transparent rounded-full mb-4"></div>
            <p className="text-gray-500 font-medium">Loading orders from database...</p>
        </div>
    );

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {selectedOrder && (
                <StatusChangeModal 
                    order={selectedOrder} 
                    currentStatus={selectedOrder.status} 
                    onSave={updateOrderStatus} 
                    onClose={() => setSelectedOrder(null)} 
                />
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Header Section */}
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Order Management</h2>
                        <p className="text-sm text-gray-500">Total orders found: {orders.length}</p>
                    </div>
                    <button 
                        onClick={() => {
                            const csv = convertToCSV(filteredOrders);
                            const blob = new Blob([csv], { type: 'text/csv' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `Orders_${new Date().toLocaleDateString()}.csv`;
                            a.click();
                        }}
                        className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
                    >
                        <FiDownload /> Export CSV
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-6 bg-gray-50/50">
                    <div className="relative max-w-2xl">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text"
                            placeholder="Search by name, ID, or status..."
                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 outline-none transition"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Customer / ID</th>
                                <th className="px-6 py-4">Contact</th>
                                <th className="px-6 py-4">Items</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Total</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4 text-center">Action</th>
                            </tr>
                        </thead>
                     <tbody className="divide-y divide-gray-100">
  {filteredOrders.map((order) => {
    const normalizedStatus =
  order.status
    ? order.status.charAt(0).toUpperCase() + order.status.slice(1)
    : 'Pending';

const isLocked =
  normalizedStatus === 'Pending' ||
  (STATUS_FLOW[normalizedStatus] || []).length === 0;



    return (
      <tr
        key={order.id}
        className="hover:bg-gray-50/80 transition cursor-pointer"
        onClick={() => navigate(order.linkToDetail)}
      >
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">
              {order.customer[0]}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {order.customer}
              </p>
              <p className="text-xs font-mono text-gray-400">
                #{order.id.substring(0, 8)}
              </p>
            </div>
          </div>
        </td>

        <td className="px-6 py-4 text-xs text-gray-600">
          <p>{order.email}</p>
          <p>{order.phone}</p>
        </td>

        <td className="px-6 py-4 text-sm text-gray-700">
          {Array.isArray(order.items) ? order.items.length : 0} items
        </td>

        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
          {updatingId === order.id ? (
            <div className="flex items-center justify-center">
              <FiRefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
            </div>
          ) : (
           <button
  disabled={isLocked}
  onClick={() => !isLocked && setSelectedOrder(order)}
  className={`${
    isLocked
      ? 'cursor-not-allowed opacity-50 pointer-events-none'
      : 'cursor-pointer'
  }`}
  title={
    isLocked
      ? normalizedStatus === 'Pending'
        ? 'Order must be processed first'
        : 'This order status is locked'
      : 'Update order status'
  }
>
  <StatusBadge status={normalizedStatus} />
</button>

          )}
        </td>

        <td className="px-6 py-4 font-bold text-red-600">
          {formatDisplayAmount(order.amount)}
        </td>

        <td className="px-6 py-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <FiCalendar /> {formatDisplayDate(order.createdAt)}
          </div>
        </td>

        <td
          className="px-6 py-4 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => navigate(order.linkToDetail)}
            className="p-2 text-red-500 hover:bg-red-50 rounded-full transition"
          >
            <FiEye size={18} />
          </button>
        </td>
      </tr>
    );
  })}
</tbody>

                    </table>
                </div>
            </div>
        </div>
    );
};

export default OrdersTable;