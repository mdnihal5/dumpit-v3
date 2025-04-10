import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { theme } from '../../theme';
import { MainStackNavigationProp } from '../../navigation/types';
import { createProduct, uploadProductImage, ProductFormData } from '../../api/productApi';
import ScreenHeader from '../../components/ScreenHeader';
import alert from '../../utils/alert';
import Card3D from '../../components/Card3D';

// Categories for products
const CATEGORIES = [
  'Electronics',
  'Clothing',
  'Home',
  'Beauty',
  'Sports',
  'Books',
  'Food',
  'Toys',
  'Automotive',
  'Other',
];

const VendorAddProductScreen: React.FC = () => {
  const navigation = useNavigation<MainStackNavigationProp<'VendorAddProduct'>>();
  
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: 0,
    type: '',
    category: '',
    units: '',
    stock: 0,
    discount: 0,
    image: '',
    isActive: true,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.type || formData.type.trim() === '') {
      newErrors.type = 'Product type is required';
    }

    if (!formData.category || formData.category.trim() === '') {
      newErrors.category = 'Product category is required';
    }

    if (!formData.price || formData.price <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }

    if (!formData.units || formData.units.trim() === '') {
      newErrors.units = 'Units are required';
    }

    if (formData.stock === undefined || formData.stock < 0) {
      newErrors.stock = 'Stock quantity cannot be negative';
    }

    if (formData.discount !== undefined && (formData.discount < 0 || formData.discount > 100)) {
      newErrors.discount = 'Discount must be between 0 and 100%';
    }

    // Images are now optional
    // if (formData.images.length === 0) {
    //   newErrors.images = 'Please add at least one image';
    // }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData({
      ...formData,
      [field]: value,
    });

    // Clear error for this field if it exists
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  const handleImagePick = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        alert('Permission Required', 'Please allow access to your photo library to add product images.');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        const uri = selectedAsset.uri;
        
        // Upload the image to the server
        setUploading(true);
        try {
          // Create a File from URI for web
          const file = Platform.OS === 'web' 
            ? await fetch(uri).then(r => r.blob()) as File
            : {
                uri,
                type: 'image/jpeg',
                name: 'product_image.jpg',
              } as unknown as File;
          
          // First create the product to get its ID
          const productResponse = await createProduct({
            name: 'Temporary Product',
            description: 'Temporary product for image upload',
            category: formData.category,
            image: ''
          });
          
          if (!productResponse.success) {
            throw new Error('Failed to create temporary product');
          }
          
          const productId = productResponse.data._id;
          const response = await uploadProductImage(productId, file);
          
          if (response.success) {
            // Add the image URL
            setFormData({
              ...formData,
              image: response.data.image,
            });
            
            // Clear any image error
            if (errors.image) {
              const newErrors = { ...errors };
              delete newErrors.image;
              setErrors(newErrors);
            }
          } else {
            alert('Upload Failed', 'Failed to upload image. Please try again.');
          }
        } catch (error) {
          console.error('Image upload error:', error);
          alert('Upload Error', 'An error occurred while uploading the image.');
        } finally {
          setUploading(false);
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      alert('Error', 'Failed to open image picker');
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData({
      ...formData,
      image: '',
    });
  };

  const handleAddProduct = async () => {
    if (!validateForm()) {
      alert('Validation Error', 'Please fix the errors in the form.');
      return;
    }

    setLoading(true);
    try {
      // Create product data object matching backend requirements
      const productData: ProductFormData = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        category: formData.category,
        price: formData.price,
        units: formData.units,
        stock: formData.stock,
        discount: formData.discount,
        image: formData.image,
        isActive: formData.isActive
      };

      const response = await createProduct(productData);
      
      if (response.success) {
        alert(
          'Success',
          'Product added successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('VendorProducts'),
            },
          ]
        );
      } else {
        alert('Error', 'Failed to add product. Please try again.');
      }
    } catch (error) {
      console.error('Failed to add product:', error);
      alert('Error', 'Failed to add product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Add Product" showBackButton={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Creating your product...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Add New Product" showBackButton={true} />
      
      <KeyboardAwareScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Card3D style={styles.formCard}>
          <Text style={styles.formTitle}>Product Information</Text>
          
          {/* Product Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Product Name*</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => handleInputChange('name', text)}
              placeholder="Enter product name"
              placeholderTextColor={theme.colors.gray}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          {/* Product Description */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Description*</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => handleInputChange('description', text)}
              placeholder="Enter product description"
              placeholderTextColor={theme.colors.gray}
              multiline
              numberOfLines={4}
            />
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          </View>

          {/* Product Type */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Product Type*</Text>
            <TextInput
              style={styles.input}
              value={formData.type}
              onChangeText={(text) => handleInputChange('type', text)}
              placeholder="Enter product type (e.g., Physical, Digital)"
              placeholderTextColor={theme.colors.gray}
            />
            {errors.type && <Text style={styles.errorText}>{errors.type}</Text>}
          </View>

          {/* Product Category */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Category*</Text>
            <View style={styles.categoryContainer}>
              {CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton,
                    formData.category === category && styles.categoryButtonSelected
                  ]}
                  onPress={() => handleInputChange('category', category)}
                >
                  <Text 
                    style={[
                      styles.categoryButtonText,
                      formData.category === category && styles.categoryButtonTextSelected
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
          </View>

          {/* Price/Rate */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Price (₹)*</Text>
            <TextInput
              style={styles.input}
              value={formData.price?.toString() || ''}
              onChangeText={(text) => handleInputChange('price', parseFloat(text) || 0)}
              placeholder="Enter product price"
              placeholderTextColor={theme.colors.gray}
              keyboardType="decimal-pad"
            />
            {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
          </View>

          {/* Units */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Units*</Text>
            <TextInput
              style={styles.input}
              value={formData.units}
              onChangeText={(text) => handleInputChange('units', text)}
              placeholder="Enter units (e.g., kg, piece, dozen)"
              placeholderTextColor={theme.colors.gray}
            />
            {errors.units && <Text style={styles.errorText}>{errors.units}</Text>}
          </View>

          {/* Stock Quantity */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Stock Quantity*</Text>
            <TextInput
              style={styles.input}
              value={formData.stock?.toString() || ''}
              onChangeText={(text) => handleInputChange('stock', parseInt(text) || 0)}
              placeholder="Enter available stock"
              placeholderTextColor={theme.colors.gray}
              keyboardType="number-pad"
            />
            {errors.stock && <Text style={styles.errorText}>{errors.stock}</Text>}
          </View>

          {/* Discount */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Discount (%)</Text>
            <TextInput
              style={styles.input}
              value={formData.discount?.toString() || ''}
              onChangeText={(text) => handleInputChange('discount', parseFloat(text) || 0)}
              placeholder="Enter discount percentage"
              placeholderTextColor={theme.colors.gray}
              keyboardType="decimal-pad"
            />
            {errors.discount && <Text style={styles.errorText}>{errors.discount}</Text>}
          </View>

          {/* Images */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Product Image</Text>
            <View style={styles.imagesContainer}>
              {formData.image ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: formData.image }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={handleRemoveImage}
                  >
                    <Ionicons name="close-circle" size={24} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              ) : null}
              {!formData.image && (
                <TouchableOpacity
                  style={styles.addImageButton}
                  onPress={handleImagePick}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="add" size={24} color={theme.colors.primary} />
                      <Text style={styles.addImageText}>Add Image</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
            {errors.image && <Text style={styles.errorText}>{errors.image}</Text>}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleAddProduct}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <Text style={styles.submitButtonText}>Add Product</Text>
            )}
          </TouchableOpacity>
        </Card3D>
      </KeyboardAwareScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    padding: theme.spacing.md,
  },
  contentContainer: {
    paddingBottom: theme.spacing.xl,
  },
  formCard: {
    padding: theme.spacing.md,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  formGroup: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.sm,
    fontSize: 16,
    color: theme.colors.dark,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 14,
    marginTop: 4,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryButton: {
    padding: theme.spacing.xs,
    margin: theme.spacing.xs,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
  },
  categoryButtonSelected: {
    backgroundColor: theme.colors.primary,
  },
  categoryButtonText: {
    fontSize: 16,
    color: theme.colors.dark,
  },
  categoryButtonTextSelected: {
    color: theme.colors.white,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.xs,
  },
  imagePreviewContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    margin: theme.spacing.xs,
    borderRadius: theme.borderRadius.medium,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: theme.borderRadius.medium,
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    ...theme.shadow.small,
  },
  addImageButton: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.medium,
    margin: theme.spacing.xs,
  },
  addImageText: {
    marginTop: theme.spacing.xs,
    fontSize: 14,
    color: theme.colors.primary,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    ...theme.shadow.small,
  },
  submitButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.dark,
  },
});

export default VendorAddProductScreen; 