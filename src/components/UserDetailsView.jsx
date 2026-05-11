// UserDetailsView.jsx

import React, { useState, useEffect, useRef } from 'react';
// 🛑 IMPORTANT: Update the path to your Firebase config and include 'storage'
import { db, storage } from '../firebase'; 
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { 
    FiLoader, FiAlertTriangle, FiFileText, FiDownload, FiUser, FiArrowLeft, 
    FiUploadCloud, FiRefreshCw 
} from 'react-icons/fi';

// --- UTILITY FUNCTIONS EMBEDDED HERE (Define or import formatBytes) ---
const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0 || bytes === null || typeof bytes !== 'number') return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};
// --- END UTILITY FUNCTIONS ---

/**
 * Fetches the user metadata and their files from a single Firestore document.
 */
const fetchUserAndFileDetails = async (targetDocId) => {
    const docRef = doc(db, 'uploadfile', targetDocId);
    
    try {
        const docSnapshot = await getDoc(docRef);
        
        if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            
            const userDetails = {
                customerId: data.customerId || 'N/A',
                customerName: data.customerName || 'N/A',
                customerEmail: data.customerEmail || 'N/A',
                customerPhone: data.customerPhone || 'N/A',
                createdAt: data.createdAt?.toDate() || null, 
            };
            
            const filesList = Array.isArray(data.files) ? data.files.map(file => ({
                id: file.fileId || `${targetDocId}-${file.originalName}`, 
                originalName: file.originalName || 'Unknown File',
                fileType: file.fileType || 'N/A',
                fileSize: file.fileSize || 0,
                downloads: file.downloads || 0,
                downloadURL: file.downloadURL,
                uploaded: file.uploadedAt?.toDate()?.toLocaleDateString() || 'N/A'
            })) : [];

            return { userDetails, filesList, docId: targetDocId };
        } else {
            return null;
        }
    } catch (error) {
        // Log the error internally but throw a generic message for the UI
        console.error("Fetch Error:", error);
        throw new Error("Failed to communicate with the database."); 
    }
};

