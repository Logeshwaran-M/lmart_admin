// src/pages/Orders/OrderDetail.jsx

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

// Icons
import {
  FiShoppingBag,
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiCalendar,
  FiArrowLeft,
  FiEdit,
  FiDownload,
  FiImage
} from "react-icons/fi";

// Firebase
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
// 🛑 Note: Adjust the path to your firebase config if needed
import { db, Timestamp } from "../../firebase";

// jsPDF (vector-based PDF)
import { jsPDF } from "jspdf";

// Logo
// 🛑 Note: Ensure this path is correct for your logo image
import logo from "../../assets/logo.jpeg";

// ======================================================================
// --- 1. Helper Functions ---
// ======================================================================

const formatAmount = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/** Remove ₹ sign + thousands separator for clean PDF output */
const cleanNumber = (value) =>
  String(value).replace("₹", "").replace(/,/g, "").trim();

/** Firestore Timestamp handling */
const formatFirestoreTimestamp = (timestamp) => {
  if (!timestamp) return "N/A";

  let date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);

  if (isNaN(date.getTime())) return "Invalid Date";

  return date.toLocaleString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/** Number to Indian Rupees words */
const numberToWords = (n) => {
  if (!n) return "Zero Rupees Only";

  const num = Math.floor(n);
  const words = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
  ];

  const toWordsBelow100 = (m) => {
    if (m === 0) return "";
    if (m < 20) return words[m] + " ";
    return tens[Math.floor(m / 10)] + " " + words[m % 10] + " ";
  };

  let output = "";
  let temp = num;

  if (temp >= 10000000) {
    output += toWordsBelow100(Math.floor(temp / 10000000)) + "Crore ";
    temp %= 10000000;
  }
  if (temp >= 100000) {
    output += toWordsBelow100(Math.floor(temp / 100000)) + "Lakh ";
    temp %= 100000;
  }
  if (temp >= 1000) {
    output += toWordsBelow100(Math.floor(temp / 1000)) + "Thousand ";
    temp %= 1000;
  }
  if (temp >= 100) {
    output += toWordsBelow100(Math.floor(temp / 100)) + "Hundred ";
    temp %= 100;
  }
  if (temp > 0) output += toWordsBelow100(temp);

  return `${output.trim()} Rupees Only`;
};

/** Item formatting for UI */
const formatOrderItems = (items) => {
  if (!items || items.length === 0) return "No items listed.";

  return items
    .map((item, index) => {
      const name = (item.name || "Item").replace(/'/g, "");
      const qty = item.quantity || 1;
      const itemAmount = item.amount || (item.price || 0) * qty;
      const price = formatAmount(itemAmount);

      return `${index + 1}. ${name} (x${qty}) @ ${formatAmount(item.price || 0)} \n     Amount: ${price}`;
    })
    .join("\n\n");
};

/** Calculate totals */
const calculateInvoiceTotals = (order) => {
  const items = order.items || [];
  const delivery = Number(order.deliveryCharge || 0);

  const subTotal = items.reduce(
    (sum, i) => sum + (i.amount || (i.price || 0) * (i.quantity || 0)),
    0
  );

  return {
    subTotal,
    deliveryCharges: delivery,
    grandTotal: subTotal + delivery,
  };
};

/** Convert image → Base64 for PDF */
const loadImageAsBase64 = (path) =>
  fetch(path)
    .then((res) => res.blob())
    .then(
      (blob) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })
    );



