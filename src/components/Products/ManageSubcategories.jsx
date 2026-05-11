import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import {
  FiEdit2,
  FiTrash2,
  FiSave,
  FiX,
  FiTag,
  FiLayers,
  FiPercent,
  FiShoppingBag,
  FiRefreshCw,
} from "react-icons/fi";
import { db } from "../../firebase";

const ManageSubcategories = () => {
  // --- REF FOR SCROLLING ---
  const formRef = useRef(null); // 1. Create the Ref

  // --- STATE FOR FORM INPUTS ---
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState(""); // Stores Category ID (used for saving/filtering)
  const [categoryName, setCategoryName] = useState(""); // Stores Category NAME (used for display)
  const [subcategory, setSubcategory] = useState("");
  const [commission, setCommission] = useState("");
  const [editId, setEditId] = useState(null); // Stores the Subcategory Document ID being edited
  const [searchTerm, setSearchTerm] = useState("");

  // --- STATE FOR DATA MANAGEMENT ---
  const [subcategories, setSubcategories] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Hardcoded labels
  const LABELS = ['E-Store', 'Local Market', "Printing"];

  // 1. --- FETCH CATEGORIES FROM FIRESTORE (MODIFIED WITH FILTERING) ---
  const fetchCategories = useCallback(async (currentLabel) => {
    if (!currentLabel) {
      setCategoriesList([]);
      setCategory("");
      setCategoryName("");
      return;
    }

    setLoadingCategories(true);
    try {
      // Apply 'where' clause to filter categories by the selected label
      const categoriesQuery = query(
        collection(db, "categories"),
        where("label", "==", currentLabel)
      );

      const querySnapshot = await getDocs(categoriesQuery);
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
      }));

      setCategoriesList(data);

      // Set the default category ID and Name for the form from the filtered list
      if (data.length > 0) {
        setCategory(data[0].id);
        setCategoryName(data[0].name);
      } else {
        setCategory("");
        setCategoryName("");
      }

    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  // 2. --- FETCH SUBCATEGORIES FROM FIRESTORE ---
  const fetchSubcategories = useCallback(async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "subcategories"));
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        // Ensure categoryId exists for safe usage
        categoryId: doc.data().categoryId || '',
      }));
      setSubcategories(data);
    } catch (error) {
      console.error("Error fetching subcategories:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Run initial fetches
  useEffect(() => {
    fetchSubcategories();
  }, [fetchSubcategories]);

  useEffect(() => {
    // 2. Fetch categories whenever the selected 'label' changes
    fetchCategories(label);
  }, [label, fetchCategories]);


  // Handler for category dropdown change
  const handleCategoryChange = (e) => {
    const selectedId = e.target.value;
    setCategory(selectedId);

    // Find the corresponding name for display
    const selectedCat = categoriesList.find(cat => cat.id === selectedId);
    setCategoryName(selectedCat ? selectedCat.name : "");
  };

  // Add or Update Subcategory
  const handleSave = async () => {
    if (!label || !category || !subcategory) {
      alert("Please fill all required fields!");
      return;
    }

    const currentCategory = categoriesList.find(cat => cat.id === category);
    const categoryNameToSave = currentCategory ? currentCategory.name : 'Unknown Category';

    setLoading(true);
    try {
      // Base data structure (ID will be added for new documents or inherited for edits)
      const subcategoryData = {
        label,
        category: categoryNameToSave, // Category Name for display/legacy
        categoryId: category,         // Category Document ID (essential for filtering)
        subcategory,
        commission: commission ? Number(commission) : 0,
        updatedAt: new Date(),
      };

      if (editId) {
        // Update existing (the document key 'editId' is sufficient)
        await updateDoc(doc(db, "subcategories", editId), subcategoryData);
      } else {
        // Add new
        const docRef = await addDoc(collection(db, "subcategories"), {
          ...subcategoryData,
          createdAt: new Date(),
        });

        // Explicitly store the Firestore Document ID into the 'id' field
        await updateDoc(doc(db, "subcategories", docRef.id), {
          id: docRef.id,
        });
      }

      resetForm();
      fetchSubcategories(); // Re-fetch to update the table
    } catch (error) {
      console.error("Error saving subcategory:", error);
    } finally {
      setLoading(false);
    }
  };

  // Delete Subcategory
  const handleDelete = async (id, subcategoryName) => {
    if (!window.confirm(`Are you sure you want to delete "${subcategoryName}"?`))
      return;

    try {
      await deleteDoc(doc(db, "subcategories", id));
      fetchSubcategories();
    } catch (error) {
      console.error("Error deleting subcategory:", error);
    }
  };

  // Edit subcategory (prefill fields) - FIX APPLIED HERE
  const handleEdit = (item) => {
    setLabel(item.label);
    setSubcategory(item.subcategory);
    setCommission(item.commission);
    setEditId(item.id);

    // Set the category ID and Name from the existing subcategory item
    setCategory(item.categoryId || categoriesList[0]?.id || "");
    setCategoryName(item.category || categoriesList[0]?.name || "");
    
    // 2. SCROLL FIX: Scroll the form into view
    if (formRef.current) {
      formRef.current.scrollIntoView({ 
        behavior: "smooth", 
        block: "start" 
      });
    }
  };

  // Reset form
  const resetForm = () => {
    setLabel(""); // Clear the label selection
    setSubcategory("");
    setCommission("");
    setEditId(null);
    
    // The useEffect listening to 'label' will clear/reset category states
  };

  // Filter subcategories based on search 
  const filteredSubcategories = subcategories.filter(item =>
    item.subcategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.categoryId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isFormDisabled = loading || loadingCategories;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mb-4">
            <FiLayers className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Manage Subcategories
          </h1>
          <p className="text-gray-600 text-lg">Organize your product categories and subcategories</p>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          
          {/* Form Section - 3. ATTACH THE REF HERE */}
          <div className="p-8 border-b border-gray-200" ref={formRef}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
                <FiTag className="w-6 h-6 mr-3 text-purple-600" />
                {editId ? "Edit Subcategory" : "Add New Subcategory"}
              </h2>
              {editId && (
                <button
                  onClick={resetForm}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  disabled={loading}
                >
                  <FiX className="w-4 h-4" />
                  <span>Cancel Edit</span>
                </button>
              )}
            </div>

            {loadingCategories && (
              <div className="flex items-center p-3 mb-4 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700 rounded-md">
                <FiRefreshCw className="w-4 h-4 mr-2 animate-spin" />
                <span className="text-sm">Loading categories from Firestore...</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Label */}
              <div className="space-y-2">
                <label className="font-semibold text-gray-700 flex items-center">
                  <FiShoppingBag className="w-4 h-4 mr-2 text-blue-500" />
                  Label <span className="text-red-500 ml-1">*</span>
                </label>
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  disabled={isFormDisabled}
                >
                  <option value="">Select Label...</option>
                  {LABELS.map((lbl) => (
                    <option key={lbl} value={lbl}>
                      {lbl}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category (Stores ID as value) */}
              <div className="space-y-2">
                <label className="font-semibold text-gray-700 flex items-center">
                  <FiLayers className="w-4 h-4 mr-2 text-green-500" />
                  Category <span className="text-red-500 ml-1">*</span>
                </label>
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                  value={category}
                  onChange={handleCategoryChange}
                  // Disable category selection if no label is selected or categories are loading
                  disabled={isFormDisabled || !label || categoriesList.length === 0}
                >
                  {!label ? (
                    <option value="">Select a Label first</option>
                  ) : loadingCategories ? (
                    <option value="">Loading...</option>
                  ) : categoriesList.length === 0 ? (
                    <option value="">No Categories Found for "{label}"</option>
                  ) : (
                    <>
                      <option value="">Select Category...</option>
                      {categoriesList.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                {/* Displaying selected category name */}
                {categoryName && (
                    <p className="text-xs text-gray-500 mt-1">
                        Selected: **{categoryName}** (ID: {category.substring(0, 8)}...)
                    </p>
                )}
              </div>

              {/* Commission */}
              <div className="space-y-2">
                <label className="font-semibold text-gray-700 flex items-center">
                  <FiPercent className="w-4 h-4 mr-2 text-orange-500" />
                  Commission (%)
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                  placeholder="Optional commission percentage"
                  min="0"
                  max="100"
                  step="0.1"
                  disabled={isFormDisabled}
                />
              </div>

              {/* Subcategory */}
              <div className="space-y-2">
                <label className="font-semibold text-gray-700 flex items-center">
                  <FiTag className="w-4 h-4 mr-2 text-purple-500" />
                  Subcategory Name <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  placeholder="e.g., Cameras & Photography"
                  disabled={isFormDisabled}
                />
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={handleSave}
                disabled={isFormDisabled || loading}
                className="flex items-center space-x-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <FiRefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <FiSave className="w-5 h-5" />
                )}
                <span>{editId ? "Save Changes" : "Add Subcategory"}</span>
              </button>

              <button
                onClick={fetchSubcategories}
                className="flex items-center space-x-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200"
                disabled={loading}
              >
                <FiRefreshCw className="w-5 h-5" />
                <span>Refresh Table</span>
              </button>
            </div>
          </div>
          
          {/* --- Table Section --- */}
          <div className="p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
              <h3 className="text-2xl font-semibold text-gray-800 flex items-center">
                <FiLayers className="w-6 h-6 mr-3 text-blue-600" />
                Existing Subcategories
                <span className="ml-3 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {filteredSubcategories.length} items
                </span>
              </h3>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Search subcategories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                />
                <FiTag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <FiRefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                          Label
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                          Subcategory
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                          Commission
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredSubcategories.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                            <FiLayers className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg">No subcategories found</p>
                            <p className="text-sm mt-1">
                              {searchTerm ? "Try adjusting your search terms" : "Start by adding your first subcategory"}
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filteredSubcategories.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50 transition-colors duration-150">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                  item.label === "E-Market"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-green-100 text-green-800"
                                }`}>
                                {item.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                              {/* Display Category Name and ID for easy debugging */}
                              <div className="text-sm font-bold">{item.category}</div>
                              <div className="text-xs text-gray-500">Parent ID: {item.categoryId || 'N/A'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <FiTag className="w-4 h-4 mr-2 text-purple-500" />
                                <span className="font-semibold text-gray-800">{item.subcategory}</span>
                                <span className="ml-2 text-xs text-gray-400">Sub ID: {item.id?.substring(0, 6) || 'N/A'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {item.commission ? (
                                <span className="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                                  <FiPercent className="w-3 h-3 mr-1" />
                                  {item.commission}%
                                </span>
                              ) : (
                                <span className="text-gray-400 text-sm">Not set</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleEdit(item)}
                                  className="flex items-center space-x-2 bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors duration-200"
                                >
                                  <FiEdit2 className="w-4 h-4" />
                                  <span className="text-sm font-medium">Edit</span>
                                </button>
                                <button
                                  onClick={() => handleDelete(item.id, item.subcategory)}
                                  className="flex items-center space-x-2 bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors duration-200"
                                >
                                  <FiTrash2 className="w-4 h-4" />
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageSubcategories;