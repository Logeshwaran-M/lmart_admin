import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from "react-router-dom";
import { serverTimestamp } from "firebase/firestore";

import {
    FiTrash2,
    FiSearch,
    FiCalendar,
    FiTag,
    FiFileText,
    FiPlus,
    FiLoader,
    FiAlertTriangle,
    FiX,
    FiImage,
    FiClock,
    FiEye,
    FiVideo,
    FiEdit2,
    FiFilter,
    FiGlobe,
    FiTrendingUp,
    FiBarChart2,
    FiDownload,
    FiChevronRight,
    FiShare2,
    FiHeart,
    FiMessageSquare,
    FiExternalLink,
    FiGrid,
    FiList
} from 'react-icons/fi';

import {
    collection,
    onSnapshot,
    query,
    orderBy,
    deleteDoc,
    doc,
    setDoc
} from "firebase/firestore";

import { db } from "../../firebase";

/* ---------------- DATE FORMATTERS ---------------- */
const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';

    if (dateValue.toDate) {
        return dateValue.toDate().toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    if (typeof dateValue === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateValue)) {
        const [d, m, y] = dateValue.split('/');
        return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    return 'Invalid Date';
};

const formatCreationDate = (timestamp) => {
    if (!timestamp?.toDate) return 'N/A';
    return timestamp.toDate().toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const getTimeAgo = (timestamp) => {
    if (!timestamp?.toDate) return '';
    const now = new Date();
    const created = timestamp.toDate();
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatCreationDate(timestamp);
};

/* ---------------- DELETE MODAL ---------------- */
const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, newsItem }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-8 max-w-md w-full transform transition-all duration-300 scale-100 animate-fadeInUp border border-gray-200 shadow-2xl">
                <div className="mb-6 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <FiAlertTriangle className="w-10 h-10 text-red-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Delete Article</h3>
                    <p className="text-gray-600">
                        Are you sure you want to permanently delete this article?
                    </p>
                </div>

                <div className="mb-8 p-5 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="font-bold text-gray-800 mb-2 line-clamp-1">{newsItem?.title}</h4>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1 bg-blue-50 px-3 py-1 rounded-full">
                            <FiTag size={14} />
                            {newsItem?.category}
                        </span>
                        <span className="flex items-center gap-1 bg-green-50 px-3 py-1 rounded-full">
                            <FiCalendar size={14} />
                            {formatDate(newsItem?.date)}
                        </span>
                    </div>
                </div>

                <div className="flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium hover:shadow-md"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-6 py-3 bg-gradient-to-r from-red-500 via-red-600 to-red-700 text-white rounded-xl hover:from-red-600 hover:to-red-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                        Delete Article
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ---------------- FULL SCREEN IMAGE VIEWER ---------------- */
const ImageViewerModal = ({ isOpen, onClose, imageUrl }) => {
    if (!isOpen || !imageUrl) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[100] p-4 cursor-zoom-out"
            onClick={onClose}
        >
            <button
                onClick={onClose}
                className="absolute top-6 right-6 text-white/70 hover:text-white p-3 hover:bg-white/10 rounded-full transition-all duration-300 z-10"
            >
                <FiX size={32} />
            </button>
            
            <div 
                className="relative max-w-7xl w-full h-full flex items-center justify-center animate-fadeIn"
                onClick={e => e.stopPropagation()}
            >
                <img
                    src={imageUrl}
                    alt="Full View"
                    className="max-w-full max-h-full object-contain shadow-2xl rounded-lg transform transition-transform duration-500 hover:scale-[1.02]"
                />
            </div>
        </div>
    );
};

