// EarningsPage.jsx
import React, { useState, useEffect } from 'react';
import {
  collectionGroup,
  getDocs,
  query
} from "firebase/firestore";

import { db } from "../firebase";

import {
  FiDollarSign,
  FiCalendar,
  FiTrendingUp,
  FiAlertCircle,
  FiXCircle
} from 'react-icons/fi';


// -----------------------------
// Summary Card Component
// -----------------------------
const SummaryCard = ({ title, amount, icon: Icon, bgColor, textColor }) => (
  <div className={`p-6 rounded-xl shadow-lg flex flex-col justify-between h-32 ${bgColor}`}>
    <div className="flex items-center justify-between">
      <h3 className={`text-sm font-semibold ${textColor}`}>{title}</h3>
      <Icon className={`w-6 h-6 ${textColor}`} />
    </div>
    <p className={`text-3xl font-bold ${textColor}`}>
      ₹{Number(amount || 0).toLocaleString("en-IN")}
    </p>
  </div>
);



// -----------------------------------------------------
// MAIN COMPONENT — Fetch ALL ORDERS from ALL USERS
// -----------------------------------------------------
export default function EarningsPage() {

  const [timePeriod, setTimePeriod] = useState("Monthly");
  const [loading, setLoading] = useState(true);

  const [summaryData, setSummaryData] = useState({
    earned: 0,
    upcoming: 0,
    cancelled: 0
  });

  const [breakdown, setBreakdown] = useState({
    totalOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    upcomingOrders: 0,
    averageOrderValue: 0,
    bestSellingProduct: "N/A",
    lastOrderDate: "N/A"
  });

  const timePeriods = ["Weekly", "Monthly", "Yearly"];


  // -----------------------------------------------------
  // FETCH ALL USERS' ORDERS USING collectionGroup("orders")
  // -----------------------------------------------------
  useEffect(() => {
    const fetchEarnings = async () => {

      setLoading(true);

      try {
        // 🔥 Fetch ALL orders from ALL users
        const ordersRef = collectionGroup(db, "orders");
        const ordersQuery = query(ordersRef);
        const snapshot = await getDocs(ordersQuery);

        let earned = 0;
        let upcoming = 0;
        let cancelled = 0;

        let totalOrders = 0;
        let deliveredOrders = 0;
        let cancelledOrders = 0;
        let upcomingOrders = 0;

        let totalAmount = 0;
        let lastOrderDate = null;
        let productCount = {};

        // Time Range Filtering
        const now = new Date();
        let periodStart = new Date();

        if (timePeriod === "Weekly") periodStart.setDate(now.getDate() - 7);
        else if (timePeriod === "Monthly") periodStart.setMonth(now.getMonth() - 1);
        else if (timePeriod === "Yearly") periodStart.setFullYear(now.getFullYear() - 1);


        snapshot.forEach(doc => {
          const data = doc.data();
          const orderDate = data.createdAt?.toDate?.() || null;

          if (!orderDate || orderDate < periodStart) return;

          totalOrders += 1;

          const amount = Number(data.amount || 0);
          totalAmount += amount;

          // Latest Order Date
          if (!lastOrderDate || orderDate > lastOrderDate) {
            lastOrderDate = orderDate;
          }

          // Summary Amounts
          if (data.status === "Delivered") {
            earned += amount;
            deliveredOrders += 1;
          }
          else if (["Pending", "Processing", "Shipped"].includes(data.status)) {
            upcoming += amount;
            upcomingOrders += 1;
          }
          else if (["Cancelled", "Refunded"].includes(data.status)) {
            cancelled += amount;
            cancelledOrders += 1;
          }

          // Best Selling Product
          if (Array.isArray(data.items)) {
            data.items.forEach(item => {
              const name = item.name || "Unknown Product";
              productCount[name] = (productCount[name] || 0) + (item.quantity || 1);
            });
          }
        });

        // Best selling product
        let bestSellingProduct = "N/A";
        if (Object.keys(productCount).length > 0) {
          bestSellingProduct = Object.entries(productCount)
            .sort((a, b) => b[1] - a[1])[0][0];
        }

        // Avg Value
        const averageOrderValue =
          totalOrders > 0 ? Math.round(totalAmount / totalOrders) : 0;


        // Update States
        setSummaryData({ earned, upcoming, cancelled });

        setBreakdown({
          totalOrders,
          deliveredOrders,
          cancelledOrders,
          upcomingOrders,
          averageOrderValue,
          bestSellingProduct,
          lastOrderDate: lastOrderDate
            ? lastOrderDate.toLocaleString("en-IN")
            : "N/A"
        });

      } catch (error) {
        console.error("Error loading all earnings:", error);
      }

      setLoading(false);
    };

    fetchEarnings();
  }, [timePeriod]);



  // -----------------------------------------------------
  // UI Rendering
  // -----------------------------------------------------
  return (
    <div className="flex-1 p-6 lg:p-8 bg-gray-100 min-h-screen">
      <div className="orders-container bg-white rounded-lg shadow-xl p-6">


        {/* Header */}
        <div className="flex justify-between items-start pb-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <FiDollarSign className="w-5 h-5 mr-2 text-purple-600" /> Earnings (All Users)
          </h2>

          {/* Time Selector */}
          <div className="flex items-center p-1 bg-gray-100 rounded-lg">
            {timePeriods.map(period => (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                className={`px-4 py-1 text-xs font-semibold rounded-md transition-colors duration-200
                  ${timePeriod === period
                    ? "bg-white shadow-md text-purple-700"
                    : "text-gray-600 hover:bg-gray-200"}`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>



        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <SummaryCard
            title="EARNED"
            amount={summaryData.earned}
            icon={FiTrendingUp}
            bgColor="bg-green-50/70 border border-green-200"
            textColor="text-green-700"
          />
          <SummaryCard
            title="UPCOMING"
            amount={summaryData.upcoming}
            icon={FiAlertCircle}
            bgColor="bg-blue-50/70 border border-blue-200"
            textColor="text-blue-700"
          />
          <SummaryCard
            title="CANCELLED"
            amount={summaryData.cancelled}
            icon={FiXCircle}
            bgColor="bg-red-50/70 border border-red-200"
            textColor="text-red-700"
          />
        </div>



        {/* BREAKDOWN SECTION */}
        <div className="mt-10">
          <div className="flex items-center pb-3">
            <FiCalendar className="w-5 h-5 mr-2 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-800">Breakdown</h3>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            {loading ? (
              <p className="text-gray-500 italic">Loading breakdown...</p>
            ) : breakdown.totalOrders === 0 ? (
              <p className="text-gray-500 italic">
                No order data found for selected time period.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <p><strong>Total Orders:</strong> {breakdown.totalOrders}</p>
                <p><strong>Delivered Orders:</strong> {breakdown.deliveredOrders}</p>
                <p><strong>Upcoming Orders:</strong> {breakdown.upcomingOrders}</p>
                <p><strong>Cancelled Orders:</strong> {breakdown.cancelledOrders}</p>
                <p><strong>Average Order Value:</strong> ₹{breakdown.averageOrderValue.toLocaleString("en-IN")}</p>
                <p><strong>Best Selling Product:</strong> {breakdown.bestSellingProduct}</p>
                <p><strong>Latest Order Date:</strong> {breakdown.lastOrderDate}</p>
              </div>
            )}
          </div>
        </div>


      </div>
    </div>
  );
}
