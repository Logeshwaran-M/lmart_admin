// PendingOrdersTable.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
// 🟢 ADDED FiEye for the View Details button
import { FiSearch, FiClock, FiRefreshCw, FiEye } from "react-icons/fi"; 
import { collectionGroup, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";

/* ------------------------------------
    Helper Functions
------------------------------------ */
const formatAmount = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN")}`;

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

const getItemDisplay = (items) => {
  if (!items) return "No items";
  if (Array.isArray(items)) return `${items.length} item(s)`;
  if (typeof items === "string")
    return items.length > 50 ? `${items.substring(0, 50)}...` : items;
  return "View Details";
};

const extractUserIdFromPath = (path) => {
  const parts = path.split("/").filter(Boolean);
  const index = parts.indexOf("users");
  if (index >= 0 && parts.length > index + 1) return parts[index + 1];
  return "unknown_user";
};

/* ------------------------------------
    Row Component (Updated with FiEye)
------------------------------------ */
const OrderRow = React.memo(({ order }) => {
  const initials = (order.customer || "U")
    .split(" ")
    .map((n) => n[0] || "")
    .join("")
    .toUpperCase()
    .substring(0, 2);

  const avatarColors = ["#f59e0b", "#fbbf24", "#d97706"];
  const avatarColor =
    avatarColors[(order.id || "").length % avatarColors.length];

  const formattedDate = formatFirestoreTimestamp(order.date || order.createdAt);

  return (
    <tr className="border-b hover:bg-gray-50 transition-colors">
      {/* CUSTOMER */}
      <td className="p-4 text-sm font-semibold text-gray-800 flex items-center">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white mr-3 text-xs"
          style={{ backgroundColor: avatarColor }}
        >
          {initials}
        </div>
        <div>
          <div>{order.customer}</div>
          {order.orderId && (
            <div className="text-xs text-gray-500 font-mono mt-1">
              #{order.orderId}
            </div>
          )}
        </div>
      </td>

      {/* CONTACT */}
      <td className="p-4 text-xs text-gray-600 whitespace-pre-line">
        {order.email}
        {"\n"}
        {order.phone}
      </td>

      {/* ADDRESS */}
      <td className="p-4 text-xs text-gray-600 whitespace-pre-line">
        {order.address}
      </td>

      {/* ITEMS */}
      <td className="p-4 text-xs text-gray-600">
        {getItemDisplay(order.items)}
      </td>

      {/* AMOUNT + STATUS */}
      <td className="p-4 text-yellow-700 font-bold">
        {formatAmount(order.amount)}
        <div className="text-xs mt-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 border border-yellow-300 rounded-full inline-block">
          Pending
        </div>
      </td>

      {/* DATE */}
      <td className="p-4 text-xs text-gray-500">{formattedDate}</td>

      {/* ACTIONS - Updated to include FiEye icon */}
      <td className="p-4">
        <Link
          to={`/orders/${order.userId}/${order.id}`}
          className="px-3 py-1 text-xs font-semibold bg-yellow-600 text-white rounded shadow-md hover:bg-yellow-700 flex items-center justify-center" // Added flex classes
        >
          <FiEye className="w-3 h-3 mr-1" /> {/* 🟢 FiEye Icon Added */}
          View Details
        </Link>
      </td>
    </tr>
  );
});

/* ------------------------------------
    Main Component
------------------------------------ */
export default function PendingOrdersTable() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  /* Debounce search */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  /* Fetch Pending Orders */
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const ref = collectionGroup(db, "orders");
      const q = query(ref, where("status", "in", ["pending", "Pending"]));

      const snap = await getDocs(q);

      const list = snap.docs.map((doc) => {
        const data = doc.data();
        const customerInfo = data.customerInfo || {};
        const userId = extractUserIdFromPath(doc.ref.path);

        const address =
          data.address ||
          [customerInfo.address, customerInfo.city, customerInfo.pincode]
            .filter(Boolean)
            .join(", ");

        return {
          ...data,
          id: doc.id,
          userId,
          customer: data.customer || customerInfo.name || "Unknown Customer",
          email: data.email || customerInfo.email || "N/A",
          phone: data.phone || customerInfo.phone || "N/A",
          address: address || "N/A",
        };
      }).filter(order => !order.isReplacement);

      // newest first
      list.sort((a, b) => {
        const ta = a.createdAt?.toDate
          ? a.createdAt.toDate().getTime()
          : new Date(a.createdAt || 0).getTime();
        const tb = b.createdAt?.toDate
          ? b.createdAt.toDate().getTime()
          : new Date(b.createdAt || 0).getTime();
        return tb - ta;
      });

      setOrders(list);
      setFiltered(list);
    } catch (err) {
      console.error("Fetch pending error", err);
      setError(err.message);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  /* Filter search */
  useEffect(() => {
    if (!debouncedSearch) {
      setFiltered(orders);
      return;
    }

    const term = debouncedSearch.toLowerCase();
    const results = orders.filter((o) => {
      const combined = [
        o.customer,
        o.email,
        o.phone,
        o.address,
        o.orderId,
        o.id,
        JSON.stringify(o.items),
      ]
        .join(" ")
        .toLowerCase();
      return combined.includes(term);
    });

    setFiltered(results);
  }, [debouncedSearch, orders]);

  /* ------------- UI ------------- */

  if (loading)
    return (
      <div className="flex justify-center items-center h-64 bg-white rounded-lg shadow-xl">
        <div className="animate-spin h-12 w-12 border-b-2 border-yellow-600 rounded-full" />
        <p className="ml-4 text-gray-700">Loading Pending Orders...</p>
      </div>
    );

  if (error)
    return (
      <div className="max-w-xl mx-auto bg-red-100 border border-red-300 p-4 rounded mt-6">
        <h3 className="text-red-700 font-semibold mb-1">Error Loading Orders</h3>
        <p className="text-red-600 text-sm">{error}</p>
        <button
          onClick={fetchOrders}
          className="mt-3 flex items-center px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700"
        >
          <FiRefreshCw className="mr-2" /> Retry
        </button>
      </div>
    );

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="bg-white border rounded-lg shadow p-6 max-w-6xl mx-auto">
        
        {/* HEADER */}
        <div className="flex justify-between items-center border-b pb-4 mb-4">
          <h2 className="text-xl font-bold text-yellow-700 flex items-center">
            <FiClock className="w-5 h-5 text-yellow-700 mr-2" />
            Pending Orders ({orders.length})
          </h2>
        </div>

        {/* SEARCH BAR */}
        <div className="mt-4 mb-6 relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, email, phone, address, order ID, or items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-2/3 md:w-1/2 p-3 pl-10 border border-gray-300 rounded-lg 
                        focus:ring-yellow-500 focus:border-yellow-500 transition-colors text-sm bg-white"
          />
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                {[
                  "CUSTOMER",
                  "CONTACT",
                  "ADDRESS",
                  "ITEMS",
                  "AMOUNT",
                  "DATE",
                  "ACTIONS",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.length ? (
                filteredOrders.map((order) => (
                  <OrderRow key={order.userId + order.id} order={order} />
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center p-6 text-gray-500">
                    <FiClock className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    No pending orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}