const OrderDetail = () => {
  const { userId, orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const ORDER_STATUSES = [
    "Pending",
    "Processing",
    "Shipped",
    "Delivered",
    "Completed",
    "Cancelled",
    "Return_requested",
    "Refund_Completed"
  ];
  const isFinalStatus =
    order?.status === "Completed" ||
    order?.status === "Cancelled" ||
    order?.status === "Refund_Completed";


  const isLegacyOrder = userId === "unknown_user" || !userId;

  // Define the function to navigate back
  const handleBackToList = () => {
    navigate("/orders"); // Adjust the path to your main orders page
  };


  // ---------------------------------------------------------
  // UPDATE ORDER STATUS
  // ---------------------------------------------------------  
  const updateOrderStatus = async (newStatus) => {
    if (isLegacyOrder || !orderId || !order || newStatus === order.status) {
      if (isLegacyOrder)
        alert("Cannot update legacy orders stored in root collection.");
      return;
    }

    const oldStatus = order.status;
    const oldUpdatedAt = order.updatedAt;

    setIsUpdatingStatus(true);

    try {
      const newTimestamp = Timestamp.fromDate(new Date());

      setOrder((prev) =>
        prev ? { ...prev, status: newStatus, updatedAt: newTimestamp } : null
      );

      const orderRef = doc(db, "users", userId, "orders", orderId);

      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: newTimestamp,
      });

      // ✅ If refund completed, also update returnRequests
      if (newStatus === "Refund_Completed") {

        const returnQuery = query(
          collection(db, "users", userId, "returnRequests"),
          where("firestoreOrderId", "==", orderId)
        );

        const snapshot = await getDocs(returnQuery);

        console.log("Snapshot size:", snapshot.size);

        if (snapshot.empty) {
          console.warn("No matching return request found.");
        } else {
          for (const docSnap of snapshot.docs) {
            await updateDoc(docSnap.ref, {
              status: "completed",
              refundCompletedAt: newTimestamp
            });
          }
        }
      }

    } catch (err) {
      console.error("Update Status Error:", err);
      alert(`Failed to update status: ${err.message}`);

      setOrder((prev) =>
        prev ? { ...prev, status: oldStatus, updatedAt: oldUpdatedAt } : null
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId || !db) {
        setError("Missing Order ID");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const orderRef = doc(db, "users", userId, "orders", orderId);
        const docSnap = await getDoc(orderRef);

        if (!docSnap.exists()) {
          setError(`Order not found: ${orderId}`);
          return;
        }

        const orderData = docSnap.data();
        const customerInfo = orderData.customerInfo || {};

        // ✅ FIXED: Preserve the exact status from Firestore
        // Don't default to "Pending" if status exists
        const orderStatus = orderData.status || "Pending";

        // ✅ normalize items + sellerId
        const normalizedItems = orderData.items
          ? Array.isArray(orderData.items)
            ? orderData.items.map(item => ({
              ...item,
              sellerId:
                item.sellerId ||
                item.seller ||
                orderData.primarySellerId ||
                orderData.sellerId ||
                "N/A",
            }))
            : Object.values(orderData.items).map(item => ({
              ...item,
              sellerId:
                item.sellerId ||
                item.seller ||
                orderData.primarySellerId ||
                orderData.sellerId ||
                "N/A",
            }))
          : [];

        setOrder({
          id: docSnap.id,
          userId,
          ...orderData,
          status: orderStatus, // Use the exact status from Firestore
          items: normalizedItems,
          customer: orderData.customer || customerInfo.name || "N/A",
          email: orderData.email || customerInfo.email || "N/A",
          phone: orderData.phone || customerInfo.phone || "N/A",
          address:
            orderData.address ||
            [customerInfo.address, customerInfo.city, customerInfo.pincode]
              .filter(Boolean)
              .join(", ") ||
            "N/A",
          deliveryCharge: orderData.deliveryCharge || 0,
          paymentMethod: orderData.paymentMethod || "COD",
        });
      } catch (err) {
        console.error(err);
        setError("Failed to load order");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, userId, isLegacyOrder]);

  // ======================================================================
  // --- 3. PDF GENERATION (FINAL UPDATED VERSION) ---
  // ======================================================================

  const handleDownloadInvoice = async () => {
    if (!order) return;

    const totals = calculateInvoiceTotals(order);

    // -------------------------
    // COMPANY DETAILS (Customize these details)
    // -------------------------
    const COMPANY = {
      name: "L Mart",
      phone: "+91-87629 78777",
      email: "info@lmart.com",
      line1: "57 Industrial Estate,",
      line2: "Sindagi-586 128",
    };

    // Handle potential logo loading failure
    let logoBase64;
    try {
      logoBase64 = await loadImageAsBase64(logo);
    } catch (err) {
      console.warn("Failed to load logo for PDF. Proceeding without image.", err);
      logoBase64 = null;
    }


    // -------------------------
    // PDF SETUP
    // -------------------------
    const pdf = new jsPDF("p", "mm", "a4");
    const margin = 15;
    const rightX = 200 - margin;
    let y = margin;

    // -------------------------
    // LOGO + RIGHT-SIDE HEADER
    // -------------------------
    if (logoBase64) {
      pdf.addImage(logoBase64, "PNG", margin, y, 35, 20);
    } else {
      // Placeholder text if image fails to load
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text(COMPANY.name, margin, y + 10);
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.text("TAX INVOICE", rightX, y + 10, { align: "right" });

    pdf.setFontSize(10);
    pdf.text(`Invoice No: ${order.orderId || order.id}`, rightX, y + 18, {
      align: "right",
    });
    pdf.text(
      `Date: ${formatFirestoreTimestamp(order.createdAt || order.date)}`,
      rightX,
      y + 24,
      { align: "right" }
    );

    y = Math.max(y + 32, 50);

    // -------------------------
    // COMPANY INFO
    // -------------------------
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(COMPANY.name, margin, y);

    y += 6;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(COMPANY.line1, margin, y);
    y += 5;
    pdf.text(COMPANY.line2, margin, y);
    y += 5;

    pdf.text(`Phone: ${COMPANY.phone}`, margin, y);
    y += 5;

    pdf.text(`Email: ${COMPANY.email}`, margin, y);

    // -------------------------
    // SHIP TO (RIGHT SIDE)
    // -------------------------
    let rightY = 50;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text("SHIP TO:", 115, rightY);

    rightY += 6;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(order.customer, 115, rightY);
    rightY += 5;

    // Split the address into multiple lines for better formatting
    const addressLines = pdf.splitTextToSize(order.address, 70);
    addressLines.forEach(line => {
      pdf.text(line, 115, rightY);
      rightY += 4;
    });
    rightY += 2;

    pdf.text(`Email: ${order.email}`, 115, rightY);
    rightY += 5;

    pdf.text(`Phone: ${order.phone}`, 115, rightY);

    y = Math.max(y, rightY) + 12;

    // -------------------------
    // TABLE HEADER
    // -------------------------
    const colIndexX = margin;
    const colItemX = margin + 10;
    const colQtyX = 135;
    const colUnitX = 160;
    const colAmtX = 195;

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");

    pdf.text("SNO", colIndexX, y);
    pdf.text("Item", colItemX, y);
    pdf.text("Qty", colQtyX, y, { align: "center" });
    pdf.text("Unit Price", colUnitX, y, { align: "right" });
    pdf.text("Amount", colAmtX, y, { align: "right" });

    y += 6;
    pdf.line(margin, y, rightX, y);
    y += 6;

    pdf.setFont("helvetica", "normal");

    // -------------------------
    // ITEMS LOOP
    // -------------------------
    order.items.forEach((item, index) => {
      const amount = item.amount || (item.price * item.quantity);

      const variantDetails = [
        item.selectedColor && `Color: ${item.selectedColor}`,
        item.selectedSize && `Size: ${item.selectedSize}`,
        item.selectedRam && `RAM: ${item.selectedRam}`,
      ].filter(Boolean).join(" | ");

      const itemText = variantDetails
        ? `${item.name}\n(${variantDetails})`
        : item.name;

      const wrappedItemText = pdf.splitTextToSize(itemText, 80);

      pdf.text(String(index + 1), colIndexX, y);
      pdf.text(wrappedItemText, colItemX, y);
      pdf.text(String(item.quantity), colQtyX, y, { align: "center" });

      pdf.text(cleanNumber(formatAmount(item.price)), colUnitX, y, {
        align: "right",
      });

      pdf.text(cleanNumber(formatAmount(amount)), colAmtX, y, {
        align: "right",
      });

      // dynamic row height
      y += wrappedItemText.length * 5 + 2;
    });


    y += 5;
    pdf.line(margin, y, rightX, y);
    y += 10;

    // -------------------------
    // TOTALS SECTION (NUMERIC)
    // -------------------------
    pdf.setFont("helvetica", "normal");

    pdf.text("Sub Total", colUnitX, y, { align: "right" });
    pdf.text(cleanNumber(formatAmount(totals.subTotal)), colAmtX, y, {
      align: "right",
    });
    y += 6;

    pdf.text("Delivery Charges", colUnitX, y, { align: "right" });
    pdf.text(cleanNumber(formatAmount(totals.deliveryCharges)), colAmtX, y, {
      align: "right",
    });

    y += 10;

    pdf.setFont("helvetica", "bold");
    pdf.text("Grand Total", colUnitX, y, { align: "right" });
    pdf.text(cleanNumber(formatAmount(totals.grandTotal)), colAmtX, y, {
      align: "right",
    });

    y += 12;

    // -------------------------
    // AMOUNT IN WORDS & PAYMENT DETAILS (Matching the image)
    // -------------------------

    // 1. Grand Total (In Words)
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("Grand Total (In Words):", margin, y);

    y += 5;

    pdf.setFont("helvetica", "normal");
    // Use the numberToWords helper for the value
    pdf.splitTextToSize(numberToWords(totals.grandTotal), 180).forEach(line => {
      pdf.text(line, margin, y);
      y += 5;
    });

    y += 5; // Extra space

    // 2. Payment Method
    pdf.setFont("helvetica", "normal");
    pdf.text(`Payment Method: ${order.paymentMethod}`, margin, y);

    y += 5;

    // 3. Note: Thank you for your business!
    pdf.text("Note: Thank you for your business!", margin, y);

    y += 5;

    // 4. All amounts are inclusive of applicable taxes.
    pdf.text("All amounts are inclusive of applicable taxes.", margin, y);


    // -------------------------
    // SAVE PDF
    // -------------------------
    pdf.save(`invoice-${order.orderId || order.id}.pdf`);
  };
  // ======================================================================
  // --- 4. RENDER UI ---
  // ======================================================================

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 bg-white rounded-lg shadow-xl p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        <p className="ml-4 text-gray-700 font-medium">
          Loading Order <span className="font-mono">{orderId}</span>...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-4xl mx-auto mt-10">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline ml-2">{error}</span>
        <button
          onClick={handleBackToList}
          className="ml-4 text-red-500 underline"
        >
          Back to list
        </button>
      </div>
    );
  }

  if (!order) return null;

  const totals = calculateInvoiceTotals(order);
  const totalOriginalPrice =
    order.items?.reduce(
      (sum, item) =>
        sum + (item.originalPrice || item.price || 0) * (item.quantity || 1),
      0
    ) || 0;

  const totalDiscount = totalOriginalPrice - totals.subTotal;
  const totalChargedAmount = totals.grandTotal;

  return (
    <div className="p-6 lg:p-8 bg-gray-100 min-h-screen">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-2xl p-8 border border-gray-200">

        {/* ------------------------- */}
        {/* Header Title */}
        {/* ------------------------- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-6 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-red-600 flex items-center">
              Order Details
              <span className="text-lg font-mono text-gray-600 ml-3">
                #{order.orderId || order.id}
              </span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Payment ID:{" "}
              <span className="font-mono">{order.paymentId || "N/A"}</span>
            </p>
          </div>

          {/* ------------------------- */}
          {/* Status Selector */}
          {/* ------------------------- */}
          <div className="mt-4 md:mt-0 flex items-center gap-3">
            <FiEdit className="w-5 h-5 mr-2 text-gray-400" />
            <select
              value={order?.status ?? "Pending"}
              onChange={(e) => updateOrderStatus(e.target.value)}
              disabled={isUpdatingStatus || isLegacyOrder || isFinalStatus}
              className={`px-4 py-2 text-sm font-semibold rounded-lg border shadow-sm transition-colors
                ${order.status === "Delivered"
                  ? "bg-green-100 border-green-300 text-green-700"
                  : order.status === "Completed"
                    ? "bg-emerald-100 border-emerald-300 text-emerald-700"
                    : order.status === "Return_requested"
                      ? "bg-orange-100 border-orange-300 text-orange-700"
                      : order.status === "Cancelled"
                        ? "bg-red-100 border-red-300 text-red-700"
                        : order.status === "Shipped"
                          ? "bg-blue-100 border-blue-300 text-blue-700"
                          : order.status === "Refund_Completed"
                            ? "bg-purple-100 border-purple-300 text-purple-700"
                            : "bg-yellow-100 border-yellow-300 text-yellow-700"
                }
                ${isUpdatingStatus || isLegacyOrder || isFinalStatus
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer"
                }
              `}
            >
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status} disabled={isLegacyOrder}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ------------------------- */}
        {/* SUMMARY CARDS */}
        {/* ------------------------- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">

          {/* Customer Info */}
          <div className="p-5 bg-white rounded-lg border border-gray-200 shadow-md">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center mb-4">
              <FiUser className="w-5 h-5 mr-2 text-red-500" /> Customer Info
            </h2>

            <div className="space-y-3">
              <p><span className="font-medium">Name:</span> {order.customer}</p>

              <p className="flex items-center">
                <FiMail className="w-4 h-4 mr-2 text-gray-400" />
                {order.email}
              </p>

              <p className="flex items-center">
                <FiPhone className="w-4 h-4 mr-2 text-gray-400" />
                {order.phone}
              </p>
            </div>

            {!isLegacyOrder && (
              <p className="text-xs mt-2 border-t pt-2">
                <span className="font-medium">User ID:</span> {order.userId}
              </p>
            )}
            {order?.items?.[0]?.sellerId && (
              <p className="text-xs text-gray-500 mt-2">
                <span className="font-medium">Seller ID:</span>{" "}
                <span className="font-mono">
                  {order.items[0].sellerId}
                </span>
              </p>
            )}

          </div>

          {/* Order Summary */}
          <div className="p-5 bg-white rounded-lg border border-gray-200 shadow-md">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center mb-4">
              <FiShoppingBag className="w-5 h-5 mr-2 text-red-500" /> Order Summary
            </h2>

            <p className="flex items-center">
              <FiCalendar className="w-4 h-4 mr-2 text-gray-400" />
              {formatFirestoreTimestamp(order.date || order.createdAt)}
            </p>

            <div className="mt-3">
              <p className="font-medium">Grand Total:</p>
              <span className="text-green-600 font-bold text-xl">
                {formatAmount(totalChargedAmount)}
              </span>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="p-5 bg-white rounded-lg border border-gray-200 shadow-md">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center mb-4">
              <FiMapPin className="w-5 h-5 mr-2 text-red-500" /> Shipping Address
            </h2>

            <p className="text-gray-700">{order.address}</p>

            <div className="grid grid-cols-2 gap-2 mt-3">
              <p><span className="font-medium">City:</span> {order.customerInfo?.city || "N/A"}</p>
              <p><span className="font-medium">Pincode:</span> {order.customerInfo?.pincode || "N/A"}</p>
            </div>
          </div>
        </div>

        {/* ------------------------- */}
        {/* ITEMS ORDERED WITH IMAGES */}
        {/* ------------------------- */}
        <div className="mb-8 p-5 bg-white rounded-lg border border-gray-200 shadow-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            📦 Items Ordered ({order.items?.length || 0})
          </h2>


          <div className="space-y-6">

            {order.items?.map((item, index) => (
              <div key={index} className="flex flex-col md:flex-row gap-4 p-4 bg-gray-50 rounded-lg border">
                {/* Product Image */}
                <div className="md:w-1/4">
                  <div className="flex items-center justify-center w-full h-48 md:h-40 bg-white rounded-lg border p-2">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name || `Item ${index + 1}`}
                        className="max-h-full max-w-full object-contain rounded"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://via.placeholder.com/150x150?text=No+Image";
                        }}

                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center w-full h-full text-gray-400">
                        <FiImage className="w-12 h-12 mb-2" />
                        <span className="text-sm">No Image Available</span>
                      </div>
                    )}



                  </div>
                </div>

                {/* Product Details */}
                <div className="md:w-3/4">

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">



                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-1">
                        {item.name || `Item ${index + 1}`}
                      </h3>

                      <p className="text-sm text-gray-600">
                        {item.selectedColor && <>Color: {item.selectedColor} </>}
                        {item.selectedSize && <>| Size: {item.selectedSize} </>}
                        {item.selectedRam && <>| RAM: {item.selectedRam}</>}
                      </p>

                      {item.category && (
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-medium">Category:</span> {item.category}
                        </p>
                      )}
                      {item.brand && (
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-medium">Brand:</span> {item.brand}
                        </p>
                      )}
                    </div>



                    <div className="text-right">
                      <div className="mb-2">
                        <span className="text-sm text-gray-600">Unit Price: </span>
                        <span className="font-medium">{formatAmount(item.price || 0)}</span>
                      </div>
                      <div className="mb-2">
                        <span className="text-sm text-gray-600">Total Price: </span>
                        <span className="text-lg font-bold text-red-600">
                          {formatAmount(item.amount || (item.price || 0) * (item.quantity || 1))}
                        </span>
                      </div>
                      {item.originalPrice && item.originalPrice > (item.price || 0) && (
                        <div className="text-sm">
                          <span className="text-gray-600">Original: </span>
                          <span className="line-through text-gray-500">
                            {formatAmount(item.originalPrice)}
                          </span>
                          <span className="text-green-600 ml-2">
                            -{formatAmount((item.originalPrice * (item.quantity || 1)) - (item.amount || (item.price || 0) * (item.quantity || 1)))}
                          </span>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Item Description (if available) */}
                  {item.description && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Description: </span>
                        {item.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* -------------------------
          PRICE BREAKDOWN 
         ------------------------- */}
        <div className="flex justify-end mb-8">
          <div className="w-full sm:w-80 p-4 bg-gray-50 border rounded-lg shadow-inner">
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-2">Price Details</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Original Price:</span>
                <span className="font-mono text-gray-600 line-through">
                  {formatAmount(totalOriginalPrice)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Discount:</span>
                <span className="text-green-600 font-semibold">
                  - {formatAmount(totalDiscount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Sub Total:</span>
                <span className="font-mono">{formatAmount(totals.subTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Charge:</span>
                <span className="font-mono text-blue-600">
                  + {formatAmount(totals.deliveryCharges)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-300">
                <span className="text-lg font-bold">Total Payable:</span>
                <span className="text-xl font-bold text-red-600">
                  {formatAmount(totalChargedAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------- */}
        {/* ACTION BUTTONS */}
        {/* ------------------------- */}
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={handleBackToList}
            className="px-6 py-3 bg-gray-300 hover:bg-gray-400 rounded-lg font-semibold shadow-md"
          >
            <FiArrowLeft className="inline w-5 h-5 mr-2" /> Back to Orders List
          </button>

          <button
            onClick={handleDownloadInvoice}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold shadow-md"
          >
            <FiDownload className="inline w-5 h-5 mr-2" /> Download Invoice PDF
          </button>
        </div>
      </div>
    </div>
  );

  // 🛑 This closing brace ensures the 'export default' is at the top level
};

export default OrderDetail;