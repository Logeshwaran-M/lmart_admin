import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiSearch, FiCheckCircle, FiDownload } from 'react-icons/fi'; // Added FiDownload
import { collectionGroup, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase'; // Verify this path

// ---------------- Helper Functions ----------------
const formatAmount = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

const formatFirestoreTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    // Standardized format for consistency
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        if (isNaN(date)) throw new Error('Invalid Date');

        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch (e) {
        return 'Invalid Date';
    }
};

const getItemDisplay = (items) => {
    if (!items) return 'No items';
    if (Array.isArray(items)) return `${items.length} item(s)`;
    if (typeof items === 'string') return items.substring(0, 30) + (items.length > 30 ? '...' : '');
    return 'View Details';
};

const extractUserIdFromPath = (path) => {
    const parts = path.split('/');
    return parts[1] || 'unknown_user';
};

// ---------------- Order Row Component ----------------
const OrderRow = ({ order }) => {
    const initials = (order.customer || 'U')
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);

    // Using a more vibrant green palette
    const avatarColor = ['#34d399', '#059669', '#10b981'][order.id.length % 3];
    
    // Construct the link for details
    const linkToDetail = order.userId && order.id ? `/orders/${order.userId}/${order.id}` : `/orders/${order.id}`;


    return (
        // Enhanced hover effect with subtle background and shadow
        <tr className="border-b border-gray-100 hover:bg-green-50/50 transition duration-150 ease-in-out group">
            
            {/* Customer & ID */}
            <td className="p-4 text-sm font-medium text-gray-900 flex items-center">
                <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white mr-3 text-xs font-bold shadow-md"
                    style={{ backgroundColor: avatarColor }}
                >
                    {initials}
                </div>
                <div>
                    <div className="font-semibold text-gray-800">{order.customer}</div>
                    {order.orderId && (
                        <div className="text-xs text-gray-500 font-mono mt-0.5">#{order.orderId}</div>
                    )}
                </div>
            </td>

            {/* Contact */}
            <td className="p-4 text-xs text-gray-600 font-light">
                <span className="block">{order.email}</span>
                <span className="block text-gray-500">{order.phone}</span>
            </td>

            {/* Address */}
            <td className="p-4 text-xs text-gray-600 max-w-xs truncate">{order.address}</td>

            {/* Items */}
            <td className="p-4 text-sm font-medium text-gray-700">{getItemDisplay(order.items)}</td>

            {/* Amount & Status (Status moved next to amount for emphasis) */}
            <td className="p-4 font-extrabold text-lg text-green-700">
                {formatAmount(order.amount)}
                {/* Clean, primary status badge */}
                <div className="text-xs mt-1 px-2.5 py-0.5 rounded-full inline-block bg-green-100 border border-green-300 text-green-700 shadow-sm font-medium">
                    <span className="flex items-center gap-1">
                        <FiCheckCircle className="w-3 h-3 text-green-600" />
                        Delivered
                    </span>
                </div>
            </td>

            {/* Date */}
            <td className="p-4 text-sm text-gray-500 font-light">
                {formatFirestoreTimestamp(order.date || order.createdAt)}
            </td>

            {/* Actions */}
            <td className="p-4">
                <Link
                    to={linkToDetail}
                    // Button with subtle animation and shadow
                    className="px-4 py-1.5 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-300 shadow-md group-hover:shadow-lg group-hover:scale-[1.03] inline-block"
                >
                    View Details
                </Link>
            </td>
        </tr>
    );
};

