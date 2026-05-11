const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const { getStorage } = require("firebase-admin/storage");

admin.initializeApp();
const bucket = getStorage().bucket();

function normalizeDriveUrl(url) {
  if (!url) return null;

  if (url.includes("drive.google.com")) {
    const match = url.match(/\/d\/([^/]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/uc?export=download&id=${match[1]}`;
    }
  }

  return url;
}

function isYouTubeUrl(url) {
  if (typeof url !== "string") return false;
  return url.includes("youtube.com") || url.includes("youtu.be");
}

async function uploadImageFromUrl(imageUrl, destinationPath) {
  if (!imageUrl) return null;

  const response = await fetch(normalizeDriveUrl(imageUrl));
  if (!response.ok) throw new Error(`Image download failed`);

  const buffer = await response.buffer();
  const file = bucket.file(destinationPath);

  await file.save(buffer, {
    resumable: false,
    metadata: {
      contentType: response.headers.get("content-type") || "image/jpeg",
    },
  });

  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
    destinationPath
  )}?alt=media`;
}

async function uploadVideoFromUrl(videoUrl, destinationPath) {
  if (!videoUrl) return null;

  const response = await fetch(normalizeDriveUrl(videoUrl));
  if (!response.ok) throw new Error(`Video download failed`);

  const buffer = await response.buffer();
  if (buffer.length > 50 * 1024 * 1024) {
    throw new Error("Video exceeds 50MB");
  }

  const file = bucket.file(destinationPath);
  await file.save(buffer, {
    resumable: false,
    metadata: {
      contentType: response.headers.get("content-type") || "video/mp4",
    },
  });

  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
    destinationPath
  )}?alt=media`;
}

exports.processProductImages = onDocumentCreated(
  "products/{productId}",
  async (event) => {
    const snap = event.data;
    const product = snap.data();
    const sku = product.sku || snap.id;

    if (product.imageStatus === "completed") return;

    try {
      let mainImageUrl = null;
      let galleryUrls = [];
      let finalVideoUrl = null;
      let videoType = null;

      if (product?.sourceImages?.main) {
        mainImageUrl = await uploadImageFromUrl(
          product.sourceImages.main,
          `product-images/${sku}/main.jpg`
        );
      }

      if (Array.isArray(product?.sourceImages?.gallery)) {
        for (let i = 0; i < product.sourceImages.gallery.length; i++) {
          const img = product.sourceImages.gallery[i];
          if (!img) continue;

          const url = await uploadImageFromUrl(
            img,
            `product-images/${sku}/gallery_${i}.jpg`
          );
          if (url) galleryUrls.push(url);
        }
      }

      if (product.videoUrl) {
        if (isYouTubeUrl(product.videoUrl)) {
          finalVideoUrl = product.videoUrl;
          videoType = "youtube";
        } else {
          finalVideoUrl = await uploadVideoFromUrl(
            product.videoUrl,
            `product-videos/${sku}/video.mp4`
          );
          videoType = "upload";
        }
      }

      await snap.ref.update({
        mainImageUrl,
        imageUrls: galleryUrls,
        videoUrl: finalVideoUrl ?? product.videoUrl ?? null,
        videoType: videoType ?? product.videoType ?? null,
        imageStatus: "completed",
      });

    } catch (error) {
      console.error("Media processing failed:", error);
      await snap.ref.update({
        imageStatus: "failed",
        failureReason: error.message,
      });
    }
  }
);
