import React from 'react';
import { FiCheck, FiArrowLeft, FiEdit } from 'react-icons/fi';

const ProductUpdateSuccessModal = ({ productData, productId, onClose }) => {
    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-8 space-y-6 transform transition-all duration-300 scale-100">
                <div className="text-center">
                    <FiCheck className="w-12 h-12 text-green-500 mx-auto mb-4 bg-green-100 p-2 rounded-full" />
                    <h3 className="text-2xl font-bold text-gray-900">Product Updated Successfully!</h3>
                    <p className="mt-2 text-gray-600">
                        Your product, **{productData.name || 'Untitled Product'}**, has been successfully updated.
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                        Product ID: <span className="font-mono bg-gray-100 p-1 rounded text-xs">{productId}</span>
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                    <button
                        type="button"
                        onClick={() => onClose(false)} // Close and stay on the current page for more edits
                        className="flex-1 py-3 px-4 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 transition-colors flex items-center justify-center"
                    >
                        <FiEdit className="inline w-5 h-5 mr-1" /> Continue Editing
                    </button>
                    <button
                        type="button"
                        onClick={() => onClose(true)} // Close and navigate away (e.g., to product list)
                        className="flex-1 py-3 px-4 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center"
                    >
                        <FiArrowLeft className="inline w-5 h-5 mr-1" /> Go to Product List
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductUpdateSuccessModal;