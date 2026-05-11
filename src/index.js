/**
 * File: functions/index.js
 * Firebase Cloud Function for Product Image Processing
 * * Dependencies:
 * npm install sharp axios firebase-admin firebase-functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const sharp = require('sharp'); // For image manipulation (resizing/conversion)

// Initialize Firebase Admin SDK
admin.initializeApp();

const db = admin.firestore();
const storage = admin.storage();

// Define image sizes for optimization (WebP format is used for efficiency)
const IMAGE_SIZES = [
    { size: 1200, suffix: 'large' },
    { size: 600, suffix: 'medium' },
    { size: 300, suffix: 'thumb' }
];

/**
 * Downloads an image from a URL, processes it, and uploads it to Firebase Storage.
 */
async function processAndUploadImage(imageUrl, imageMeta) {
    if (!imageUrl || imageMeta.type !== 'external' || imageMeta.status !== 'pending') {
        return imageMeta; 
    }

    try {
        // 1. Download the image buffer
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 15000 
        });
        
        const originalBuffer = response.data;
        const bucket = storage.bucket();
        
        const newUrls = {};

        // 2. Process and Upload to Storage for each size concurrently
        const uploadPromises = IMAGE_SIZES.map(async ({ size, suffix }) => {
            // Path structure: products/{variantId_...}/{size}.webp
            const filePath = `${imageMeta.path}/${suffix}.webp`; 
            const file = bucket.file(filePath);

            // Resize and convert to WebP using sharp
            const resizedBuffer = await sharp(originalBuffer)
                .resize(size, size, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer();

            await file.save(resizedBuffer, {
                metadata: {
                    contentType: 'image/webp',
                    cacheControl: 'public, max-age=31536000', 
                },
            });

            // Get the public download URL (signed URL)
            const [url] = await file.getSignedUrl({
                action: 'read',
                expires: '03-01-2500', 
            });

            newUrls[suffix] = url;
        });

        await Promise.all(uploadPromises);

        // 3. Return updated metadata
        return {
            ...imageMeta,
            type: 'storage', 
            url: newUrls.medium, 
            urls: newUrls, 
            status: 'completed',
            processedAt: admin.firestore.FieldValue.serverTimestamp()
        };

    } catch (error) {
        console.error(`Error processing image ${imageUrl}:`, error.message);
        
        // Mark image as failed
        return {
            ...imageMeta,
            status: 'failed',
            error: error.message,
            processedAt: admin.firestore.FieldValue.serverTimestamp()
        };
    }
}


/**
 * Cloud Function Trigger: Fires when a new document is created in 'products' with imageProcessingStatus: 'pending'.
 */
exports.processProductImages = functions.firestore
    .document('products/{productId}')
    .onCreate(async (snap, context) => {
        const productId = context.params.productId;
        const productData = snap.data();

        // 1. Check the flag set by the client to see if processing is needed
        if (productData.imageProcessingStatus !== 'pending' || !productData.imageUrls || productData.imageUrls.length === 0) {
            return null;
        }

        console.log(`Starting image processing for product: ${productId}`);
        
        // 2. Process all image URLs concurrently
        const imageProcessingPromises = productData.imageUrls.map(imageMeta => 
            processAndUploadImage(imageMeta.url, imageMeta)
        );

        const updatedImageUrls = await Promise.all(imageProcessingPromises);
        
        let newMainImageUrl = productData.mainImageUrl;
        let finalStatus = 'completed';

        // 3. Determine the final main image URL and product status
        const mainImageUpdate = updatedImageUrls.find(img => img.isMain && img.status === 'completed');
        
        if (mainImageUpdate && mainImageUpdate.urls) {
            // Set the main image to the medium-sized, processed URL
            newMainImageUrl = mainImageUpdate.urls.medium; 
        } else if (mainImageUpdate && mainImageUpdate.status === 'failed') {
            newMainImageUrl = null;
        }

        // Check if any image failed
        if (updatedImageUrls.some(img => img.status === 'failed')) {
            finalStatus = 'completed_with_errors';
        }

        // 4. Update the Firestore document with the new URLs and status
        await db.collection('products').doc(productId).update({
            imageUrls: updatedImageUrls,
            mainImageUrl: newMainImageUrl,
            imageProcessingStatus: finalStatus,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Finished processing product: ${productId} with status: ${finalStatus}`);
        return null;
    });