// ---------------- Main Component ----------------
export const DeliveredOrdersTable = () => {
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchOrders = async () => {
            setLoading(true);
            setError('');

            try {
                // Ensure Collection Group Index exists for 'orders' on field 'status'
                const ordersRef = collectionGroup(db, 'orders');
                const q = query(ordersRef, where('status', 'in', ['Delivered', 'Success'])); // Including 'Success' as a common alternative

                const snapshot = await getDocs(q);

                const list = snapshot.docs.map((doc) => {
                    const data = doc.data();
                    const userId = extractUserIdFromPath(doc.ref.path);
                    const customerInfo = data.customerInfo || {};

                    return {
                        id: doc.id,
                        userId,
                        ...data,
                        customer: data.customer || customerInfo.name || 'Unknown Customer',
                        email: data.email || customerInfo.email || 'N/A',
                        phone: data.phone || customerInfo.phone || 'N/A',
                        address:
                            data.address ||
                            `${customerInfo.address || ''}, ${customerInfo.city || ''} - ${
                                customerInfo.pincode || ''
                            }`.replace(/^,\s*/, ''),
                    };
                });

                setOrders(list);
                setFilteredOrders(list);
            } catch (err) {
                console.error('Error fetching delivered orders:', err);
                setError(
                    err.message.includes('COLLECTION_GROUP_ASC index') 
                    ? `Index Required: Please create a Collection Group Index for 'orders' on the 'status' field in your Firebase Console to fix this error. Details: ${err.message}` 
                    : err.message || 'Failed to load delivered orders.'
                );
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    // Search filter
    useEffect(() => {
        if (!searchTerm) {
            setFilteredOrders(orders);
            return;
        }

        const lower = searchTerm.toLowerCase();

        const result = orders.filter((order) =>
            [
                order.customer,
                order.email,
                order.phone,
                order.address,
                order.orderId || order.id,
                JSON.stringify(order.items),
            ]
                .join(' ')
                .toLowerCase()
                .includes(lower)
        );

        setFilteredOrders(result);
    }, [searchTerm, orders]);

    // ---------------- Loading UI ----------------
    if (loading) {
        return (
            <div className="flex justify-center items-center h-64 bg-white rounded-xl shadow-2xl p-8">
                <div className="animate-spin rounded-full h-14 w-14 border-t-4 border-b-4 border-green-500"></div>
                <p className="ml-5 text-lg text-gray-700 font-medium">Fetching Delivered Orders...</p>
            </div>
        );
    }

    // ---------------- Error UI ----------------
    if (error) {
        return (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-lg mt-4 max-w-full mx-auto">
                <p className="font-bold">Database Error</p>
                <p className="text-sm mt-1">{error}</p>
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 lg:p-8 bg-gray-50 min-h-screen">
            <div className="orders-container bg-white rounded-xl shadow-2xl p-8 border border-gray-100">

                {/* Header */}
                <div className="flex justify-between items-center pb-6 border-b border-gray-200">
                    <h2 className="text-3xl font-extrabold text-green-700 flex items-center gap-3">
                        <FiCheckCircle className="w-8 h-8 text-green-500" />
                        Delivered Orders <span className="text-xl font-medium text-gray-500">({orders.length})</span>
                    </h2>

                    {/* <button className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]">
                        <FiDownload className="w-4 h-4" />
                        Download Report
                    </button> */}
                </div>

                {/* Search */}
                <div className="mt-6 mb-8 relative">
                    <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search customer, ID, email, or address..."
                        className="w-full sm:w-2/3 md:w-1/2 p-3 pl-12 border border-gray-300 rounded-xl shadow-inner focus:ring-green-500 focus:border-green-500 transition duration-150 text-base"
                    />
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-green-50 sticky top-0">
                            <tr>
                                {['CUSTOMER', 'CONTACT INFO', 'ADDRESS', 'ITEMS', 'TOTAL AMOUNT', 'DELIVERY DATE', 'ACTIONS'].map(
                                    (h) => (
                                        <th
                                            key={h}
                                            className="px-4 py-4 text-left text-xs font-bold text-green-800 uppercase tracking-wider whitespace-nowrap"
                                        >
                                            {h}
                                        </th>
                                    )
                                )}
                            </tr>
                        </thead>

                        <tbody className="bg-white divide-y divide-gray-100">
                            {filteredOrders.length > 0 ? (
                                filteredOrders.map((order) => <OrderRow key={order.id} order={order} />)
                            ) : (
                                <tr>
                                    <td colSpan="7" className="p-12 text-center text-gray-500">
                                        <FiCheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                        <p className="text-lg font-medium">
                                            {searchTerm
                                                ? "No delivered orders match your search criteria."
                                                : "No delivered orders found in the database."
                                            }
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DeliveredOrdersTable;