export default function UserDetailsView({ userIdToView, onBack }) {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isUploading, setIsUploading] = useState(false); // New upload state
    const [uploadMessage, setUploadMessage] = useState(null); // New upload message state

    const fileInputRef = useRef(null);

    // Function to load/reload data
    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchUserAndFileDetails(userIdToView); 
            setUserData(result);
        } catch (err) {
            setError(err.message || "An unknown error occurred during fetch.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userIdToView) {
            loadData();
        }
    }, [userIdToView]);
    
    const handleDownload = (url) => {
        if (url) {
            window.open(url, '_blank');
        } else {
            alert('Download URL not available.');
        }
    };

    // --- NEW UPLOAD HANDLER ---
    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file || !userIdToView) {
            setUploadMessage({ type: 'error', text: "Missing file or user ID. Cannot upload." });
            return;
        }

        setIsUploading(true);
        setUploadMessage(null);
        const uniqueFileId = uuidv4();
        // Storage path: uploadfile/{userId}/{fileName}_{uuid}
        const storageRef = ref(storage, `uploadfile/${userIdToView}/${file.name}_${uniqueFileId}`);

        try {
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            const fileMetadata = {
                fileId: uniqueFileId,
                originalName: file.name,
                fileType: file.type,
                fileSize: file.size,
                downloads: 0,
                uploadedAt: new Date(),
                storagePath: snapshot.ref.fullPath,
                downloadURL: downloadURL,
            };

            const docRef = doc(db, 'uploadfile', userIdToView);
            
            // Atomically add the new file metadata to the 'files' array
            await updateDoc(docRef, {
                files: arrayUnion(fileMetadata)
            });

            setUploadMessage({ type: 'success', text: `File "${file.name}" uploaded successfully!` });
            
            // Reload the data to display the new file in the table
            await loadData(); 

        } catch (err) {
            console.error("Upload Error:", err);
            setUploadMessage({ type: 'error', text: `Failed to upload file: ${err.message}` });
        } finally {
            setIsUploading(false);
            event.target.value = null; // Reset input field
            // Clear message after a delay
            setTimeout(() => setUploadMessage(null), 5000); 
        }
    };

    // --- Render Loading/Error/Not Found States ---
    if (!userIdToView) return <div className="p-6 bg-yellow-100 border border-yellow-300 rounded-lg text-yellow-800"><FiAlertTriangle className="inline w-5 h-5 mr-2" /> No User ID provided.</div>;
    if (loading) return (<div className="p-6 text-center text-blue-500 font-semibold bg-blue-50 rounded-lg"><FiLoader className="w-5 h-5 inline mr-2 animate-spin" /> Loading user details for **{userIdToView}**...</div>);
    if (error) return (<div className="p-6 text-left text-red-600 font-semibold bg-red-100 border border-red-300 rounded-lg"><p className="font-bold flex items-center"><FiAlertTriangle className="w-5 h-5 mr-2" /> Error Loading Data:</p><p className="text-sm">{error}</p></div>);
    if (!userData) return (<div className="p-6 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">The document with ID **{userIdToView}** was not found.</div>);

    // --- Successful Data Display ---
    return (
        <div className="p-6 border border-gray-200 rounded-xl shadow-lg bg-white">
            <button onClick={onBack} className="mb-4 flex items-center text-purple-600 hover:text-purple-800 font-medium">
                <FiArrowLeft className="w-4 h-4 mr-2" /> Back to All Files
            </button>

            <h2 className="text-2xl font-bold text-gray-800 flex items-center mb-4 pb-2 border-b">
                <FiUser className="w-6 h-6 mr-3 text-purple-600" /> Details for: {userData.userDetails.customerName}
            </h2>

            {/* Customer Information */}
            <h3 className="text-xl font-semibold mb-3 text-purple-700">Customer Information</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-6 p-4 bg-purple-50 rounded-lg text-sm mb-6">
                <p className="font-medium text-gray-700">Name:</p><p className="font-semibold col-span-1">{userData.userDetails.customerName}</p>
                <p className="font-medium text-gray-700">Email:</p><p className="col-span-1 break-words">{userData.userDetails.customerEmail}</p>
                <p className="font-medium text-gray-700">Phone:</p><p>{userData.userDetails.customerPhone}</p>
                <p className="font-medium text-gray-700">Account ID:</p><p className="font-mono text-xs break-all">{userData.docId}</p>
                <p className="font-medium text-gray-700">Created At:</p><p>{userData.userDetails.createdAt?.toLocaleDateString() || 'N/A'}</p>
            </div>
            
            {/* Files List Section */}
            <div className="flex justify-between items-center mb-4 border-t pt-4">
                <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                    <FiFileText className="w-5 h-5 mr-2 text-red-600" /> Uploaded Files ({userData.filesList.length})
                </h3>
                
                {/* --- NEW UPLOAD UI --- */}
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} disabled={isUploading} />
                <div className="flex space-x-2">
                    <button 
                        onClick={() => loadData()}
                        disabled={isUploading || loading}
                        className="p-2 text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors flex items-center disabled:opacity-50"
                        title="Refresh File List"
                    >
                        <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button 
                        onClick={() => fileInputRef.current.click()} 
                        disabled={isUploading}
                        className="px-4 py-2 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-md disabled:bg-green-300 flex items-center"
                    >
                        <FiUploadCloud className="w-4 h-4 mr-2" /> {isUploading ? 'Uploading...' : 'Upload File'}
                    </button>
                </div>
                {/* --- END NEW UPLOAD UI --- */}
            </div>

            {/* Upload Status Message */}
            {uploadMessage && (
                <div className={`p-3 mb-4 rounded-lg text-sm ${
                    uploadMessage.type === 'error' ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-green-100 text-green-700 border border-green-300'
                }`}>
                    <FiAlertTriangle className="inline w-4 h-4 mr-2" /> {uploadMessage.text}
                </div>
            )}
            
            {/* Files Table (Condensed) */}
            {userData.filesList.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {['File Name', 'Type', 'Size', 'Uploaded', 'Downloads', 'Actions'].map(header => (
                                    <th key={header} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {userData.filesList.map((file) => (
                                <tr key={file.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 text-sm font-medium text-gray-900 truncate max-w-xs">{file.originalName}</td>
                                    <td className="px-4 py-2 text-xs text-gray-600">{file.fileType}</td>
                                    <td className="px-4 py-2 text-xs text-gray-600 whitespace-nowrap">{formatBytes(file.fileSize)}</td>
                                    <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">{file.uploaded}</td>
                                    <td className="px-4 py-2 text-sm text-center text-gray-700">{file.downloads}</td>
                                    <td className="px-4 py-2">
                                        <button 
                                            onClick={() => handleDownload(file.downloadURL)}
                                            className="p-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                                            title="Download File"
                                        >
                                            <FiDownload className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-gray-500 p-4 border rounded-md">This user has not uploaded any files yet.</p>
            )}
        </div>
    );
}