import React, { useState, useEffect } from 'react';
import {
  FiTag,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiFilter,
  FiCheck,
  FiX,
  FiLayers,
  FiShoppingBag,
  FiRefreshCw
} from 'react-icons/fi';

// Firebase imports
import { db } from "../../firebase";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "firebase/firestore";

const ManageCategories = () => {
  const [label, setLabel] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLabel, setFilterLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // *** NEW STATE FOR INLINE EDITING ***
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const LABELS = ['E-Store', 'Local Market', "Printing"];

  // Fetch categories from Firebase
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "categories"));
      const categoriesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCategories(categoriesData);
    } catch (error) {
      console.error("Error fetching categories:", error);
      setMessage("❌ Failed to fetch categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Add category to Firebase
  const handleAddCategory = async () => {
    if (!label || !categoryName) {
      setMessage("❌ Please fill all required fields!");
      return;
    }

    setLoading(true);
    try {
      const newCategory = {
        label,
        name: categoryName,
        status: 'Active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, "categories"), newCategory);
      
      // Update the document with its ID
      await updateDoc(doc(db, "categories", docRef.id), {
        id: docRef.id
      });

      setMessage("✅ Category added successfully!");
      setLabel('');
      setCategoryName('');
      fetchCategories(); // Refresh the list
    } catch (error) {
      console.error("Error adding category:", error);
      setMessage("❌ Failed to add category");
    } finally {
      setLoading(false);
    }
  };
  
  // *** NEW FUNCTION: Start Editing ***
  const startEditing = (id, name) => {
      setEditingId(id);
      setEditingName(name);
  };

  // *** NEW FUNCTION: Save Edited Name ***
  const handleEditCategoryName = async (id) => {
      if (!editingName.trim()) {
          setMessage("❌ Category name cannot be empty!");
          return;
      }
      if (editingName === categories.find(c => c.id === id)?.name) {
          setEditingId(null); // No change, just close edit mode
          return;
      }

      setLoading(true);
      try {
          await updateDoc(doc(db, "categories", id), {
              name: editingName,
              updatedAt: serverTimestamp()
          });
          
          setMessage("✅ Category name updated successfully!");
          setEditingId(null);
          setEditingName('');
          fetchCategories(); // Refresh the list
      } catch (error) {
          console.error("Error updating category name:", error);
          setMessage("❌ Failed to update category name");
      } finally {
          setLoading(false);
      }
  };

  // Toggle category status in Firebase
  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
      await updateDoc(doc(db, "categories", id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      
      setMessage(`✅ Category ${newStatus.toLowerCase()} successfully!`);
      fetchCategories(); // Refresh the list
    } catch (error) {
      console.error("Error updating category status:", error);
      setMessage("❌ Failed to update category status");
    }
  };

  // Update category label in Firebase
  const handleEditLabel = async (id, newLabel) => {
    try {
      await updateDoc(doc(db, "categories", id), {
        label: newLabel,
        updatedAt: serverTimestamp()
      });
      
      setMessage("✅ Label updated successfully!");
      fetchCategories(); // Refresh the list
    } catch (error) {
      console.error("Error updating label:", error);
      setMessage("❌ Failed to update label");
    }
  };

  // Delete category from Firebase
  const handleDeleteCategory = async (id, categoryName) => {
    if (!window.confirm(`Are you sure you want to delete "${categoryName}"?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "categories", id));
      setMessage("✅ Category deleted successfully!");
      fetchCategories(); // Refresh the list
    } catch (error) {
      console.error("Error deleting category:", error);
      setMessage("❌ Failed to delete category");
    }
  };

  // Filter categories based on search and filter
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterLabel ? category.label === filterLabel : true)
  );

  const getStatusBadge = (status) => {
    return status === 'Active'
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-red-100 text-red-800 border-red-200';
  };

  const getLabelBadge = (label) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium border';
    // Simplified your existing logic as the label values were different from the string literals in the logic
    if (label === 'E-Store') {
        return `${baseClasses} bg-blue-100 text-blue-800 border-blue-200`;
    } else if (label === 'Local Market') {
        return `${baseClasses} bg-purple-100 text-purple-800 border-purple-200`;
    } else if (label === 'Printing') {
        return `${baseClasses} bg-orange-100 text-orange-800 border-orange-200`;
    } else {
      return `${baseClasses} bg-gray-100 text-gray-800 border-gray-200`;
    }
  };

  const isSuccess = message?.startsWith("✅");
  const messageClass = isSuccess
    ? "bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-green-500 text-green-700"
    : "bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 text-red-700";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mb-4">
            <FiLayers className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Manage Categories
          </h1>
          <p className="text-gray-600 text-lg">Organize and manage your product categories</p>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          
          {/* Message Alert */}
          {message && (
            <div className={`p-4 flex items-center ${messageClass}`}>
              <div className={`w-6 h-6 rounded-full ${isSuccess ? 'bg-green-500' : 'bg-red-500'} flex items-center justify-center mr-3`}>
                {isSuccess ? <FiCheck className="w-4 h-4 text-white" /> : <FiX className="w-4 h-4 text-white" />}
              </div>
              <span className="font-medium">{message}</span>
            </div>
          )}

          {/* Add Category Form */}
          <div className="p-8 border-b border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center mb-6">
              <FiPlus className="w-6 h-6 mr-3 text-green-600" />
              Add New Category
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Display Label */}
              <div className="space-y-2">
                <label className="font-semibold text-gray-700 flex items-center">
                  <FiTag className="w-4 h-4 mr-2 text-blue-500" />
                  Display Label
                </label>
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                >
                  <option value="">Select label...</option>
                  {LABELS.map((lbl) => (
                    <option key={lbl} value={lbl}>
                      {lbl}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Name */}
              <div className="space-y-2">
                <label className="font-semibold text-gray-700 flex items-center">
                  <FiShoppingBag className="w-4 h-4 mr-2 text-purple-500" />
                  Category Name <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Enter category name"
                />
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={handleAddCategory}
                disabled={loading}
                className="flex items-center space-x-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <FiRefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <FiPlus className="w-5 h-5" />
                )}
                <span>Add Category</span>
              </button>

              <button
                onClick={fetchCategories}
                className="flex items-center space-x-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200"
              >
                <FiRefreshCw className="w-5 h-5" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Existing Categories Section */}
          <div className="p-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 space-y-4 lg:space-y-0">
              <h3 className="text-2xl font-semibold text-gray-800 flex items-center">
                <FiLayers className="w-6 h-6 mr-3 text-blue-600" />
                Existing Categories
                <span className="ml-3 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {filteredCategories.length} categories
                </span>
              </h3>

              <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                {/* Search Input */}
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search categories..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64"
                  />
                </div>

                {/* Filter by Label */}
                <div className="relative">
                  <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    value={filterLabel}
                    onChange={(e) => setFilterLabel(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-48 appearance-none"
                  >
                    <option value="">All Labels</option>
                    {LABELS.map((lbl) => (
                      <option key={lbl} value={lbl}>{lbl}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Categories Table */}
            <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
              {loading && !categories.length ? ( // Only show full-screen loading on initial load or full refresh
                <div className="flex justify-center items-center py-12">
                  <FiRefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                          LABEL
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                          NAME
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                          STATUS
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                          ACTIONS
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredCategories.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                            <FiLayers className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg">No categories found</p>
                            <p className="text-sm mt-1">
                              {searchTerm || filterLabel ? "Try adjusting your search or filter" : "Start by adding your first category"}
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filteredCategories.map((category) => (
                          <tr key={category.id} className="hover:bg-gray-50 transition-colors duration-150">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={getLabelBadge(category.label)}>
                                {category.label}
                              </span>
                            </td>
                            {/* *** UPDATED: Category Name Cell with Edit Logic *** */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              {editingId === category.id ? (
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="text"
                                        value={editingName}
                                        onChange={(e) => setEditingName(e.target.value)}
                                        className="px-2 py-1 border border-blue-400 rounded-lg focus:ring-blue-500 focus:border-blue-500 w-64"
                                    />
                                    <button
                                        onClick={() => handleEditCategoryName(category.id)}
                                        className="text-green-600 hover:text-green-800"
                                        title="Save Name"
                                    >
                                        <FiCheck className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => { setEditingId(null); setEditingName(''); }}
                                        className="text-red-600 hover:text-red-800"
                                        title="Cancel Edit"
                                    >
                                        <FiX className="w-5 h-5" />
                                    </button>
                                </div>
                              ) : (
                                <div className="flex items-center">
                                  <FiShoppingBag className="w-4 h-4 mr-2 text-purple-500" />
                                  <span className="font-semibold text-gray-800">{category.name}</span>
                                  <button
                                      onClick={() => startEditing(category.id, category.name)}
                                      className="ml-2 text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-gray-200 transition-colors duration-150"
                                      title="Edit Category Name"
                                  >
                                      <FiEdit2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </td>
                            {/* *** END UPDATED *** */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadge(category.status)}`}>
                                {category.status === 'Active' ? (
                                  <FiCheck className="w-3 h-3 mr-1" />
                                ) : (
                                  <FiX className="w-3 h-3 mr-1" />
                                )}
                                {category.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => handleToggleStatus(category.id, category.status)}
                                  className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                                    category.status === 'Active'
                                      ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                      : 'bg-green-50 text-green-600 hover:bg-green-100'
                                  }`}
                                >
                                  {category.status === 'Active' ? (
                                    <>
                                      <FiX className="w-3 h-3" />
                                      <span>Deactivate</span>
                                    </>
                                  ) : (
                                    <>
                                      <FiCheck className="w-3 h-3" />
                                      <span>Activate</span>
                                    </>
                                  )}
                                </button>

                                <select
                                  onChange={(e) => handleEditLabel(category.id, e.target.value)}
                                  value={category.label}
                                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                >
                                  {LABELS.map((lbl) => (
                                    <option key={lbl} value={lbl}>{lbl}</option>
                                  ))}
                                </select>

                                <button
                                  onClick={() => handleDeleteCategory(category.id, category.name)}
                                  className="flex items-center space-x-1 bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors duration-200"
                                >
                                  <FiTrash2 className="w-3 h-3" />
                                  <span className="text-sm font-medium">Delete</span>
                                </button>
                              </div>
                            </td>   
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageCategories;