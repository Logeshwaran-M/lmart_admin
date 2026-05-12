import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import TrendingProducts from "./TrendingProducts.jsx";
// Layout
import Sidebar from "./components/Sidebar.jsx";
import Header from "./components/Header.jsx";
import ProfilePage from "./components/ProfilePage.jsx";
import Dashboard from "./components/Dashboard.jsx";
import DeletedNews from "./components/Products/DeletedNews.jsx";

// Customers
import CustomerDirectory from "./components/Customers/Customer.jsx";
import DeletedCustomers from "./components/Customers/DeletedCustomers.jsx";

import OldeeProductsPage from "./components/OldeeProductsPage.jsx";

// Orders
import OrdersTable from "./components/Orders/OrdersTable.jsx";
import OrderDetail from "./components/Orders/OrdersDetails.jsx";
import PendingOrdersTable from "./components/Orders/PendingOrdersTable.jsx";
import { ProcessingOrdersTable } from "./components/Orders/ProcessingOrdersTable.jsx";
import { ShippedOrdersTable } from "./components/Orders/ShippedOrdersTable.jsx";
import { DeliveredOrdersTable } from "./components/Orders/DeliveredOrdersTable.jsx";
import CompletedOrdersTable from "./components/Orders/CompletedOrdersTable.jsx";
import { CancelledOrdersTable } from "./components/Orders/CancelledOrdersTable.jsx";
import ReturnOrdersTable from "./components/ReturnOrdersTable.jsx";
import RecentOrdersTable from "./components/RecentOrdersTable.jsx";
import DeleteProducts from "./components/Products/DeleteProducts.jsx";

// Others
import EarningsPage from "./components/EarningsPage.jsx";
import FilesManagementPage from "./components/FilesManagementPage.jsx";
import PostersPage from "./components/PostersPage.jsx";
import BannerPage from "./components/BannerPage.jsx";
import BulkUploadPage from "./components/BulkUploadPage.jsx";
import NotificationsPage from "./components/NotificationsPage.jsx";
import DeletedOldeeTable from "./components/DeletedOldee.jsx";

// Sellers
import ViewSellersPage from "./components/Seller/ViewSeller.jsx";
import DeletedSellersTable from "./components/Seller/DeletedSellersTable.jsx";
import EditSellerPage from "./components/Seller/EditSellerPage.jsx";

// Products
import Products from "./components/Products/Products.jsx";
import AddProductPage from "./components/Products/AddProduct.jsx";
import EditProductPage from "./components/Products/EditProduct.jsx";
import ManageSubcategories from "./components/Products/ManageSubcategories.jsx";
import ManageCategories from "./components/Products/ManageCategories.jsx";

// News
import ViewNews from "./components/Products/ViewNews.jsx";
import AddNewsToday from "./components/Products/AddNews.jsx";

// Login
import LoginPage from "./components/LoginPage.jsx";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase.js";

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("✅ Authenticated user:", user.uid);
  } else {
    signInAnonymously(auth)
      .then(() => console.log("✅ Signed in anonymously"))
      .catch((err) => console.error("❌ Auth error:", err));
  }
});

// Placeholder
const Placeholder = ({ title }) => (
    <div className="p-6 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-gray-600 mt-2">This is a placeholder page.</p>
    </div>
);

