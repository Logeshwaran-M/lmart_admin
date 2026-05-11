// BannerPage.jsx
import React, { useState } from 'react';
import { FiLayout, FiTag, FiBox } from 'react-icons/fi';

// --- Sample Data for Products ---
// This data mimics the product cards seen in the screenshot
const initialProducts = [
  { id: 1, name: 'men dresses', seller: 'Imart', image: 'https://via.placeholder.com/100x70?text=P1' },
  { id: 2, name: 'T Shirt', seller: 'Imart', image: 'https://via.placeholder.com/100x70?text=P2' },
  { id: 3, name: 'new', seller: 'Imart', image: 'https://via.placeholder.com/100x70?text=P3' },
  { id: 4, name: 'Dashr', seller: 'Localmarket', image: 'https://via.placeholder.com/100x70?text=P4' },
  { id: 5, name: 'seller 1 product i phone 17', seller: 'Localmarket', image: 'https://via.placeholder.com/100x70?text=P5' },
  { id: 6, name: 'Dashr', seller: 'Localmarket', image: 'https://via.placeholder.com/100x70?text=P6' },
  { id: 7, name: 'Book', seller: 'Localmarket', image: 'https://via.placeholder.com/100x70?text=P7' },
  { id: 8, name: 'Newbrand', seller: 'Localmarket', image: 'https://via.placeholder.com/100x70?text=P8' },
  { id: 9, name: '2 Layer Ribbon Batches', seller: 'Localmarket', image: 'https://via.placeholder.com/100x70?text=P9' },
  { id: 10, name: '3 Layer Ribbon Batches', seller: 'Localmarket', image: 'https://via.placeholder.com/100x70?text=P10' },
  { id: 11, name: '1 Layer Ribbon Batches', seller: 'Localmarket', image: 'https://via.placeholder.com/100x70?text=P11' },
  { id: 12, name: 'women dress', seller: 'Printing', image: 'https://via.placeholder.com/100x70?text=P12' },
  { id: 13, name: 'Book', seller: 'Printing', image: 'https://via.placeholder.com/100x70?text=P13' },
  { id: 14, name: 'Book', seller: 'Printing', image: 'https://via.placeholder.com/100x70?text=P14' },
  { id: 15, name: 'oldee', seller: 'Oldee', image: 'https://via.placeholder.com/100x70?text=P15' },
];

// Product Card Component
const ProductCard = ({ product, onClick }) => (
  <button
    onClick={() => onClick(product)}
    className="flex items-center p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg hover:border-purple-400 transition-all duration-300 text-left"
  >
    {/* Product Image */}
    <img 
      src={product.image} 
      alt={product.name} 
      className="w-16 h-12 object-cover rounded mr-3 border border-gray-100" 
      onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/100x70?text=No+Img'; }}
    />
    
    {/* Product Details */}
    <div className="flex-1 overflow-hidden">
      <p className="text-sm font-semibold text-gray-800 truncate">{product.name}</p>
      <p className="text-xs text-gray-500 flex items-center">
        <FiTag className="w-3 h-3 mr-1" />
        {product.seller}
      </p>
    </div>
  </button>
);

export default function BannerPage() {
  const [products] = useState(initialProducts);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    // In a real application, this would trigger opening a banner upload/management modal
    alert(`Managing banner for: ${product.name}`);
  };

  return (
    <div className="flex-1 p-6 lg:p-8 bg-gray-100 min-h-screen">
      <div className="banner-container bg-white rounded-lg shadow-xl p-6">

        {/* Header */}
        <div className="flex items-center pb-4 border-b border-gray-100 mb-6">
          <FiLayout className="w-5 h-5 mr-2 text-purple-600" />
          <h2 className="text-xl font-bold text-gray-800">Banner Manager</h2>
        </div>

        {/* Instruction */}
        <p className="text-lg font-medium text-gray-700 mb-6">
          First, please select a product.
        </p>
        
        {/* Product Selection Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              onClick={handleProductSelect} 
            />
          ))}
        </div>

        {/* Selected Product Banner Status (Optional Detail) */}
        {selectedProduct && (
          <div className="mt-8 p-4 bg-purple-50 border border-purple-300 rounded-lg">
            <h3 className="text-md font-semibold text-purple-800 flex items-center">
              <FiBox className="w-4 h-4 mr-2" /> 
              Current Status for: {selectedProduct.name}
            </h3>
            <p className="text-sm text-purple-700 mt-1">
              Clicking the product card would open a modal to upload or modify its specific banner.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}