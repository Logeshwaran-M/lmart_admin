// components/Sidebar.jsx
import React, { useState, useEffect } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";

import {
  FiBarChart2,
  FiUsers,
  FiShoppingBag,
  FiArchive,
  FiDollarSign,
  FiBox,
  FiFileText,
  FiImage,
  FiMenu,
  FiPackage,
  FiClock,
  FiUploadCloud,
  FiLogOut,
  FiChevronUp,
  FiBell,
  FiX,
  FiUserPlus,
  FiRss,
  FiUser,
  FiStar,   // ADDED for Trending
  FiZap ,
  FiTrash2     // ✅ FIXED (this was missing)
} from "react-icons/fi";



const PRIMARY_RED = "bg-gradient-to-r from-red-600 to-red-700";
const HOVER_RED = "hover:from-red-700 hover:to-red-800";
const LOGOUT_BUTTON_CLASS = `${PRIMARY_RED} ${HOVER_RED} w-full p-3 rounded-xl text-white font-bold flex items-center justify-center transition-all duration-300 shadow-xl`;

const ACTIVE_BG = "bg-purple-100/70 backdrop-blur-md";
const ACTIVE_TEXT = "text-purple-800 font-bold";
const ACTIVE_ICON_COLOR = "text-purple-600";
const HOVER_BASE = "hover:bg-gray-100/70";
const DEFAULT_TEXT_COLOR = "text-gray-600";

