// import React, { useEffect, useState } from "react";
// import { FiEdit, FiTrash2 } from "react-icons/fi";
// import { useNavigate } from "react-router-dom";

// import { db } from "../../firerbase";
// import {
//   collection,
//   onSnapshot,
//   deleteDoc,
//   doc
// } from "firebase/firestore";

// const ProductList = () => {
//   const navigate = useNavigate();

//   const [products, setProducts] = useState([]);
//   const [loading, setLoading] = useState(true);

//   // ---------------------------------------------------------
//   // FETCH PRODUCTS IN REAL TIME
//   // ---------------------------------------------------------
//   useEffect(() => {
//     const unsub = onSnapshot(
//       collection(db, "products"),
//       (snapshot) => {
//         const list = snapshot.docs.map((doc) => ({
//           id: doc.id,
//           ...doc.data(),
//         }));

//         setProducts(list);
//         setLoading(false);
//       },
//       (err) => {
//         console.error("Error fetching products:", err);
//         setLoading(false);
//       }
//     );

//     return () => unsub();
//   }, []);

//   // ---------------------------------------------------------
//   // DELETE PRODUCT
//   // ---------------------------------------------------------
//   const handleDelete = async (productId) => {
//     if (!window.confirm("Are you sure you want to delete this product?")) return;

//     try {
//       await deleteDoc(doc(db, "products", productId));
//       alert("Product deleted successfully!");
//     } catch (error) {
//       console.error("Delete error:", error);
//       alert("Failed to delete product.");
//     }
//   };

//   // ---------------------------------------------------------
//   // UI RETURN
//   // ---------------------------------------------------------
//   if (loading) {
//     return (
//       <div className="p-6 text-center font-medium text-gray-700">
//         Loading products...
//       </div>
//     );
//   }

//   return (
//     <div className="p-6 bg-white shadow-xl rounded-xl">
//       <h1 className="text-3xl font-bold mb-6">All Products</h1>

//       {products.length === 0 ? (
//         <p className="text-gray-600">No products available.</p>
//       ) : (
//         <div className="overflow-x-auto">
//           <table className="min-w-full border-collapse">
//             <thead>
//               <tr className="bg-gray-100 border-b">
//                 <th className="p-3 text-left">Image</th>
//                 <th className="p-3 text-left">Name</th>
//                 <th className="p-3 text-left">Category</th>
//                 <th className="p-3 text-left">Price</th>
//                 <th className="p-3 text-center">Stock</th>
//                 <th className="p-3 text-center">Actions</th>
//               </tr>
//             </thead>

//             <tbody>
//               {products.map((product, index) => (
//                 <tr
//                   key={product.id}
//                   className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
//                 >
//                   <td className="p-3">
//                     <img
//                       src={
//                         product.imageUrls?.[0]?.url ||
//                         "https://via.placeholder.com/80"
//                       }
//                       alt={product.name}
//                       className="w-16 h-16 rounded object-cover"
//                     />
//                   </td>

//                   <td className="p-3 font-medium">{product.name}</td>

//                   <td className="p-3">
//                     {product.category?.name || "No Category"}
//                   </td>

//                   <td className="p-3">₹{product.price}</td>

//                   <td className="p-3 text-center">{product.stock}</td>

//                   <td className="p-3 text-center flex items-center justify-center space-x-4">
//                     {/* EDIT BUTTON (IMPORTANT FIX) */}
//                     <button
//                       onClick={() =>
//                         navigate(`/products/edit/${product.id}`)
//                       }
//                       className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
//                       title="Edit Product"
//                     >
//                       <FiEdit />
//                     </button>

//                     {/* DELETE BUTTON */}
//                     <button
//                       onClick={() => handleDelete(product.id)}
//                       className="p-2 bg-red-500 text-white rounded hover:bg-red-600"
//                       title="Delete Product"
//                     >
//                       <FiTrash2 />
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>

//           </table>
//         </div>
//       )}
//     </div>
//   );
// };

// export default ProductList;
