import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia from "typia";

import { IShoppingMallProductImage } from "../../../../../api/structures/IShoppingMallProductImage";
import { SellerAuth } from "../../../../../decorators/SellerAuth";
import { SellerPayload } from "../../../../../decorators/payload/SellerPayload";
import { deleteShoppingMallSellerProductsProductIdImagesImageId } from "../../../../../providers/deleteShoppingMallSellerProductsProductIdImagesImageId";
import { patchShoppingMallSellerProductsProductIdImagesReorder } from "../../../../../providers/patchShoppingMallSellerProductsProductIdImagesReorder";
import { postShoppingMallSellerProductsProductIdImages } from "../../../../../providers/postShoppingMallSellerProductsProductIdImages";
import { putShoppingMallSellerProductsProductIdImagesImageId } from "../../../../../providers/putShoppingMallSellerProductsProductIdImagesImageId";

@Controller("/shoppingMall/seller/products/:productId/images")
export class ShoppingmallSellerProductsImagesController {
  /**
   * Uploads a new image to a product's image gallery.
   *
   * This endpoint enables sellers to add visual representations to their products, helping customers understand product appearance and features before making purchase decisions. Each product can have multiple images, and sellers have full control over managing their product's image gallery throughout the product lifecycle.
   *
   * The display_order field determines the image's position within the product's gallery. Lower values appear first, and the image with the lowest display_order serves as the main thumbnail displayed in search results and category listings. If display_order is not specified, the system automatically assigns the next available order value.
   *
   * **Authorization Requirements**:
   * - Only the seller who owns the product can upload images
   * - Seller account must be approved (approval_status='approved')
   * - Seller account must not be suspended or banned
   *
   * **Related Database Entities**:
   * - shopping_mall_product_images: Stores image URL, display order, and creation timestamp
   * - shopping_mall_products: Parent product entity, referenced via shopping_mall_product_id
   * - shopping_mall_sellers: Owner validation through product's seller relationship
   *
   * **Business Rules**:
   * - Image URL must use HTTPS protocol
   * - Display order must be unique within the same product (enforced by database constraint)
   * - When a product has multiple images with the same display order, created_at serves as secondary sort criterion
   * - No maximum limit on images per product
   *
   * @param connection
   * @param productId The unique identifier of the product to add the image to. The authenticated seller must own this product.
   * @param body Image upload details including the image URL and optional display order position
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor seller
     * @x-autobe-specification Implementation steps for POST
     *   /products/{productId}/images:
   *
   * 1. **Authentication & Authorization**:
   *    - Extract seller from JWT session token
   *    - Verify seller exists and is not deleted (deleted_at IS NULL)
   *    - Verify seller.approval_status === 'approved'
   *    - Verify seller.suspended === false and seller.banned === false
   *
   * 2. **Product Ownership Validation**:
   *    - Query shopping_mall_products where id === productId
   *    - Verify product exists and is not deleted (deleted_at IS NULL)
   *    - Verify product.shopping_mall_seller_id === authenticated seller's id
   *    - Return 403 Forbidden if seller does not own the product
   *
   * 3. **Request Body Validation**:
   *    - Validate imageUrl is a valid HTTPS URL string
   *    - Validate displayOrder is a positive integer (if provided)
   *    - If displayOrder not provided, calculate next available order: MAX(display_order) + 1 for the product, or 0 if no existing images
   *
   * 4. **Display Order Uniqueness Check**:
   *    - Check for existing image with same product_id and display_order
   *    - If conflict exists, return 409 Conflict error with suggestion to use different display_order
   *
   * 5. **Create Image Record**:
   *    - Generate new UUID for id
   *    - Set created_at to current timestamp
   *    - Insert record into shopping_mall_product_images
   *    - Include all fields: id, shopping_mall_product_id, image_url, display_order, created_at
   *
   * 6. **Response**:
   *    - Return 201 Created with IShoppingMallProductImage object
   *    - Include Location header pointing to the created resource
   *
   * 7. **Error Handling**:
   *    - 401 Unauthorized: Invalid or missing session token
   *    - 403 Forbidden: Seller does not own product, or account suspended/banned/not approved
   *    - 404 Not Found: Product does not exist or is deleted
   *    - 409 Conflict: Display order already exists for this product
   *    - 422 Unprocessable Entity: Invalid image URL format or display order value
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("productId")
    productId: string,
    @TypedBody()
    body: IShoppingMallProductImage.ICreate,
  ): Promise<IShoppingMallProductImage> {
    try {
      return await postShoppingMallSellerProductsProductIdImages({
        seller,
        productId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update a specific product image's properties including its URL and display order.
   *
   * This operation allows sellers to modify individual image attributes for products they own. The display_order field controls the image's position in the product gallery, with lower values appearing first. The image with the lowest display_order serves as the main thumbnail shown in product listings and search results.
   *
   * Security and Validation:
   * - Only the seller who owns the product can modify its images
   * - Seller account must be active (not suspended or banned)
   * - The image must exist and belong to the specified product
   * - display_order must be unique within the same product
   * - If updating display_order causes the main thumbnail to change, listings will reflect the new thumbnail automatically
   *
   * Relationship to Database:
   * - Updates shopping_mall_product_images table
   * - References shopping_mall_products for ownership validation
   * - References shopping_mall_sellers for account standing validation
   * - display_order has a unique constraint per product (shopping_mall_product_id, display_order)
   *
   * Use Cases:
   * - Replace an image URL with an updated version
   * - Change image display order to reorganize gallery
   * - Promote a different image to main thumbnail by giving it the lowest display_order
   *
   * @param connection
   * @param productId The unique identifier of the product containing the image (UUID format)
   * @param imageId The unique identifier of the image to update (UUID format)
   * @param body Image properties to update including URL and display order
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor seller
     * @x-autobe-specification Update a product image record in
     *   shopping_mall_product_images table.
   *
   * Implementation Steps:
   * 1. Extract productId and imageId from path parameters
   * 2. Authenticate the seller from session/JWT token
   * 3. Query shopping_mall_products to verify seller ownership of the product
   * 4. Query shopping_mall_product_images to verify image exists and belongs to the product
   * 5. If display_order is being updated, check for uniqueness constraint within the product
   * 6. If display_order conflict exists, return 409 Conflict error
   * 7. Update the image record with new values
   * 8. Return the updated image object
   *
   * Validation Rules:
   * - Product must exist and not be soft-deleted (deleted_at IS NULL)
   * - Image must exist and belong to the specified product
   * - Authenticated seller must match product's shopping_mall_seller_id
   * - display_order must be unique within the product's images
   * - image_url must be a valid URL format
   *
   * Error Handling:
   * - 401 Unauthorized: Not authenticated as seller
   * - 403 Forbidden: Seller does not own this product
   * - 404 Not Found: Product or image does not exist
   * - 409 Conflict: display_order already used by another image in this product
   * - 400 Bad Request: Invalid input data
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":imageId")
  public async update(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("productId")
    productId: string,
    @TypedParam("imageId")
    imageId: string,
    @TypedBody()
    body: IShoppingMallProductImage.IUpdate,
  ): Promise<IShoppingMallProductImage> {
    try {
      return await putShoppingMallSellerProductsProductIdImagesImageId({
        seller,
        productId,
        imageId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently removes a product image from the seller's product gallery.
   *
   * This operation allows sellers to delete individual images from their products. When an image is deleted, the system automatically adjusts the display_order values of remaining images to maintain sequential ordering. If the deleted image was the main thumbnail (display_order = 1), the next image in sequence becomes the new main thumbnail automatically.
   *
   * **Business Rules:**
   * - Only the seller who owns the product can delete images
   * - Sellers with suspended accounts cannot delete images
   * - All images can be deleted from a product (product will display with no thumbnail)
   * - Deletion adjusts display_order of remaining images to maintain continuity
   *
   * **Data Integrity:**
   * - Product snapshots containing the deleted image are preserved for historical accuracy and dispute resolution
   * - The image file is removed from storage
   * - The image record is permanently removed from the database
   *
   * Related operations: POST /products/{productId}/images to upload new images, PATCH /products/{productId}/images/reorder to change image display order.
   *
   * @param connection
   * @param productId Unique identifier of the product containing the image to delete (UUID format). The authenticated seller must own this product to perform the deletion.
   * @param imageId Unique identifier of the product image to delete (UUID format). The image must belong to the specified product.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor seller
     * @x-autobe-specification Implementation steps:
   *
   * 1. **Authentication & Authorization:**
   *    - Extract seller ID from JWT session token
   *    - Verify seller account is not suspended
   *
   * 2. **Ownership Validation:**
   *    - Query shopping_mall_products table to verify the product (productId) belongs to the authenticated seller
   *    - If product not found or not owned by seller, return 403 Forbidden
   *
   * 3. **Image Existence Check:**
   *    - Query shopping_mall_product_images to find the image record
   *    - Verify image belongs to the specified product
   *    - If image not found, return 404 Not Found
   *
   * 4. **Last Image Protection:**
   *    - Count remaining images for the product (excluding the one to delete)
   *    - If count would be 0 after deletion, return 400 Bad Request with error message
   *
   * 5. **Delete Image:**
   *    - Delete the image file from storage
   *    - Delete the record from shopping_mall_product_images table
   *
   * 6. **Reorder Remaining Images:**
   *    - Query remaining images ordered by display_order
   *    - Update display_order values sequentially (1, 2, 3...) to close gaps
   *    - This ensures the image with lowest display_order becomes the new thumbnail if the old thumbnail was deleted
   *
   * 7. **Response:**
   *    - Return 204 No Content on success
   *
   * **Error Handling:**
   * - 401 Unauthorized: Invalid or expired session token
   * - 403 Forbidden: Seller does not own product or account is suspended
   * - 404 Not Found: Product or image not found
   * - 400 Bad Request: Attempting to delete the last remaining image
   *
   * **Database Queries:**
   * - SELECT FROM shopping_mall_products WHERE id = productId
   * - SELECT FROM shopping_mall_product_images WHERE id = imageId
   * - SELECT COUNT(*) FROM shopping_mall_product_images WHERE shopping_mall_product_id = productId
   * - DELETE FROM shopping_mall_product_images WHERE id = imageId
   * - UPDATE shopping_mall_product_images SET display_order = new_order WHERE id = imageId (for each remaining image)
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":imageId")
  public async erase(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("productId")
    productId: string,
    @TypedParam("imageId")
    imageId: string,
  ): Promise<void> {
    try {
      return await deleteShoppingMallSellerProductsProductIdImagesImageId({
        seller,
        productId,
        imageId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Reorder product images by updating their display order values.
   *
   * This operation allows sellers to change the display sequence of images for their products. The image with the lowest display_order value (position 1) becomes the main thumbnail displayed in search results, category listings, and wishlist views.
   *
   * When images are reordered, the system automatically resolves any display_order conflicts by reassigning sequential values. The operation triggers a product snapshot creation to preserve the new image configuration for historical reference and dispute resolution.
   *
   * The seller can move any image to any position, and all affected images will have their display_order values adjusted to maintain continuous sequential numbering without gaps. The main thumbnail designation updates automatically based on the new first position.
   *
   * Security and Authorization:
   * - Only the seller who owns the product can reorder its images
   * - Seller accounts must not be suspended to perform this operation
   * - Attempting to reorder images for another seller's product results in access denied
   *
   * Related Operations:
   * - POST /products/{productId}/images - Upload new images
   * - DELETE /products/{productId}/images/{imageId} - Delete an image
   *
   * @param connection
   * @param productId UUID of the product whose images are being reordered
   * @param body Image ordering data containing image IDs and their new display positions
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor seller
     * @x-autobe-specification Implementation steps for image reordering:
   *
   * 1. Validate authentication - extract seller ID from JWT token
   * 2. Query shopping_mall_products table to verify ownership:
   *    - SELECT id, shopping_mall_seller_id FROM shopping_mall_products WHERE id = :productId AND deleted_at IS NULL
   *    - Return 404 if product not found
   *    - Return 403 if seller_id doesn't match authenticated seller
   *
   * 3. Verify seller account status:
   *    - Query shopping_mall_sellers to check suspended = false
   *    - Return 403 with 'Account suspended' message if suspended
   *
   * 4. Validate request body:
   *    - All image_ids must belong to the specified product
   *    - No duplicate image_ids in the request
   *    - Positions must be sequential starting from 1
   *    - Return 400 for validation failures
   *
   * 5. Update display_order values in shopping_mall_product_images:
   *    - Use transaction to update all images atomically
   *    - SET display_order = new_position WHERE id = image_id
   *
   * 6. Handle conflict resolution:
   *    - If any display_order conflicts occur during update, reassign sequential values
   *    - Use created_at timestamp as secondary sort criterion for ties
   *
   * 7. Create product snapshot:
   *    - Insert record into shopping_mall_product_snapshots
   *    - Include current product data and image configuration
   *    - Set created_at to current timestamp
   *
   * 8. Query and return reordered images:
   *    - SELECT id, image_url, display_order, created_at FROM shopping_mall_product_images WHERE shopping_mall_product_id = :productId ORDER BY display_order ASC
   *
   * Error handling:
   * - 401 Unauthorized: Invalid or missing JWT token
   * - 403 Forbidden: Not product owner or seller suspended
   * - 404 Not Found: Product does not exist
   * - 400 Bad Request: Invalid image IDs or position values
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch("reorder")
  public async reorder(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("productId")
    productId: string,
    @TypedBody()
    body: IShoppingMallProductImage.IReorder,
  ): Promise<IShoppingMallProductImage.ISummary> {
    try {
      return await patchShoppingMallSellerProductsProductIdImagesReorder({
        seller,
        productId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
