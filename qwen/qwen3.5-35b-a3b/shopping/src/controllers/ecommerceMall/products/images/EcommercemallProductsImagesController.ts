import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IEcommerceMallProductImage } from "../../../../api/structures/IEcommerceMallProductImage";
import { getEcommerceMallProductsProductIdImagesImageId } from "../../../../providers/getEcommerceMallProductsProductIdImagesImageId";
import { patchEcommerceMallProductsProductIdImages } from "../../../../providers/patchEcommerceMallProductsProductIdImages";

@Controller("/ecommerceMall/products/:productId/images")
export class EcommercemallProductsImagesController {
  /**
   * Batch update product image display order for a product's image gallery.
   *
   * This operation allows sellers to reorder product images by adjusting their display_order values. The display_order determines the sequence in which images appear in the product image gallery, with lower values appearing first. The first image (lowest display_order) serves as the main product thumbnail in search results and catalog listings.
   *
   * **Authorization**:
   * - Only the seller who owns the product can manage its images
   * - Product ownership is verified by matching the authenticated seller's ID with the product's seller_id
   * - Attempts to modify images for products owned by other sellers will be rejected with a 403 Forbidden error
   *
   * **Business Rules**:
   * - Products must have at least one image to be published (section 143)
   * - Maximum 20 images per product (section 989)
   * - All image IDs in the request must belong to the specified product
   * - Display order values must be unique within a product's image set
   * - If a product has only one image and it is the last remaining image, deletion is not permitted
   *
   * **Snapshot Preservation**:
   * - A product snapshot is created immediately before applying any image changes (section 325, 638)
   * - Snapshots include the complete image list with all display_order values at time of change
   * - Snapshots are immutable and preserved even after product deletion (section 325)
   * - Super administrators and product owners can view image history snapshots
   *
   * **Immediate Visibility**:
   * - Changes are reflected instantly in all customer-facing product views
   * - The image gallery updates in real-time without page reload
   * - Deleted images are removed from customer views immediately upon operation completion
   *
   * **Related Operations**:
   * - `POST /products/{productId}/images` - Upload new images to a product
   * - `DELETE /products/{productId}/images/{imageId}` - Delete a single image
   * - `GET /products/{productId}/images` - Retrieve current image list
   *
   * **Error Handling**:
   * - 404 Not Found: Product not found or image IDs do not belong to product
   * - 403 Forbidden: Authenticated seller does not own this product
   * - 400 Bad Request: Invalid display_order values, duplicate display_orders, or product has fewer images than requested operations
   * - 422 Unprocessable Entity: Product would have zero images after operation (last image removal not allowed)
   *
   * **Database Schema Reference**:
   * - Table: ecommerce_mall_product_images
   * - Columns: id (uuid), product_id (uuid), image_url (varchar), display_order (int), created_at (timestamptz), updated_at (timestamptz), deleted_at (timestamptz nullable)
   * - Index: [product_id, display_order] ensures efficient retrieval of ordered image list per product
   *
   * @param connection
   * @param productId The unique identifier of the product whose images are being reordered
   * @param body Batch image reordering operations. Each operation specifies an image ID and its new display_order value. All image IDs must belong to the specified product. Display order values must be unique within the product's image set.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification 1. Verify authenticated user is a seller actor with valid session
   * 2. Query ecommerce_mall_products for productId, verify seller_id matches authenticated user's ID
   * 3. Verify product exists and is not soft-deleted (deleted_at is NULL)
   * 4. For each image operation in request body:
   *    - Verify image_id belongs to this product (product_id match)
   *    - Verify display_order value is valid (non-negative integer)
   * 5. Check that operation won't result in fewer than one image if product currently has images (section 143)
   * 6. If image_count would be zero after deletions, reject with 422 error (last image must be preserved)
   * 7. Begin database transaction:
   *    a. Create product snapshot in ecommerce_mall_product_snapshots or ecommerce_mall_snapshot_audits:
   *       - Record recordType = 'Product'
   *       - Record recordId = productId
   *       - Capture oldValues = current image list with display_order values
   *       - Capture newValues = will be updated after operation completes
   *       - Record changedBy = authenticated seller's ID
   *       - Record changedAt = current timestamp
   *    b. Update ecommerce_mall_product_images:
   *       - For each reorder operation: UPDATE display_order WHERE id = image_id AND product_id = productId
   *       - Set updated_at = current timestamp for affected images
   *    c. Commit transaction
   * 8. Query updated image list from ecommerce_mall_product_images:
   *    - SELECT id, image_url, display_order, created_at, updated_at
   *    - WHERE product_id = productId AND deleted_at IS NULL
   *    - ORDER BY display_order ASC
   * 9. Return the complete updated image list with all images sorted by display_order
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async reorder(
    @TypedParam("productId")
    productId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IEcommerceMallProductImage.IUpdate,
  ): Promise<IEcommerceMallProductImage.ISummary> {
    try {
      return await patchEcommerceMallProductsProductIdImages({
        productId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve detailed information about a specific product image by its unique identifier.
   *
   * This operation returns complete image metadata including the image URL, display order sequence, and creation timestamp. The image serves as part of a product's visual catalog that customers browse during shopping. Images are displayed in display order, with the first image typically serving as the main product thumbnail in search results and category listings.
   *
   * Images can be viewed by both customer and seller actors. Customers access images when browsing product details, while sellers manage their product images through product editing interfaces. Each image maintains a reference to its parent product, enabling proper ownership validation and cascading deletion when products are removed from the catalog.
   *
   * The operation validates that the image exists and belongs to the specified product before returning data. If the image has been soft-deleted (marked for removal but preserved for audit purposes), the operation returns a not-found error rather than exposing deleted content.
   *
   * @param connection
   * @param productId The unique identifier of the product that owns this image. The image must belong to this product.
   * @param imageId The unique identifier of the product image to retrieve.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Query ecommerce_mall_product_images table for the image record matching both product_id and image_id path parameters. Perform join validation to ensure the image belongs to the specified product.
   *
   * Apply soft delete filter - only return records where deleted_at is NULL. Return 404 if the image record does not exist or has been soft-deleted.
   *
   * Build response entity including all fields: id, product_id, image_url (80000 char max), display_order (int), created_at (timestamp), updated_at (timestamp), and product reference for complete entity representation.
   *
   * Validate UUID format for both path parameters. Return 400 for invalid UUID formats.
   *
   * Include product_id in response for customer applications to maintain image-product context without requiring additional queries.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":imageId")
  public async at(
    @TypedParam("productId")
    productId: string & tags.Format<"uuid">,
    @TypedParam("imageId")
    imageId: string & tags.Format<"uuid">,
  ): Promise<IEcommerceMallProductImage> {
    try {
      return await getEcommerceMallProductsProductIdImagesImageId({
        productId,
        imageId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
