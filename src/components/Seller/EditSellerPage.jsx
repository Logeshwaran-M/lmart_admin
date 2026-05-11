import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    FiUser, FiMail, FiPhone, FiMapPin, FiSave, 
    FiLoader, FiXCircle, FiCheckCircle, FiTag,
    FiBriefcase, FiFileText, FiDollarSign, FiGlobe,
    FiPackage, FiMessageSquare, FiShield, FiClock
} from 'react-icons/fi';


const STATUS_OPTIONS = [
    { value: 'pending', label: 'Pending Review', color: 'yellow' },
    { value: 'approved', label: 'Approved', color: 'green' },
    { value: 'active', label: 'Active', color: 'blue' },
    { value: 'blocked', label: 'Blocked', color: 'red' },
    { value: 'suspended', label: 'Suspended', color: 'orange' },
];

const EditSellerPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [seller, setSeller] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [activeTab, setActiveTab] = useState('basic'); // 'basic', 'documents', 'products', 'financial'
    const [documents, setDocuments] = useState([]);

    useEffect(() => {
        fetchSeller();
    }, [id]);

    const fetchSeller = async () => {
        setLoading(true);
        try {
            const docRef = doc(db, "sellers", id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                setSeller({ 
                    id: docSnap.id, 
                    status: data.status || 'pending',
                    // Default values for all fields
                    name: data.name || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    businessName: data.businessName || '',
                    gstNumber: data.gstNumber || '',
                    panNumber: data.panNumber || '',
                    address: data.address || '',
                    city: data.city || '',
                    state: data.state || '',
                    country: data.country || 'India',
                    pincode: data.pincode || '',
                    website: data.website || '',
                    description: data.description || '',
                    commissionRate: data.commissionRate || 10,
                    // Dates
                    createdAt: data.createdAt,
                    lastLogin: data.lastLogin,
                    // Social/contact
                    whatsappNumber: data.whatsappNumber || '',
                    telegramUsername: data.telegramUsername || '',
                    // Additional info
                    category: data.category || '',
                    productsCount: data.productsCount || 0,
                    totalSales: data.totalSales || 0,
                    rating: data.rating || 0,
                    ...data 
                });
                
                // Fetch documents if needed
                fetchDocuments(id);
            } else {
                setError("No seller found with this ID.");
            }
        } catch (err) {
            console.error("Error fetching seller:", err);
            setError("Failed to load seller data.");
        } finally {
            setLoading(false);
        }
    };

    const fetchDocuments = async (sellerId) => {
        try {
            // Fetch documents from subcollection or main document
            const docsRef = collection(db, "sellers", sellerId, "documents");
            const docsSnap = await getDocs(docsRef);
            const docsList = docsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setDocuments(docsList);
        } catch (err) {
            console.error("Error fetching documents:", err);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSeller(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const sellerRef = doc(db, "sellers", id);
            
            // Prepare update data
            const updateData = {
                name: seller.name,
                email: seller.email,
                phone: seller.phone,
                businessName: seller.businessName,
                gstNumber: seller.gstNumber,
                panNumber: seller.panNumber,
                address: seller.address,
                city: seller.city,
                state: seller.state,
                country: seller.country,
                pincode: seller.pincode,
                website: seller.website,
                description: seller.description,
                status: seller.status,
                commissionRate: parseFloat(seller.commissionRate) || 10,
                category: seller.category,
                updatedAt: new Date(),
                updatedBy: 'admin' // Get from auth
            };

            await updateDoc(sellerRef, updateData);
            
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
            
            // Refresh data
            fetchSeller();
        } catch (err) {
            console.error("Error updating seller:", err);
            setError("Failed to save changes: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    // Quick action buttons
    const QuickActions = () => (
        <div className="flex flex-wrap gap-2 mb-6">
            <button
                onClick={() => navigate(`/sellers/message/${id}`)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
            >
                <FiMessageSquare className="w-4 h-4 mr-2" />
                Send Message
            </button>
            <button
                onClick={() => navigate(`/sellers/products/${id}`)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center"
            >
                <FiPackage className="w-4 h-4 mr-2" />
                View Products
            </button>
            <button
                onClick={() => navigate(`/sellers/orders/${id}`)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center"
            >
                <FiDollarSign className="w-4 h-4 mr-2" />
                View Orders
            </button>
            {seller?.status === 'pending' && (
                <button
                    onClick={handleApproveSeller}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                >
                    <FiCheckCircle className="w-4 h-4 mr-2" />
                    Approve Seller
                </button>
            )}
            {seller?.status !== 'blocked' && (
                <button
                    onClick={() => setShowBlockModal(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
                >
                    <FiShield className="w-4 h-4 mr-2" />
                    Block Seller
                </button>
            )}
        </div>
    );

    // Tab navigation
    const Tabs = () => (
        <div className="border-b border-gray-200 mb-6">
            <nav className="flex space-x-8">
                {[
                    { id: 'basic', label: 'Basic Info', icon: FiUser },
                    { id: 'business', label: 'Business Details', icon: FiBriefcase },
                    { id: 'documents', label: 'Documents', icon: FiFileText },
                    { id: 'financial', label: 'Financial', icon: FiDollarSign },
                    { id: 'products', label: 'Products', icon: FiPackage }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`py-3 px-1 font-medium text-sm border-b-2 transition-colors flex items-center ${
                            activeTab === tab.id
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <tab.icon className="w-4 h-4 mr-2" />
                        {tab.label}
                    </button>
                ))}
            </nav>
        </div>
    );

    if (loading) {
        return <LoadingScreen />;
    }

    if (error && !seller) {
        return <ErrorScreen error={error} navigate={navigate} />;
    }

    if (!seller) return null;

    return (
        <div className="flex-1 p-6 lg:p-8 bg-gray-100 min-h-screen">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h2 className="text-3xl font-extrabold text-gray-900 flex items-center">
                                <FiUser className="w-7 h-7 mr-3 text-blue-600" /> 
                                Edit Seller: {seller.name}
                            </h2>
                            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                                <span>ID: <code className="bg-gray-100 px-2 py-1 rounded">{seller.id}</code></span>
                                <span>Joined: {formatDate(seller.createdAt)}</span>
                                <span>Products: {seller.productsCount || 0}</span>
                                <span>Sales: ₹{seller.totalSales || 0}</span>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <div className={`px-4 py-2 rounded-full text-white font-bold ${
                                seller.status === 'approved' ? 'bg-green-600' :
                                seller.status === 'active' ? 'bg-blue-600' :
                                seller.status === 'pending' ? 'bg-yellow-600' :
                                seller.status === 'blocked' ? 'bg-red-600' : 'bg-gray-600'
                            }`}>
                                {STATUS_OPTIONS.find(s => s.value === seller.status)?.label || seller.status}
                            </div>
                        </div>
                    </div>
                    
                    <QuickActions />
                </div>

                {/* Success/Error Messages */}
                {success && <SuccessMessage message="Changes saved successfully!" />}
                {error && <ErrorMessage message={error} />}

                {/* Tabs */}
                <Tabs />

                {/* Form Content based on active tab */}
                <form onSubmit={handleSubmit}>
                    {activeTab === 'basic' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Status Field */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <FiTag className="w-4 h-4 inline mr-2" /> Seller Status
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                    {STATUS_OPTIONS.map(option => (
                                        <label
                                            key={option.value}
                                            className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                                seller.status === option.value
                                                    ? `border-${option.color}-500 bg-${option.color}-50`
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="status"
                                                value={option.value}
                                                checked={seller.status === option.value}
                                                onChange={handleChange}
                                                className="mr-2"
                                            />
                                            <span className="font-medium">{option.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Basic Info Fields */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <FiUser className="w-4 h-4 inline mr-2" /> Full Name *
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={seller.name}
                                    onChange={handleChange}
                                    required
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <FiBriefcase className="w-4 h-4 inline mr-2" /> Business Name
                                </label>
                                <input
                                    type="text"
                                    name="businessName"
                                    value={seller.businessName}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <FiMail className="w-4 h-4 inline mr-2" /> Email Address *
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={seller.email}
                                    onChange={handleChange}
                                    required
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <FiPhone className="w-4 h-4 inline mr-2" /> Phone Number *
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={seller.phone}
                                    onChange={handleChange}
                                    required
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <FiGlobe className="w-4 h-4 inline mr-2" /> Website
                                </label>
                                <input
                                    type="url"
                                    name="website"
                                    value={seller.website}
                                    onChange={handleChange}
                                    placeholder="https://"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Category
                                </label>
                                <select
                                    name="category"
                                    value={seller.category}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Select Category</option>
                                    <option value="electronics">Electronics</option>
                                    <option value="fashion">Fashion</option>
                                    <option value="home">Home & Garden</option>
                                    <option value="beauty">Beauty</option>
                                    <option value="food">Food & Beverages</option>
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    value={seller.description}
                                    onChange={handleChange}
                                    rows="3"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Brief description about the seller's business..."
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'business' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Address Fields */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <FiMapPin className="w-4 h-4 inline mr-2" /> Complete Address
                                </label>
                                <textarea
                                    name="address"
                                    value={seller.address}
                                    onChange={handleChange}
                                    rows="3"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                                <input
                                    type="text"
                                    name="city"
                                    value={seller.city}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                                <input
                                    type="text"
                                    name="state"
                                    value={seller.state}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                                <select
                                    name="country"
                                    value={seller.country}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="India">India</option>
                                    <option value="USA">United States</option>
                                    <option value="UK">United Kingdom</option>
                                    <option value="Canada">Canada</option>
                                    <option value="Australia">Australia</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Pincode</label>
                                <input
                                    type="text"
                                    name="pincode"
                                    value={seller.pincode}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'documents' && (
                        <DocumentVerification sellerId={id} documents={documents} />
                    )}

                    {activeTab === 'financial' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <FiFileText className="w-4 h-4 inline mr-2" /> GST Number
                                </label>
                                <input
                                    type="text"
                                    name="gstNumber"
                                    value={seller.gstNumber}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="GSTINXXXXXXXXXX"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <FiFileText className="w-4 h-4 inline mr-2" /> PAN Number
                                </label>
                                <input
                                    type="text"
                                    name="panNumber"
                                    value={seller.panNumber}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="ABCDE1234F"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <FiDollarSign className="w-4 h-4 inline mr-2" /> Commission Rate (%)
                                </label>
                                <input
                                    type="number"
                                    name="commissionRate"
                                    value={seller.commissionRate}
                                    onChange={handleChange}
                                    min="0"
                                    max="50"
                                    step="0.5"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="font-bold text-gray-700 mb-2">Payment Information</h4>
                                <div className="text-sm text-gray-600">
                                    <p>Account Holder: {seller.bankAccountHolder || 'Not set'}</p>
                                    <p>Account Number: {seller.bankAccountNumber ? '****' + seller.bankAccountNumber.slice(-4) : 'Not set'}</p>
                                    <p>IFSC Code: {seller.bankIFSC || 'Not set'}</p>
                                </div>
                                <button
                                    type="button"
                                    className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
                                    onClick={() => {/* Open payment modal */}}
                                >
                                    Edit Payment Details
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'products' && (
                        <SellerProducts sellerId={id} />
                    )}

                    {/* Save Button */}
                    <div className="mt-8 pt-6 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                            <button
                                type="button"
                                onClick={() => navigate('/sellers')}
                                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                            >
                                Cancel
                            </button>
                            <div className="flex space-x-3">
                                <button
                                    type="button"
                                    onClick={() => {/* Save as draft */}}
                                    className="px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-medium"
                                >
                                    Save Draft
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center disabled:opacity-50"
                                >
                                    {saving ? (
                                        <>
                                            <FiLoader className="w-5 h-5 animate-spin mr-2" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <FiSave className="w-5 h-5 mr-2" />
                                            Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Helper components
const LoadingScreen = () => (
    <div className="flex-1 p-6 lg:p-8 bg-gray-100 min-h-screen flex justify-center items-center">
        <div className="text-center">
            <FiLoader className="w-12 h-12 animate-spin mx-auto text-blue-500 mb-4" />
            <p className="text-xl text-gray-600 font-semibold">Loading Seller Data...</p>
        </div>
    </div>
);

const ErrorScreen = ({ error, navigate }) => (
    <div className="flex-1 p-6 lg:p-8 bg-gray-100 min-h-screen">
        <div className="p-6 bg-red-100 border-l-4 border-red-500 text-red-800 rounded-lg shadow-md">
            <p className="font-bold">Error Loading Seller:</p>
            <p className="my-3">{error}</p>
            <button 
                onClick={() => navigate('/sellers')} 
                className="mt-3 px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
                Go Back to Seller List
            </button>
        </div>
    </div>
);

const SuccessMessage = ({ message }) => (
    <div className="p-4 mb-6 bg-green-100 border-l-4 border-green-500 text-green-700 rounded-lg flex items-center shadow-md">
        <FiCheckCircle className="w-5 h-5 mr-3" />
        <span className="font-semibold">{message}</span>
    </div>
);

const ErrorMessage = ({ message }) => (
    <div className="p-4 mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-lg flex items-center shadow-md">
        <FiXCircle className="w-5 h-5 mr-3" />
        <span className="font-semibold">{message}</span>
    </div>
);

export default EditSellerPage;