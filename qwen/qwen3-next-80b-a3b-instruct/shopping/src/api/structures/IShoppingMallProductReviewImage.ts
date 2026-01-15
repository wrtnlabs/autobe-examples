import { tags } from "typia";

export namespace IShoppingMallProductReviewImage {
  /**
   * Update schema for a product review image in the shoppingMall platform.
   *
   * This schema defines the structure for updating existing review images,
   * allowing customers to change image metadata without re-uploading the
   * image file. The update operation supports modification of display order,
   * primary image designation, and other metadata properties. Importantly,
   * the image content itself must not be modified through this endpoint -
   * images are always uploaded through a separate dedicated endpoint and
   * referenced here by their unique identifiers.
   *
   * Only the following properties can be updated:
   *
   * - Order: To change the display sequence of images
   * - Is_primary: To designate a different image as the primary image
   *
   * The schema prohibits modification of:
   *
   * - Id: System-generated UUID is immutable
   * - Url: The image location cannot be changed once uploaded
   * - Filename: Original file name is preserved as historical record
   * - Extension: File type cannot be changed
   *
   * All updates to review images are permanently recorded in the platform's
   * audit log for accountability. Changes to display order and primary image
   * designation affect how reviews are displayed in product pages, search
   * results, and summary views.
   *
   * NOTE: The id field is included in the schema as it's present in the full
   * representation but should not be modified during updates. It is required
   * for identifying which image to update.
   */
  export type IUpdate = {
    /**
     * Unique identifier of the review image in the system. This UUID is
     * system-generated upon image upload and remains immutable.
     */
    id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Publicly accessible URL of the uploaded image file. This is the only
     * method for referencing review images in the system; binary data or
     * base64 encoding are strictly prohibited. The URL must point to a
     * valid, accessible image location in the content delivery network.
     */
    url: string & tags.Format<"uri">;

    /**
     * Original file name of the uploaded image. Must contain at least one
     * non-whitespace character and not exceed 255 characters. This field
     * preserves the original file name for reference purposes but is not
     * used for file retrieval.
     */
    filename: string & tags.MinLength<1> & tags.MaxLength<255>;

    /**
     * File extension of the image in lowercase format (e.g., 'jpg', 'png',
     * 'gif', 'webp'). Must be exactly 1-10 characters with no leading dot.
     * This field ensures consistent file type identification regardless of
     * client's file naming conventions.
     */
    extension: string & tags.MinLength<1> & tags.MaxLength<10>;

    /**
     * Display order of the image within the review. Must be an integer
     * between 1 and 10 inclusive. Images are displayed in ascending order
     * of this value, with 1 being the first (primary) image and 10 being
     * the last. When updating, this order can be modified to reposition
     * images in the display sequence.
     */
    order?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>)
      | undefined;

    /**
     * Indicator of whether this image is the primary (first) image for the
     * review. Set to true for exactly one image per review, which will be
     * displayed prominently in review previews and summaries. When
     * updating, the is_primary flag can be moved from one image to another,
     * effectively changing the primary image of the review. If no image is
     * marked as primary, the system will auto-select the image with the
     * lowest order value as primary.
     */
    is_primary?: boolean | undefined;
  };

  /**
   * Summary representation of a product review image for display in review
   * context. This schema defines the minimal data exposed for images
   * associated with product reviews, designed for list views and embedded
   * contexts where full image details are unnecessary.
   *
   * Review images enhance customer feedback by providing visual evidence of
   * product quality, usage, or issues. The summary representation balances
   * information needs with performance considerations - sufficient for
   * display in review lists but minimized to reduce payload size.
   *
   * Each image is associated with a specific product review and is stored in
   * an external file system or CDN. The summary contains only essential
   * metadata for display: a unique identifier, a publicly accessible URL, the
   * original filename, and an optional display order.
   *
   * The system enforces that each image is owned by its associated review and
   * handles image lifecycle separately (upload, deletion, replacement) via
   * dedicated endpoints. This summary type is only used in response contexts
   * (GET /reviews/{reviewId}), never in request bodies.
   *
   * Related operations: Creating images (POST /reviews/{reviewId}/images),
   * updating image metadata (PUT /reviews/{reviewId}/images/{imageId}), and
   * retrieving image details (GET /reviews/{reviewId}/images/{imageId}).
   */
  export type ISummary = {
    /**
     * Unique identifier for the review image record in the database. This
     * UUID is system-generated upon upload and remains immutable.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Publicly accessible URL where the image file is hosted. This must be
     * a fully qualified URI with a valid protocol (HTTPS) pointing to the
     * image file in the content delivery network or file storage service.
     * No local paths, data URIs, or relative links are permitted. This URL
     * is generated by the upload system and is immutable after upload -
     * images cannot be moved or renamed without reuploading.
     */
    url: string & tags.Format<"uri">;

    /**
     * Original filename of the uploaded image file. This is the name given
     * by the customer's device (e.g., 'IMG_20230115.jpg'). The system
     * preserves this value for display and archival purposes but does not
     * use it for storage or routing.
     *
     * The filename is limited to 255 characters to ensure compatibility
     * with filesystems and web standards. The system validates that the
     * filename contains only alphanumeric characters, underscores, hyphens,
     * spaces, and common file extensions (jpg, jpeg, png, gif, webp, bmp,
     * tiff).
     *
     * This field is used for display to customers in their review
     * management interface and for accessibility purposes (when images are
     * not loaded, the filename appears as alternative text in some
     * contexts).
     */
    filename: string & tags.MinLength<1> & tags.MaxLength<255>;

    /**
     * Display order of the image within the review. Images are presented to
     * users in ascending order of this integer value. Must be greater than
     * or equal to 0. The first image (order: 0) is typically displayed as
     * the primary image for the review.
     *
     * The system automatically assigns order=0 to the first image uploaded
     * for a review. Customers can reorder images using drag-and-drop or
     * dedicated reorder endpoints, which updates this integer value
     * accordingly. The system ensures that each image in a review has a
     * unique order value (no duplicates). This field enables customers to
     * control the visual flow of their review, placing the most important
     * images first.
     */
    order: number & tags.Type<"int32"> & tags.Minimum<0>;
  };
}