// Button Component
const SidebarLinkButton = ({ children, isActive, hasDropdown, onToggleDropdown, isOpen }) => (
  <div
    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-300 group font-semibold text-sm 
      ${isActive
        ? `${ACTIVE_BG} ${ACTIVE_TEXT} shadow-lg shadow-purple-200/50`
        : `${HOVER_BASE} text-gray-700`}`}
  >
    {children}

    {hasDropdown && (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleDropdown();
        }}
        className="p-1 -mr-2 rounded-full hover:bg-gray-200/50"
      >
        <FiChevronUp
          className={`w-4 h-4 transition-transform ${
            isOpen ? "rotate-0" : "rotate-180"
          } ${isActive ? ACTIVE_ICON_COLOR : "text-gray-600"}`}
        />
      </button>
    )}
  </div>
);

// Dropdown Section
const DropdownLink = ({ text, isSubActive, to, onClick }) => (
  <Link to={to} onClick={onClick} className="w-full">
    <div
      className={`w-full text-left p-2 pl-5 rounded-lg text-sm border-l-4 transition-all font-medium
        ${isSubActive
          ? `bg-blue-100/80 border-blue-600 text-blue-800 font-semibold`
          : `border-transparent ${DEFAULT_TEXT_COLOR} ${HOVER_BASE}`}`}
    >
      {text}
    </div>
  </Link>
);

export default function Sidebar({ onCloseSidebar, onLogout }) {
  const location = useLocation();
  const [openDropdown, setOpenDropdown] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const toggleDropdown = (key) => {
    setOpenDropdown((prev) => (prev === key ? null : key));
  };

  const handleLogoutConfirmed = () => {
    localStorage.removeItem("adminUser");
    onLogout?.();
    onCloseSidebar?.();
  };

  // All Navigation Items
  const navigationItems = [
    { text: "Overview", icon: FiBarChart2, key: "Overview", path: "/" },
 {
  text: "Customers",
  icon: FiUsers,
  key: "Customers",
  path: "/customers"
},
{ 
      text: "Market News",
      icon: FiRss,
      key: "News",
      path: "/news/view",
      
    },

 

    {
  text: "Oldee",
  icon: FiUser,
  key: "Oldee",
  path: "/oldee"
}
,
{ text: "Recent Orders", icon: FiClock, key: "Recent Orders", path: "/recent-orders" },
    // Orders Menu
    {
      text: "Orders",
      icon: FiShoppingBag,
      key: "Orders",
      path: "/orders/all",
      hasDropdown: true,
      dropdownContent: [
        { text: "All Orders", path: "/orders/all" },
        { text: "Pending", path: "/orders/pending" },
        { text: "Processing", path: "/orders/processing" },
        { text: "Shipped", path: "/orders/shipped" },
        { text: "Delivered", path: "/orders/delivered" },
        { text: "Completed", path: "/orders/completed" },
        { text: "Cancelled", path: "/orders/cancelled" }
      ]
    },

    { text: "Return Orders", icon: FiArchive, key: "Return Orders", path: "/return-orders" },
     {
      text: "Products",
      icon: FiBox,
      key: "Products",
      path: "/products/view",
      hasDropdown: true,
      dropdownContent: [
        { text: "View Products", path: "/products/view" },
        { text: "Add Product", path: "/products/add" },
        { text: "Manage Categories", path: "/products/categories" },
        { text: "Manage Subcategories", path: "/products/subcategories" }
      ]
    },
       { text: "Files", icon: FiFileText, key: "Files", path: "/files" },
         {
  text: "Sellers",
  icon: FiPackage,
  key: "Sellers",
  path: "/sellers/all"
},



    { text: "Earnings", icon: FiDollarSign, key: "Earnings", path: "/earnings" },


    // Products menu
   

    {
      text: "Trending Products",
      icon: FiStar,
      key: "TrendingProducts",
      path: "/trending-products"
    },

 
    { text: "Posters", icon: FiImage, key: "Banners", path: "/banners" },

 
,

    
    { text: "Bulk Upload", icon: FiUploadCloud, key: "Bulk Upload", path: "/bulk-upload" },
    
 {
  text: "BKUP Lmart",
  icon: FiArchive,
  key: "BKUPLmart",
  path: "#",
  hasDropdown: true,
  dropdownContent: [
    {
      text: "Deleted Customers",
      icon: FiTrash2,
      path: "/customers/deleted",
    },
    {
      text: "Deleted Sellers",
      icon: FiTrash2,
      path: "/sellers/delete",
    },
    {
      text: "Deleted Products",
      icon: FiTrash2,
      path: "/products/deleted",
    },
    {
      text: "Deleted Oldee",      
      icon: FiTrash2,
      path: "/oldee/delete",      
    },
    {
  text: "Deleted News",
  icon: FiTrash2,
  key: "DeletedNews",
  path: "/news/deleted",
}

  ],
},
  ];
  
  
  // Auto-open dropdown if child route active
  useEffect(() => {
    navigationItems.forEach((item) => {
      if (item.hasDropdown) {
        const match = item.dropdownContent.some((sub) => location.pathname === sub.path);
        if (match) setOpenDropdown(item.key);
      }
    });
  }, [location.pathname]);

  return (
    <>
      {/* MAIN SIDEBAR */}
      <aside className="w-64 bg-white/90 backdrop-blur-xl border-r border-gray-100 shadow-2xl h-screen flex flex-col">
        {/* Header */}
        <div className="py-5 px-4 bg-white/80 flex items-center justify-between border-b">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-full bg-red-600/10 border border-red-200">
              <FiBarChart2 className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-sm font-extrabold tracking-widest">ADMIN DASHBOARD</h2>
          </div>

          <button className="lg:hidden p-2 rounded-full hover:bg-red-100" onClick={onCloseSidebar}>
            <FiX className="w-5 h-5 text-red-600" />
          </button>
        </div>

        {/* NAV LIST */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto custom-scrollbar">
          {navigationItems.map((item) => {
            const isOpen = openDropdown === item.key;

            const parentActive =
              item.hasDropdown
                ? item.dropdownContent.some((sub) => location.pathname === sub.path)
                : location.pathname === item.path;

            return (
              <div key={item.key} className="mb-1">
                <NavLink
                  to={item.path}
                  end={!item.hasDropdown}
                  className="flex-1"
                  onClick={() => {
                    if (!item.hasDropdown) onCloseSidebar?.();
                    if (item.hasDropdown) toggleDropdown(item.key);
                  }}
                >
                  <SidebarLinkButton
                    isActive={parentActive}
                    hasDropdown={item.hasDropdown}
                    onToggleDropdown={() => toggleDropdown(item.key)}
                    isOpen={isOpen}
                  >
                    <div className="flex items-center">
                      <item.icon
                        className={`w-5 h-5 mr-3 ${
                          parentActive ? ACTIVE_ICON_COLOR : "text-gray-500"
                        }`}
                      />
                      <span>{item.text}</span>
                    </div>
                  </SidebarLinkButton>
                </NavLink>

                {/* DROPDOWN */}
                {item.hasDropdown && (
                  <div
                    className={`transition-all duration-300 ${
                      isOpen ? "max-h-96 mt-2" : "max-h-0"
                    } overflow-hidden`}
                  >
                    <div className="pl-4 py-1 space-y-1 border-l ml-5 border-gray-200">
                      {item.dropdownContent.map((sub) => {
                        const subActive = location.pathname === sub.path;
                        return (
                          <DropdownLink
                            key={sub.text}
                            text={sub.text}
                            to={sub.path}
                            isSubActive={subActive}
                            onClick={() => onCloseSidebar?.()}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* LOGOUT BUTTON */}
        <div className="p-4 border-t shadow-inner">
          <button className={LOGOUT_BUTTON_CLASS} onClick={() => setShowConfirm(true)}>
            <FiLogOut className="w-5 h-5 mr-2" /> Logout
          </button>
        </div>
      </aside>

      {/* LOGOUT CONFIRM MODAL */}
      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-[999]">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-80 text-center">
            <h2 className="text-lg font-bold mb-3">Confirm Logout</h2>
            <p className="text-gray-600 mb-6">Are you sure you want to logout?</p>
            <div className="flex justify-between gap-4">
              <button
                className="flex-1 py-2 rounded-lg border font-semibold hover:bg-gray-100"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="flex-1 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700"
                onClick={handleLogoutConfirmed}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