const DashboardLayout = ({ sidebarOpen, setSidebarOpen, toggleSidebar, onLogout, user }) => {
    return (
        <div className="flex h-screen bg-gray-50">

            {/* Sidebar */}
            <div className={`${sidebarOpen ? "fixed inset-y-0 left-0 z-30" : "hidden"} lg:block lg:static`}>
                <Sidebar onCloseSidebar={() => setSidebarOpen(false)} onLogout={onLogout} />
            </div>

            {/* Dim background when sidebar opens */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header onToggleSidebar={toggleSidebar} onLogout={onLogout} user={user} />
                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                    <Outlet />
                </main>
            </div>

        </div>
    );
};

export default function App() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // SAFE JSON PARSING
    const [user, setUser] = useState(() => {
        try {
            const stored = localStorage.getItem("adminUser");
            if (!stored || stored === "undefined" || stored === "null") return null;
            return JSON.parse(stored);
        } catch (err) {
            console.error("Invalid adminUser JSON:", err);
            return null;
        }
    });

    const [isLoggedIn, setIsLoggedIn] = useState(!!user);

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

    const handleLogin = (adminData) => {
        localStorage.setItem("adminUser", JSON.stringify(adminData));
        setUser(adminData);
        setIsLoggedIn(true);
    };

    const handleLogout = () => {
        localStorage.removeItem("adminUser");
        setUser(null);
        setIsLoggedIn(false);
    };

    return (
        <Router>
            <Routes>

                {/* PUBLIC ROUTE */}
                <Route
                    path="/login"
                    element={
                        isLoggedIn
                            ? <Navigate to="/" replace />
                            : <LoginPage onLogin={handleLogin} />
                    }
                />

                {/* FORGOT */}
                <Route path="/forgot-password" element={<Placeholder title="Forgot Password" />} />

                {/* PROTECTED ROUTES */}
                <Route
                    path="/"
                    element={
                        isLoggedIn ? (
                            <DashboardLayout
                                sidebarOpen={sidebarOpen}
                                setSidebarOpen={setSidebarOpen}
                                toggleSidebar={toggleSidebar}
                                onLogout={handleLogout}
                                user={user}
                            />
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                >

                    <Route index element={<Dashboard />} />
                    <Route path="dashboard" element={<Dashboard />} />

                    {/* Profile */}
                    <Route path="profile" element={<ProfilePage />} />

                    {/* Customers */}
                    <Route path="customers" element={<CustomerDirectory />} />
                    <Route path="customers/deleted" element={<DeletedCustomers />} />
                    <Route path="/products/deleted" element={<DeleteProducts />} />



                    {/* Orders */}
                    <Route path="orders" element={<Navigate to="all" replace />} />
                    <Route path="orders/all" element={<OrdersTable />} />
                    <Route path="/orders/:userId/:orderId" element={<OrderDetail />} />
                    <Route path="orders/pending" element={<PendingOrdersTable />} />
                    <Route path="orders/processing" element={<ProcessingOrdersTable />} />
                    <Route path="orders/shipped" element={<ShippedOrdersTable />} />
                    <Route path="orders/delivered" element={<DeliveredOrdersTable />} />
                    <Route path="orders/completed" element={<CompletedOrdersTable />} />
                    <Route path="orders/cancelled" element={<CancelledOrdersTable />} />
                    <Route path="return-orders" element={<ReturnOrdersTable />} />
                    <Route path="recent-orders" element={<RecentOrdersTable />} />
                    <Route path="trending-products" element={<TrendingProducts />} />


                    {/* Others */}
                    <Route path="earnings" element={<EarningsPage />} />
                    <Route path="files" element={<FilesManagementPage />} />
                    <Route path="banners" element={<PostersPage />} />
                    {/* <Route path="banner" element={<BannerPage />} /> */}
                    <Route path="bulk-upload" element={<BulkUploadPage />} />
                    <Route path="notifications" element={<NotificationsPage />} />

                    {/* Sellers */}
                    <Route path="sellers/all" element={<ViewSellersPage />} />
                    <Route path="sellers/delete" element={<DeletedSellersTable />} />
                    <Route path="sellers/view/:id" element={<EditSellerPage />} />
                    <Route path="sellers/edit/:id" element={<EditSellerPage />} />
                    
                    <Route path="/oldee" element={<OldeeProductsPage />} />
                     <Route path="/oldee/delete" element={<DeletedOldeeTable />} />

                    {/* Products */}
                    <Route path="products" element={<Navigate to="view" replace />} />
                    <Route path="products/view" element={<Products />} />
                    <Route path="products/add" element={<AddProductPage />} />
                    <Route path="products/edit/:productId" element={<EditProductPage />} />
                    <Route path="products/subcategories" element={<ManageSubcategories />} />
                    <Route path="products/categories" element={<ManageCategories />} />

                    {/* News */}
                    <Route path="news" element={<Navigate to="view" replace />} />
                    <Route path="news/view" element={<ViewNews />} />
                    <Route path="news/add" element={<AddNewsToday />} />
                    <Route path="news/edit/:newsId" element={<AddNewsToday />} />
                    <Route path="news/deleted" element={<DeletedNews />} />



                    {/* 404 */}
                    <Route path="*" element={<Placeholder title="404 — Page not found" />} />

                </Route>
            </Routes>
        </Router>
    );
}