/* ---------------- VIEW DETAILS MODAL ---------------- */
const ViewDetailsModal = ({ isOpen, onClose, newsItem, onImageClick }) => {
    const [activeImage, setActiveImage] = React.useState(null);

    React.useEffect(() => {
        if (newsItem?.mainImageUrl) {
            setActiveImage(newsItem.mainImageUrl);
        } else if (newsItem?.gallery?.[0]) {
            setActiveImage(newsItem.gallery[0]);
        }
    }, [newsItem]);

    if (!isOpen || !newsItem) return null;

    return (
        <div className="fixed  inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-50 overflow-y-auto p-4">
            <div className="bg-gradient-to-br  mt-120 from-white to-gray-50 rounded-2xl max-w-4xl w-full my-6 transform transition-all duration-300 animate-fadeInUp border border-gray-200 shadow-3xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-6 rounded-t-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
                    <div className="relative">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">{newsItem.title}</h2>
                                <div className="flex items-center gap-4 text-blue-100">
                                    <span className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                                        <FiTag size={14} />
                                        {newsItem.category}
                                    </span>
                                    <span className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                                        <FiCalendar size={14} />
                                        {formatDate(newsItem.date)}
                                    </span>
                                    {newsItem.createdAt && (
                                        <span className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                                            <FiClock size={14} />
                                            {getTimeAgo(newsItem.createdAt)}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-white hover:bg-white/30 p-2 rounded-full transition-all duration-200 backdrop-blur-sm"
                            >
                                <FiX size={24} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    {/* Featured Media Viewer */}
                    <div className="mb-8 bg-gray-50 rounded-2xl overflow-hidden border-2 border-gray-100 shadow-xl">
                        <div className="relative group bg-black/5 h-[600px] flex items-center justify-center overflow-hidden">
                            {activeImage ? (
                                <img
                                    src={activeImage}
                                    alt="Featured"
                                    className="w-full h-full object-contain transition-all duration-500 cursor-zoom-in hover:scale-105"
                                    onClick={() => onImageClick(activeImage)}
                                />
                            ) : (
                                <div className="flex flex-col items-center text-gray-400">
                                    <FiImage size={48} />
                                    <p className="mt-2">No Image Selected</p>
                                </div>
                            )}

                            {/* Counter */}
                            {Array.isArray(newsItem.gallery) && newsItem.gallery.length > 0 && (
                                <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
                                    {newsItem.gallery.includes(activeImage) ? newsItem.gallery.indexOf(activeImage) + 1 : 'Main'} / {newsItem.gallery.length + (newsItem.mainImageUrl ? 1 : 0)}
                                </div>
                            )}
                        </div>

                        {/* Thumbnail Strip */}
                        {(newsItem.mainImageUrl || (Array.isArray(newsItem.gallery) && newsItem.gallery.length > 0)) && (
                            <div className="p-3 bg-gray-50/50 flex gap-2 overflow-x-auto border-t">
                                {newsItem.mainImageUrl && (
                                    <button
                                        onClick={() => setActiveImage(newsItem.mainImageUrl)}
                                        className={`w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
                                            activeImage === newsItem.mainImageUrl ? 'border-blue-500 ring-2 ring-blue-100' : 'border-transparent hover:border-gray-300'
                                        }`}
                                    >
                                        <img src={newsItem.mainImageUrl} className="w-full h-full object-cover" alt="main" />
                                    </button>
                                )}
                                {Array.isArray(newsItem.gallery) && newsItem.gallery.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveImage(img)}
                                        className={`w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
                                            activeImage === img ? 'border-blue-500 ring-2 ring-blue-100' : 'border-transparent hover:border-gray-300'
                                        }`}
                                    >
                                        <img src={img} className="w-full h-full object-cover" alt="gallery" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Featured Video Section */}
                    {newsItem.videoUrl && (
                        <div className="mb-8 space-y-3">
                            <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                                <FiVideo className="text-blue-500" /> Featured Video
                            </h4>
                            <div className="rounded-2xl overflow-hidden border-2 border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300">
                                <video
                                    src={newsItem.videoUrl}
                                    controls
                                    className="w-full h-64 bg-black rounded-xl"
                                />
                            </div>
                        </div>
                    )}



                    {/* Content Section */}
                    <div className="space-y-4 mb-8">
                        <h4 className="text-xl font-bold text-gray-800 border-b pb-3 flex items-center gap-2">
                            <FiFileText className="text-blue-500" />
                            Article Content
                        </h4>
                        <div className="prose max-w-none">
                            <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl border border-gray-200 shadow-inner">
                                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                                    {newsItem.excerpt}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Contact Details Section */}
                    {(newsItem.location || (Array.isArray(newsItem.marketRates) && newsItem.marketRates.length > 0)) && (
                        <div className="mb-8">
                            <h4 className="text-xl font-bold text-gray-800 border-b pb-3 flex items-center gap-2 mb-6">
                                <FiGlobe className="text-blue-500" />
                                Contact Details
                            </h4>
                            
                            <div className="space-y-4 px-2">
                                {newsItem.location && (
                                    <div className="flex gap-2 text-lg">
                                        <span className="text-gray-900 font-bold min-w-[100px]">Location:</span>
                                        <span className="text-gray-700">{newsItem.location}</span>
                                    </div>
                                )}

                                {Array.isArray(newsItem.marketRates) && newsItem.marketRates.map((rate, index) => (
                                    <div key={index} className="flex gap-2 text-lg">
                                        <span className="text-gray-900 font-bold min-w-[110px] capitalize">{rate.itemName}:</span>
                                        <span className="text-gray-700">{rate.price}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Metadata */}
                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-100">
                        <h5 className="text-sm font-semibold text-blue-800 mb-4 flex items-center gap-2">
                            <FiBarChart2 className="text-blue-600" />
                            ARTICLE METADATA
                        </h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white p-4 rounded-xl border border-blue-100 hover:shadow-md transition-shadow duration-200">
                                <div className="text-xs text-blue-600 font-semibold mb-1">Published On</div>
                                <div className="font-bold text-gray-800">{formatDate(newsItem.date)}</div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-purple-100 hover:shadow-md transition-shadow duration-200">
                                <div className="text-xs text-purple-600 font-semibold mb-1">Created</div>
                                <div className="font-bold text-gray-800">{formatCreationDate(newsItem.createdAt)}</div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-green-100 hover:shadow-md transition-shadow duration-200">
                                <div className="text-xs text-green-600 font-semibold mb-1">Category</div>
                                <div className="font-bold text-gray-800">{newsItem.category}</div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-pink-100 hover:shadow-md transition-shadow duration-200">
                                <div className="text-xs text-pink-600 font-semibold mb-1">Media</div>
                                <div className="font-bold text-gray-800">
                                    {newsItem.mainImageUrl && newsItem.videoUrl ? 'Image + Video' :
                                        newsItem.mainImageUrl ? 'Image Only' :
                                            newsItem.videoUrl ? 'Video Only' : 'No Media'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:shadow-md transition-all duration-200 font-medium"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ---------------- NEWS CARD COMPONENT ---------------- */
const NewsCard = ({ news, onView, onDelete, onEdit, onImageClick }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isLiked, setIsLiked] = useState(false);

    return (
        <div
            className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-2xl transition-all duration-500 overflow-hidden group transform hover:-translate-y-1"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Image/Video Thumbnail */}
            <div className="relative h-52 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                {news.mainImageUrl ? (
                    <>
                        <img
                            src={news.mainImageUrl}
                            alt={news.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 cursor-zoom-in"
                            onClick={(e) => {
                                e.stopPropagation();
                                onImageClick(news.mainImageUrl);
                            }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    </>
                ) : news.videoUrl ? (
                    <div className="flex items-center justify-center h-full relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20"></div>
                        <div className="relative z-10">
                            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl animate-pulse-slow">
                                <FiVideo className="w-10 h-10 text-white" />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-r from-gray-300 to-gray-400 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                                <FiFileText className="w-8 h-8 text-gray-600" />
                            </div>
                            <p className="text-gray-500 text-sm">No Media</p>
                        </div>
                    </div>
                )}

                {/* Category Badge */}
                <div className="absolute top-4 left-4">
                    <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-xl">
                        {news.category}
                    </span>
                </div>

                {/* Time Badge */}
                {news.createdAt && (
                    <div className="absolute top-4 right-4">
                        <span className="bg-black/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg">
                            {getTimeAgo(news.createdAt)}
                        </span>
                    </div>
                )}

                {/* Hover Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-center transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="flex gap-3">
                        <button
                            onClick={onView}
                            className="p-3 bg-white rounded-full hover:bg-blue-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110"
                            title="View Details"
                        >
                            <FiEye className="w-5 h-5 text-blue-600" />
                        </button>
                        <button
                            onClick={onEdit}
                            className="p-3 bg-white rounded-full hover:bg-yellow-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110"
                            title="Edit Article"
                        >
                            <FiEdit2 className="w-5 h-5 text-yellow-600" />
                        </button>
                        <button
                            onClick={onDelete}
                            className="p-3 bg-white rounded-full hover:bg-red-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110"
                            title="Delete Article"
                        >
                            <FiTrash2 className="w-5 h-5 text-red-600" />
                        </button>
                        {/* <button
                            onClick={() => setIsLiked(!isLiked)}
                            className={`p-3 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110 ${isLiked ? 'bg-red-50' : 'bg-white hover:bg-red-50'}`}
                            title="Like Article"
                        >
                            <FiHeart className={`w-5 h-5 ${isLiked ? 'text-red-500 fill-red-500' : 'text-gray-600'}`} />
                        </button> */}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                <h3 className="font-bold text-lg text-gray-800 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors duration-300">
                    {news.title}
                </h3>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {news.excerpt}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <FiCalendar className="text-blue-500" size={14} />
                        {formatDate(news.date)}
                    </div>

                    <button
                        onClick={onView}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors duration-200"
                    >
                        Read More
                        <FiChevronRight className="group-hover:translate-x-1 transition-transform duration-200" />
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ---------------- STATS COMPONENT ---------------- */
const StatsCard = ({ icon: Icon, label, value, color, gradient }) => (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-2xl transition-all duration-500 group transform hover:-translate-y-1">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
                <p className={`text-3xl font-bold ${color} drop-shadow-sm`}>{value}</p>
            </div>
            <div className={`p-4 rounded-xl ${gradient} shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                <Icon className="w-8 h-8 text-white" />
            </div>
        </div>
        <div className="mt-4">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full ${gradient.replace('bg-', 'bg-gradient-to-r ')} transition-all duration-1000`}
                    style={{ width: `${Math.min(value * 10, 100)}%` }}>
                </div>
            </div>
        </div>
    </div>
);

/* ---------------- MAIN COMPONENT ---------------- */
const ViewNews = () => {
    const navigate = useNavigate();

    const [newsData, setNewsData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('all');
    const [viewMode, setViewMode] = useState('grid'); // grid or list
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [viewerModalOpen, setViewerModalOpen] = useState(false);
    const [selectedNews, setSelectedNews] = useState(null);
    const [selectedImageUrl, setSelectedImageUrl] = useState(null);

    /* FETCH NEWS */
    useEffect(() => {
        const q = query(collection(db, "news"), orderBy("createdAt", "desc"));

        const unsub = onSnapshot(q, (snapshot) => {
            setNewsData(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });

        return () => unsub();
    }, []);

    /* FILTER */
    const filteredNews = useMemo(() => {
        const term = searchTerm.toLowerCase();
        let filtered = newsData.filter(n =>
            n.title?.toLowerCase().includes(term) ||
            n.excerpt?.toLowerCase().includes(term) ||
            n.category?.toLowerCase().includes(term) ||
            n.location?.toLowerCase().includes(term)
        );

        if (activeFilter === 'withImage') {
            filtered = filtered.filter(n => n.mainImageUrl);
        } else if (activeFilter === 'withVideo') {
            filtered = filtered.filter(n => n.videoUrl);
        } else if (activeFilter === 'noMedia') {
            filtered = filtered.filter(n => !n.mainImageUrl && !n.videoUrl);
        }

        return filtered;
    }, [newsData, searchTerm, activeFilter]);

    /* STATS */
    const stats = useMemo(() => ({
        total: newsData.length,
        withImage: newsData.filter(n => n.mainImageUrl).length,
        withVideo: newsData.filter(n => n.videoUrl).length,
        categories: [...new Set(newsData.map(n => n.category))].length
    }), [newsData]);

    const confirmDelete = async () => {
        if (!selectedNews?.id) return;

        try {
            const { id, ...newsData } = selectedNews;
            const newsRef = doc(db, "news", id);
            const deletedRef = doc(db, "deletedNews", id);

            await setDoc(deletedRef, {
                ...newsData,
                deletedAt: serverTimestamp(),
            });

            await deleteDoc(newsRef);
            setDeleteModalOpen(false);
            setSelectedNews(null);

        } catch (error) {
            console.error("Delete error:", error);
            alert(error.message);
        }
    };

    return (
        <>
            <DeleteConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                newsItem={selectedNews}
            />

            <ViewDetailsModal
                isOpen={viewModalOpen}
                onClose={() => setViewModalOpen(false)}
                newsItem={selectedNews}
                onImageClick={(url) => {
                    setSelectedImageUrl(url);
                    setViewerModalOpen(true);
                }}
            />

            <ImageViewerModal
                isOpen={viewerModalOpen}
                onClose={() => setViewerModalOpen(false)}
                imageUrl={selectedImageUrl}
            />

            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 p-4 md:p-6">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                            <div>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-xl">
                                        <FiGlobe className="w-6 h-6 text-white" />
                                    </div>
                                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                        News Dashboard
                                    </h1>
                                </div>
                                <p className="text-gray-600 ml-16">Manage and monitor all your news articles</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                                    className="p-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 shadow-md"
                                >
                                    {viewMode === 'grid' ? <FiList size={20} /> : <FiGrid size={20} />}
                                </button>
                                <button
                                    onClick={() => navigate('/news/add')}
                                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-xl hover:shadow-2xl flex items-center gap-2 font-medium whitespace-nowrap transform hover:-translate-y-0.5"
                                >
                                    <FiPlus size={20} />
                                    Add New Article
                                </button>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <StatsCard
                                icon={FiGlobe}
                                label="Total Articles"
                                value={stats.total}
                                color="text-blue-600"
                                gradient="bg-gradient-to-br from-blue-500 to-blue-600"
                            />
                            <StatsCard
                                icon={FiImage}
                                label="With Images"
                                value={stats.withImage}
                                color="text-green-600"
                                gradient="bg-gradient-to-br from-green-500 to-green-600"
                            />
                            <StatsCard
                                icon={FiVideo}
                                label="With Videos"
                                value={stats.withVideo}
                                color="text-purple-600"
                                gradient="bg-gradient-to-br from-purple-500 to-purple-600"
                            />
                            <StatsCard
                                icon={FiBarChart2}
                                label="Categories"
                                value={stats.categories}
                                color="text-orange-600"
                                gradient="bg-gradient-to-br from-orange-500 to-orange-600"
                            />
                        </div>
                    </div>

                    {/* Search and Filter Bar */}
                    <div className="bg-gradient-to-r from-white to-gray-50 rounded-2xl p-6 mb-8 shadow-xl border border-gray-200">
                        <div className="flex flex-col lg:flex-row gap-4">
                            {/* Search */}
                            <div className="flex-1 relative">
                                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    className="w-full pl-12 pr-4 py-3.5 bg-gradient-to-r from-gray-50 to-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 shadow-sm"
                                    placeholder="Search articles by title, content, or category..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* Filters */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setActiveFilter('all')}
                                    className={`px-5 py-3.5 rounded-xl font-medium transition-all duration-300 ${activeFilter === 'all' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 hover:shadow-md'}`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setActiveFilter('withImage')}
                                    className={`px-5 py-3.5 rounded-xl font-medium transition-all duration-300 ${activeFilter === 'withImage' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 hover:shadow-md'}`}
                                >
                                    <FiImage className="inline mr-2" />
                                    Images
                                </button>
                                <button
                                    onClick={() => setActiveFilter('withVideo')}
                                    className={`px-5 py-3.5 rounded-xl font-medium transition-all duration-300 ${activeFilter === 'withVideo' ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 hover:shadow-md'}`}
                                >
                                    <FiVideo className="inline mr-2" />
                                    Videos
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Loading State */}
                    {loading ? (
                        <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-16 text-center border border-gray-200 shadow-xl">
                            <div className="inline-flex flex-col items-center">
                                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                    <FiLoader className="animate-spin text-4xl text-white" />
                                </div>
                                <p className="text-gray-600 text-lg">Loading news articles...</p>
                                <p className="text-gray-400 text-sm mt-2">Fetching the latest updates</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Results Header */}
                            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-100">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800">
                                            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{filteredNews.length}</span> of <span className="text-gray-700">{newsData.length}</span> articles found
                                        </h3>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {searchTerm ? `Search results for "${searchTerm}"` : 'All articles displayed'}
                                        </p>
                                    </div>
                                    {searchTerm && (
                                        <button
                                            onClick={() => setSearchTerm('')}
                                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:shadow-md transition-all duration-200 flex items-center gap-2"
                                        >
                                            <FiX size={16} />
                                            Clear search
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Empty State */}
                            {filteredNews.length === 0 ? (
                                <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-16 text-center shadow-2xl border border-gray-200">
                                    <div className="max-w-md mx-auto">
                                        <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                                            <FiAlertTriangle className="w-12 h-12 text-gray-500" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-800 mb-3">No articles found</h3>
                                        <p className="text-gray-600 mb-6">
                                            {searchTerm ? 'Try adjusting your search terms or filters' : 'Start by adding your first news article'}
                                        </p>
                                        <button
                                            onClick={() => navigate('/news/add')}
                                            className="px-8 py-3.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-xl hover:shadow-2xl font-medium transform hover:-translate-y-0.5"
                                        >
                                            Create Your First Article
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* News Grid/List */
                                <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-6`}>
                                    {filteredNews.map(news => (
                                        <NewsCard
                                            key={news.id}
                                            news={news}
                                            onView={() => {
                                                setSelectedNews(news);
                                                setViewModalOpen(true);
                                            }}
                                            onDelete={() => {
                                                setSelectedNews(news);
                                                setDeleteModalOpen(true);
                                            }}
                                            onEdit={() => navigate(`/news/edit/${news.id}`)}
                                            onImageClick={(url) => {
                                                setSelectedImageUrl(url);
                                                setViewerModalOpen(true);
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* Footer */}
                    <div className="mt-12 pt-6 border-t border-gray-200">
                        <div className="text-center text-gray-500 text-sm">
                            <p>© 2024 News Dashboard • {newsData.length} articles • Last updated: {new Date().toLocaleDateString()}</p>
                            <p className="mt-1">All articles are stored securely in Firebase</p>
                        </div>
                    </div>
                </div>

                {/* Add custom animations */}
                <style jsx>{`
                    .line-clamp-2 {
                        display: -webkit-box;
                        -webkit-line-clamp: 2;
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                    }
                    @keyframes fadeInUp {
                        from {
                            opacity: 0;
                            transform: translateY(20px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                    @keyframes pulse-slow {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.7; }
                    }
                    .animate-fadeInUp {
                        animation: fadeInUp 0.3s ease-out;
                    }
                    .animate-pulse-slow {
                        animation: pulse-slow 2s ease-in-out infinite;
                    }
                `}</style>
            </div>
        </>
    );
};

export default ViewNews;