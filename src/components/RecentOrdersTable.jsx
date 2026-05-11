import React, { useState, useEffect } from "react";
import { 
    Users, 
    ShoppingCart, 
    DollarSign, 
    Clock, 
    Box,
    ChevronRight,
    Search,
    TrendingUp,
    TrendingDown,
    AlertCircle,
    Package,
    UserPlus,
    ShoppingBag,
    BarChart3,
    CreditCard,
    Truck,
    RefreshCw,
    Download,
    Filter,
    MoreVertical,
    Sparkles,
    CheckCircle,
    XCircle,
    Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
    collection, 
    getDocs, 
    query, 
    orderBy, 
    limit 
} from 'firebase/firestore';
import { db } from '../firebase';

// ===================================
// FIX: ErrorBoundary Definition
// ===================================
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, info) {
        console.error("Dashboard Error:", error, info);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
                    <div className="text-center p-8 bg-white rounded-2xl shadow-2xl max-w-md transform transition-all duration-300 hover:scale-105">
                        <div className="relative">
                            <AlertCircle className="w-20 h-20 text-red-400 mx-auto mb-4 animate-pulse" />
                            <div className="absolute inset-0 bg-red-100 rounded-full blur-xl opacity-50"></div>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-3">Oops! Something went wrong</h2>
                        <p className="text-gray-600 mb-6">Error: {this.state.error?.message || 'Unknown error'}</p>
                        <button 
                            onClick={() => window.location.reload()}
                            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-xl font-semibold"
                        >
                            Refresh Page
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

// Attractive StatCard with modern design
const StatCard = ({ title, value, icon: Icon, trend, percentage, loading, isCurrency = false, subtitle, color = "blue" }) => {
    const colorConfigs = {
        blue: {
            gradient: "from-blue-500 to-cyan-500",
            bg: "bg-gradient-to-br from-blue-50 to-cyan-50",
            iconBg: "bg-gradient-to-br from-blue-500 to-cyan-500",
            text: "text-blue-700",
            border: "border-blue-100"
        },
        green: {
            gradient: "from-green-500 to-emerald-500",
            bg: "bg-gradient-to-br from-green-50 to-emerald-50",
            iconBg: "bg-gradient-to-br from-green-500 to-emerald-500",
            text: "text-green-700",
            border: "border-green-100"
        },
        purple: {
            gradient: "from-purple-500 to-pink-500",
            bg: "bg-gradient-to-br from-purple-50 to-pink-50",
            iconBg: "bg-gradient-to-br from-purple-500 to-pink-500",
            text: "text-purple-700",
            border: "border-purple-100"
        },
        orange: {
            gradient: "from-orange-500 to-amber-500",
            bg: "bg-gradient-to-br from-orange-50 to-amber-50",
            iconBg: "bg-gradient-to-br from-orange-500 to-amber-500",
            text: "text-orange-700",
            border: "border-orange-100"
        },
        indigo: {
            gradient: "from-indigo-500 to-blue-500",
            bg: "bg-gradient-to-br from-indigo-50 to-blue-50",
            iconBg: "bg-gradient-to-br from-indigo-500 to-blue-500",
            text: "text-indigo-700",
            border: "border-indigo-100"
        }
    };

    const config = colorConfigs[color];

    return (
        <div className={`relative p-6 rounded-2xl ${config.bg} border ${config.border} transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group overflow-hidden ${loading ? 'animate-pulse' : ''}`}>
            {/* Animated background element */}
            <div className="absolute -right-8 -top-8 w-32 h-32 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                <div className={`w-full h-full rounded-full bg-gradient-to-br ${config.gradient}`}></div>
            </div>
            
            {loading ? (
                <div className="space-y-3">
                    <div className="h-4 bg-white/50 rounded w-3/4"></div>
                    <div className="h-10 bg-white/50 rounded w-1/2"></div>
                    <div className="h-3 bg-white/50 rounded w-1/3"></div>
                </div>
            ) : (
                <>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
                            <p className="text-3xl font-bold mt-2 text-gray-900">
                                {isCurrency ? `₹${Number(value).toLocaleString('en-IN')}` : value}
                            </p>
                        </div>
                        <div className={`p-3 rounded-xl ${config.iconBg} shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                            <Icon className="w-6 h-6 text-white" />
                        </div>
                    </div>
                    
                    {subtitle && (
                        <div className="flex items-center space-x-2 text-sm text-gray-500 mb-3">
                            <span>{subtitle}</span>
                        </div>
                    )}
                    
                    {trend && percentage && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                            <div className={`flex items-center space-x-2 ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                                <div className={`p-1.5 rounded-lg ${trend === 'up' ? 'bg-green-100' : 'bg-red-100'}`}>
                                    {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                </div>
                                <span className="text-sm font-semibold">{percentage}%</span>
                            </div>
                            <span className="text-xs text-gray-400">vs last month</span>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

// Enhanced OrderRow with better styling - UPDATED VIEW BUTTON
const OrderRow = ({ order, index }) => {
    const getStatusIcon = (status) => {
        switch(status?.toLowerCase()) {
            case 'success':
            case 'delivered':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'pending':
            case 'processing':
                return <Clock className="w-4 h-4 text-yellow-500" />;
            case 'cancelled':
                return <XCircle className="w-4 h-4 text-red-500" />;
            default:
                return <Activity className="w-4 h-4 text-gray-500" />;
        }
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    const getAvatarColor = (id) => {
        const colors = [
            'from-blue-500 to-cyan-400',
            'from-purple-500 to-pink-400',
            'from-green-500 to-emerald-400',
            'from-orange-500 to-yellow-400',
            'from-red-500 to-pink-400',
            'from-indigo-500 to-blue-400'
        ];
        return colors[(id?.length || 0) % colors.length];
    };

    const avatarColor = getAvatarColor(order.id);

    return (
        <tr className="border-b border-gray-100 last:border-b-0 hover:bg-gradient-to-r from-gray-50 to-white transition-all duration-300 group">
            <td className="py-4 px-6">
                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white text-lg font-bold shadow-lg transform group-hover:rotate-6 transition-transform duration-300`}>
                            {getInitials(order.name)}
                        </div>
                        <div className="absolute -bottom-1 -right-1">
                            {getStatusIcon(order.status)}
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 truncate group-hover:text-gray-900">{order.name}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[180px]" title={order.email}>
                            {order.email}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full font-medium">
                                {order.items} item{order.items !== 1 ? 's' : ''}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">{order.date}</span>
                        </div>
                    </div>
                </div>
            </td>
            <td className="py-4 px-6">
                <div className="text-right">
                    <p className="text-xl font-bold text-gray-900 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                        {order.amount}
                    </p>
                    <p className={`text-xs font-medium mt-1 ${order.status === 'success' ? 'text-green-600' : 'text-yellow-600'}`}>
                        {order.status?.toUpperCase() || 'PENDING'}
                    </p>
                </div>
                </td>
                <td className="py-4 px-6 hidden lg:table-cell">
  <div className="flex flex-col items-end">
    <div className="flex items-center space-x-2">
      {(() => {
        const status = (order.status || "pending").toLowerCase();

        switch (status) {
          case "delivered":
            return (
              <div className="flex items-center space-x-1 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Delivered</span>
              </div>
            );

          case "shipped":
            return (
              <div className="flex items-center space-x-1 text-blue-600">
                <Truck className="w-4 h-4" />
                <span className="text-sm font-medium">Shipped</span>
              </div>
            );

          case "processing":
            return (
              <div className="flex items-center space-x-1 text-yellow-600">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">Processing</span>
              </div>
            );

          case "cancelled":
            return (
              <div className="flex items-center space-x-1 text-red-600">
                <XCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Cancelled</span>
              </div>
            );

          default:
            return (
              <div className="flex items-center space-x-1 text-gray-600">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Pending</span>
              </div>
            );
        }
      })()}
    </div>

                     <span className="text-xs text-gray-400 mt-1">
  via {(() => {
    const method = (order.paymentMethod || 'cod').toLowerCase();

    switch (method) {
      case 'cod':
        return 'Cash on Delivery';
      case 'razor pay':
        return 'Razor Pay'; 
      default:
        return method.toUpperCase();
    }
  })()}
</span>
  </div>
</td>

            <td className="py-4 px-6">
                <div className="flex justify-end space-x-2">
                    {/* UPDATED VIEW BUTTON - Links to Order Details page */}
                    <Link 
                        to={`/orders/${order.userId || 'unknown_user'}/${order.id}`}
                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg flex items-center space-x-2 group"
                    >
                        <span>View</span>
                        <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <MoreVertical className="w-5 h-5" />
                    </button>
                </div>
            </td>
        </tr>
    );
};

// Enhanced LoadingSkeleton
const LoadingSkeleton = () => (
    <div className="animate-pulse p-4 md:p-8 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
        {/* Header */}
        <div className="space-y-4 mb-8">
            <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-64"></div>
            <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-96"></div>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-200 to-gray-300 h-32 shadow-lg">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-gray-100/30 to-transparent"></div>
                </div>
            ))}
        </div>
        
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl shadow-lg h-24"></div>
            ))}
        </div>
        
        {/* Orders Table */}
        <div className="bg-white p-6 rounded-2xl shadow-lg">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="h-16 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl mb-4"></div>
            ))}
        </div>
    </div>
);

// Main Component
function AdminDashboardContent() {
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [dashboardData, setDashboardData] = useState({
        totalCustomers: 0,
        totalOrders: 0,
        totalRevenue: 0,
        pendingOrders: 0,
        totalProducts: 0,
        recentOrders: [],
        revenueGrowth: 12.5,
        customerGrowth: 8.2,
        orderGrowth: 15.3
    });
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [statsLoading, setStatsLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState('today');

    // ==========================================================
    // FUNCTION: Aggregates ALL orders from all user subcollections (FIXED LOGIC)
    // ==========================================================
    const fetchAllOrdersFromUsersSubcollections = async () => {
        // Fetches all documents from the top-level 'users' collection
        const usersSnapshot = await getDocs(collection(db, 'users'));
        let allOrders = [];
        let totalRevenue = 0;

        // Iterate over each user
        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            // Reference the 'orders' subcollection for this specific user
            const userOrdersRef = collection(db, 'users', userId, 'orders');
            
            // Fetch all orders for the current user
            const ordersSnapshot = await getDocs(userOrdersRef);
            
            ordersSnapshot.docs.forEach(orderDoc => {
                const data = orderDoc.data();
                // Aggregate revenue
                totalRevenue += (data.amount || 0);
                
                // Collect order data WITH USERID
                allOrders.push({ 
                    ...data, 
                    id: orderDoc.id, 
                    userId: userId, // Include parent user ID - IMPORTANT FOR ROUTING
                    // Add a sortable date property
                    sortDate: data.createdAt?.toDate ? data.createdAt.toDate().getTime() : new Date(data.date).getTime() || 0
                });
            });
        }
        
        return { allOrders, totalRevenue };
    };

    // Fetch dashboard data from Firestore
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setStatsLoading(true);
                
                // 1. Fetch Total Customers Count (Global)
                let totalCustomers = 0;
                try {
                    const usersSnapshot = await getDocs(collection(db, 'users'));
                    totalCustomers = usersSnapshot.size;
                } catch (err) {
                    console.log('Using fallback for customers count');
                    totalCustomers = 12; // Fallback
                }
                
                // 2. Fetch ALL Orders (Aggregated from all user subcollections)
                const { allOrders, totalRevenue } = await fetchAllOrdersFromUsersSubcollections(); // <-- Using aggregation

                // Calculate ALL global statistics from the aggregated list
                const totalOrders = allOrders.length;
                
                const pendingOrders = allOrders.filter(order => {
                    const status = order.status;
                    return !status || status.toLowerCase() === 'pending' || status.toLowerCase() === 'processing';
                }).length;
                
              // 3. Determine RECENT Orders
// Show: Pending + Processing + Shipped
// Hide: Delivered + Cancelled

const recentOrdersFiltered = allOrders
  .filter(order => {
    const status = (order.status || 'pending').toLowerCase();
    return status !== 'delivered' && status !== 'cancelled' && status !== 'processing';;
  })
  .sort((a, b) => b.sortDate - a.sortDate);

const recentOrdersRaw = recentOrdersFiltered.slice(0, 10);

                const formatDate = (timestamp) => {
                    if (!timestamp) return 'N/A';
                    try {
                        // Handle Firebase Timestamp objects
                        if (timestamp.toDate) {
                            return timestamp.toDate().toLocaleDateString('en-IN');
                        }
                        // Handle Date objects or string dates
                        return new Date(timestamp).toLocaleDateString('en-IN');
                    } catch (e) {
                        return 'N/A';
                    }
                };
                
                const ordersList = recentOrdersRaw.map(order => ({
                    id: order.id,
                    userId: order.userId || 'unknown_user', // CRITICAL: Include userId for routing
                    name: order.customerInfo?.name || order.customer || 'Unknown Customer',
                    email: order.customerInfo?.email || order.email || 'N/A',
                    phone: order.customerInfo?.phone || order.phone || 'N/A',
                    amount: `₹${(order.amount || 0).toLocaleString('en-IN')}`,
                    items: Array.isArray(order.items) ? order.items.length : 1,
                    date: formatDate(order.createdAt || order.date),
                    status: order.status || 'pending',
                    paymentMethod: order.paymentMethod || 'cod'
                }));
                
                // 4. Fetch Total Products Count (Global)
                let totalProducts = 0;
                try {
                    const productsSnapshot = await getDocs(collection(db, 'products'));
                    totalProducts = productsSnapshot.size;
                } catch (err) {
                    totalProducts = 15;
                }

                setDashboardData(prev => ({
                    ...prev,
                    totalCustomers,
                    totalOrders,         // <-- Global total count from aggregation
                    totalRevenue,        // <-- Global total revenue from aggregation
                    pendingOrders,       // <-- Global pending count from aggregation
                    totalProducts,
                    recentOrders: ordersList 
                }));

                setFilteredOrders(ordersList);
                setStatsLoading(false);

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
                setStatsLoading(false);
            }
        };

        fetchDashboardData();
        const timer = setTimeout(() => setIsLoading(false), 1000);
        return () => clearTimeout(timer);
    }, []);

    // Filter orders based on search term
    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredOrders(dashboardData.recentOrders);
            return;
        }

        const filtered = dashboardData.recentOrders.filter(order =>
            order.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.phone.includes(searchTerm) ||
            order.amount.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredOrders(filtered);
    }, [searchTerm, dashboardData.recentOrders]);

    if (isLoading) return <LoadingSkeleton />;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 font-sans antialiased">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-8">
       
                {/* Quick Actions - Enhanced */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Link 
                        to="/orders/all" 
                        className="group bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                                <ShoppingBag className="w-7 h-7 text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-800 group-hover:text-gray-900">View All Orders</h3>
                                <p className="text-sm text-gray-500">Manage and track all aggregated orders</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transform group-hover:translate-x-2 transition-transform duration-300" />
                        </div>
                    </Link>
                    
                    <Link 
                        to="/products/view" 
                        className="group bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                                <Package className="w-7 h-7 text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-800 group-hover:text-gray-900">Manage Products</h3>
                                <p className="text-sm text-gray-500">Add, edit, or remove products</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transform group-hover:translate-x-2 transition-transform duration-300" />
                        </div>
                    </Link>
                    
                    <Link 
                        to="/customers" 
                        className="group bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                                <Users className="w-7 h-7 text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-800 group-hover:text-gray-900">Customer Management</h3>
                                <p className="text-sm text-gray-500">View and manage customers</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transform group-hover:translate-x-2 transition-transform duration-300" />
                        </div>
                    </Link>
                </div>

                {/* Recent Orders Table */}
                <section className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Recent Orders (Top 10 Global)</h2>
                                <p className="text-sm text-gray-500">Latest customer orders from all users, sorted by date</p>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                                <div className="relative flex-1 sm:flex-none">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search customers, orders, emails..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                                    />
                                </div>
                                
                                {/* <button className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2 hover:shadow">
                                    <Filter className="w-4 h-4" />
                                    <span>Filter</span>
                                </button> */}
                                
                                {/* <button className="px-4 py-2.5 bg-gradient-to-r from-gray-900 to-gray-700 text-white rounded-lg hover:from-gray-800 hover:to-gray-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center justify-center space-x-2">
                                    <Download className="w-4 h-4" />
                                    <span>Export</span>
                                </button> */}
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                <tr className="text-left text-gray-600 text-sm font-semibold">
                                    <th className="py-4 px-6">CUSTOMER</th>
                                    <th className="py-4 px-6 text-right">AMOUNT</th>
                                    <th className="py-4 px-6 text-right">PAYMENT</th>
                                    <th className="py-4 px-6 text-right">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="py-12">
                                            <div className="text-center">
                                                <div className="inline-block p-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl mb-4">
                                                    <ShoppingCart className="w-12 h-12 text-gray-300" />
                                                </div>
                                                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                                    {statsLoading ? 'Loading orders...' : 'No orders found'}
                                                </h3>
                                                <p className="text-gray-500 max-w-md mx-auto">
                                                    {searchTerm 
                                                        ? 'No orders match your search. Try different keywords.'
                                                        : 'All caught up! No recent orders to display.'
                                                    }
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredOrders.map((order, index) => (
                                        <OrderRow key={order.id || index} order={order} index={index} />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-6 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100/50">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="text-sm text-gray-600">
                                Showing <span className="font-bold text-gray-800">{filteredOrders.length}</span> of{' '}
                                <span className="font-bold text-gray-800">{dashboardData.totalOrders}</span> total orders
                            </div>
                            <div className="flex items-center space-x-3">
                                {searchTerm && (
                                    <button 
                                        onClick={() => setSearchTerm("")}
                                        className="text-sm text-purple-600 hover:text-purple-800 font-medium flex items-center space-x-1 hover:underline"
                                    >
                                        <span>Clear search</span>
                                    </button>
                                )}
                                <Link 
                                    to="/orders/all" 
                                    className="text-sm font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                                >
                                    View All Orders →
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}

export default function AdminDashboard() {
    return (
        <ErrorBoundary>
            <AdminDashboardContent />
        </ErrorBoundary>
    );  
}