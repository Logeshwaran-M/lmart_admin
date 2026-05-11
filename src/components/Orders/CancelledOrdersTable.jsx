// CancelledOrdersTable.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FiSearch, FiXCircle, FiRefreshCw } from 'react-icons/fi';
import {
  collectionGroup,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../../firebase';

/* -----------------------------
   Helper utilities
   ----------------------------- */
const formatAmount = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

const formatFirestoreTimestamp = (timestamp) => {
  if (!timestamp) return 'N/A';
  if (typeof timestamp.toDate === 'function') {
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  // fallback for plain ISO / number
  const d = new Date(timestamp);
  if (!isNaN(d)) return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  return 'Invalid Date';
};

const getItemDisplay = (items) => {
  if (!items) return 'No items';
  if (Array.isArray(items)) return `${items.length} item(s)`;
  if (typeof items === 'string') return items.length > 50 ? `${items.substring(0, 50)}...` : items;
  return 'View Details';
};

const extractUserIdFromPath = (path) => {
  // ex: users/{userId}/orders/{orderId}
  // split and look for 'users' then the next segment
  if (!path) return 'unknown_user';
  const parts = path.split('/').filter(Boolean);
  const usersIndex = parts.indexOf('users');
  if (usersIndex >= 0 && parts.length > usersIndex + 1) return parts[usersIndex + 1];
  // fallback: if pattern is {someCollection}/{userId}/orders/{orderId}
  if (parts.length >= 2) return parts[parts.length - 3] === 'users' ? parts[parts.length - 2] : parts[1];
  return 'unknown_user';
};

/* -----------------------------
   OrderRow - memoized for perf
   ----------------------------- */
const OrderRow = React.memo(({ order }) => {
  const initials = (order.customer || 'O').split(' ').map(n => n[0] || '').join('').toUpperCase().substring(0, 2);
  const contactInfo = `${order.email || 'N/A'}\n${order.phone || 'N/A'}`;
  const avatarColors = ['#d946ef', '#10b981', '#3b82f6'];
  const avatarColor = avatarColors[(order.id || '').length % avatarColors.length];

  const itemsDisplay = getItemDisplay(order.items);
  const displayDate = order.date || order.createdAt;
  const formattedDate = formatFirestoreTimestamp(displayDate);

  const getStatusStyles = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'delivered':
      case 'success':
        return 'bg-green-100 text-green-700 border border-green-300';
      case 'processing':
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border border-yellow-300';
      case 'shipped':
        return 'bg-blue-100 text-blue-700 border border-blue-300';
      case 'cancelled':
      case 'refunded':
        return 'bg-red-100 text-red-700 border border-red-300';
      default:
        return 'bg-gray-100 text-gray-700 border border-gray-300';
    }
  };

  const linkToDetail = order.userId && order.id ? `/orders/${order.userId}/${order.id}` : `/orders/${order.id}`;

  return (
    <tr className="border-b hover:bg-gray-50 transition-colors">
      <td className="p-4 text-sm font-semibold text-gray-800 flex items-center">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white mr-3 text-xs"
          style={{ backgroundColor: avatarColor }}
        >
          {initials || 'O'}
        </div>
        <div>
          <div>{order.customer}</div>
          {order.orderId && <div className="text-xs text-gray-500 font-mono mt-1">#{order.orderId}</div>}
        </div>
      </td>

      <td className="p-4 text-xs text-gray-600 whitespace-pre-line">{contactInfo}</td>

      <td className="p-4 text-xs text-gray-600">
        <div className="whitespace-pre-line">{order.address || 'N/A'}</div>
        {order.customerInfo?.pincode && <div className="text-xs text-gray-500 mt-1">Pincode: {order.customerInfo.pincode}</div>}
      </td>

      <td className="p-4 text-xs text-gray-600">{itemsDisplay}</td>

      <td className="p-4 font-bold text-green-600 text-sm">
        {formatAmount(order.amount)}
        {order.status && (
          <div className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block ${getStatusStyles(order.status)}`}>
            {order.status}
          </div>
        )}
      </td>

      <td className="p-4 text-xs text-gray-500">{formattedDate}</td>

      <td className="p-4">
        <Link
          to={linkToDetail}
          className="px-3 py-1 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded transition-colors shadow-md inline-block text-center"
        >
          View Details
        </Link>
      </td>
    </tr>
  );
});

/* -----------------------------
   Main Component
   ----------------------------- */
export const CancelledOrdersTable = () => {
  const [orders, setOrders] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // debounce searchTerm -> debouncedSearch
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(id);
  }, [searchTerm]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ordersRef = collectionGroup(db, 'orders');
      const q = query(ordersRef, where('status', '==', 'Cancelled'));
      const snap = await getDocs(q);
      const list = snap.docs.map((doc) => {
        const data = doc.data() || {};
        const userId = extractUserIdFromPath(doc.ref.path);
        const customerInfo = data.customerInfo || {};
        const address = data.address || [customerInfo.address, customerInfo.city, customerInfo.pincode].filter(Boolean).join(', ');
        return {
          id: doc.id,
          userId,
          ...data,
          customer: data.customer || customerInfo.name || 'Unknown Customer',
          email: data.email || customerInfo.email || 'N/A',
          phone: data.phone || customerInfo.phone || 'N/A',
          address: address || 'N/A',
        };
      });

      // sort by createdAt (newest first) if present, otherwise keep as-is
      list.sort((a, b) => {
        const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || a.date || 0).getTime();
        const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || b.date || 0).getTime();
        return (tb || 0) - (ta || 0);
      });

      setOrders(list);
      setFiltered(list);
    } catch (err) {
      console.error('Error fetching cancelled orders:', err);
      // Show clear message including Firebase hint when applicable
      const msg = err?.message || String(err) || 'Failed to fetch cancelled orders';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // filter on debouncedSearch
  useEffect(() => {
    if (!debouncedSearch) {
      setFiltered(orders);
      return;
    }
    const lc = debouncedSearch.toLowerCase();
    const res = orders.filter((o) => {
      const fields = [
        o.customer, o.email, o.phone, o.address,
        o.orderId, o.id, JSON.stringify(o.items)
      ].join(' ').toLowerCase();
      return fields.includes(lc);
    });
    setFiltered(res);
  }, [debouncedSearch, orders]);

  const retry = () => fetchOrders();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 bg-white rounded-lg shadow-xl p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" aria-hidden="true"></div>
        <p className="ml-4 text-gray-700 font-medium">Loading Cancelled Orders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto mt-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-4 rounded-md">
          <div className="flex items-start justify-between">
            <div>
              <strong className="block font-semibold">Error loading cancelled orders</strong>
              <p className="mt-1 text-sm whitespace-pre-wrap">{error}</p>
              <p className="mt-2 text-sm text-gray-600">
                If the error mentions Firestore indexes, please create a Collection Group index for <code>orders</code> on the <code>status</code> field in Firebase Console.
              </p>
            </div>

            <div className="ml-4 flex flex-col items-end">
              <button
                onClick={retry}
                className="inline-flex items-center px-3 py-1.5 bg-white border rounded text-sm shadow-sm hover:bg-gray-50"
                aria-label="Retry fetching cancelled orders"
              >
                <FiRefreshCw className="mr-2" /> Retry
              </button>
              <a
                href="https://console.firebase.google.com"
                target="_blank"
                rel="noreferrer"
                className="mt-2 text-xs text-blue-600 underline"
              >
                Open Firebase Console
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 lg:p-8 bg-white min-h-screen">
      <div className="orders-container bg-white rounded-lg shadow-xl p-6 border border-gray-200 max-w-6xl mx-auto">
        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-red-700 flex items-center">
            <FiXCircle className="w-5 h-5 mr-2 text-red-600" />
            Cancelled Orders ({orders.length})
          </h2>

          <div className="flex items-center space-x-3">
            {/* <button
              onClick={() => {
                // simple CSV download for current filtered list
                const rows = filtered.map(o => ({
                  id: o.id,
                  orderId: o.orderId || '',
                  customer: o.customer,
                  email: o.email,
                  phone: o.phone,
                  amount: o.amount || 0,
                  status: o.status || '',
                  date: o.createdAt ? (o.createdAt.toDate ? o.createdAt.toDate().toISOString() : new Date(o.createdAt).toISOString()) : ''
                }));
                const header = Object.keys(rows[0] || {});
                const csv = [header.join(',')].concat(rows.map(r => header.map(h => `"${String(r[h] ?? '')}".replace(/"/g, '""')"`))).join('\n');
                // fallback simple CSV (not perfect escaping) - opens in new tab
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `cancelled-orders-${new Date().toISOString().slice(0,10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-md"
            >
              Download Report
            </button> */}
          </div>
        </div>

        <div className="mt-4 mb-6 relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            aria-label="Search cancelled orders"
            placeholder="Search name, email, phone, address, order ID, or items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-2/3 md:w-1/2 p-3 pl-10 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 transition-colors text-sm bg-white text-gray-900"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                {['CUSTOMER', 'CONTACT', 'ADDRESS', 'ITEMS', 'AMOUNT', 'DATE', 'ACTIONS'].map((header) => (
                  <th
                    key={header}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.length > 0 ? (
                filtered.map((order) => <OrderRow key={`${order.userId}_${order.id}`} order={order} />)
              ) : (
                <tr>
                  <td colSpan="7" className="p-6 text-center text-gray-500">
                    <FiXCircle className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <p>
                      {debouncedSearch ? 'No cancelled orders found matching your search term.' : 'No cancelled orders available in the database.'}
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

export default CancelledOrdersTable;
