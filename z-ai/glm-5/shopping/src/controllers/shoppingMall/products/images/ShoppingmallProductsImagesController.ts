import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IShoppingMallProductImage } from "../../../../api/structures/IShoppingMallProductImage";
import { getShoppingMallProductsProductIdImagesImageId } from "../../../../providers/getShoppingMallProductsProductIdImagesImageId";
import { patchShoppingMallProductsProductIdImages } from "../../../../providers/patchShoppingMallProductsProductIdImages";

@Controller("/shoppingMall/products/:productId/images")
export class ShoppingmallProductsImagesController {
  /**
   * Updates the display order of multiple product images in a single batch operation.
   *
   * This endpoint allows sellers to reorder their product images, which determines the sequence in which images appear in the product gallery and identifies the main thumbnail image. The image with the lowest display_order value becomes the main thumbnail shown in search results and category listings.
   *
   * The shopping_mall_product_images table stores each image with a display_order value that determines its position in the product gallery. Each product can have multiple images, and sellers can reorder them at any time. The first image (lowest display_order) serves as the main thumbnail displayed in product listings and search results. Images are stored with URLs pointing to the image files, and each image belongs to exactly one product.
   *
   * **Authorization**: Only the seller who owns the product can reorder its images. Suspended sellers cannot perform this operation. The seller ID is verified against the product's owner in shopping_mall_products table. If a seller attempts to modify images belonging to another seller's product, the system rejects the operation with an access denied error.
   *
   * **Validation Rules**:
   * - All image IDs must exist and belong to the specified product
   * - Display order values must be non-negative integers
   * - If the operation results in duplicate display_order values, the system automatically resolves conflicts by reassigning sequential orders based on original upload order (created_at)
   * - The system maintains consistent display_order values without gaps in the sequence
   *
   * **Product Snapshot Creation**:
   * When images are reordered, the system creates a product snapshot to preserve the new image sequence for historical accuracy. This snapshot captures the complete product state including name, description, base price, all images in their new order, and all variant configurations. This ensures that the image sequence at any point in time can be reconstructed for audit trails, dispute resolution, and customer purchase verification purposes.
   *
   * **Business Rules**:
   * - The main thumbnail is automatically determined by the lowest display_order value after reordering
   * - If the main thumbnail image (first image) is reordered to a different position, the new first image becomes the main thumbnail
   * - Gaps in display_order sequence are automatically compacted during the update
   * - Product snapshots preserve the image sequence state for historical reference and dispute resolution
   *
   * **Related Operations**:
   * - POST /products/{productId}/images - Upload a new product image
   * - DELETE /products/{productId}/images/{imageId} - Delete a product image
   * - GET /products/{productId} - View product details including all images
   *
   * @param connection
   * @param productId Unique identifier of the product whose images are being reordered. Must be a valid UUID. The authenticated seller must own this product to perform the operation. The product must exist and not be deleted.
   * @param body Array of image display order updates. Each item contains the image ID and its new display order position. All images must belong to the specified product. The request must contain at least one image update.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Implementation:
   *
   * 1. Authentication & Authorization:
   *    - Extract seller ID from JWT token
   *    - Query shopping_mall_products to verify product exists (id = productId AND deleted_at IS NULL)
   *    - Verify product.shopping_mall_seller_id matches authenticated seller ID
   *    - If not owner, return 403 Forbidden with message "You can only reorder images for your own products"
   *    - If product not found, return 404 Not Found
   *    - Check if seller is suspended (seller.suspended = true) - if suspended, return 403 Forbidden
   *
   * 2. Input Validation:
   *    - Validate request body array is not empty (at least one image update required)
   *    - Validate each item has: id (UUID format), display_order (non-negative integer)
   *    - Query all image IDs from request in shopping_mall_product_images WHERE shopping_mall_product_id = productId
   *    - If any image ID not found or doesn't belong to product, return 400 Bad Request with list of invalid image IDs
   *    - Validate no duplicate image IDs in request
   *
   * 3. Display Order Update Logic:
   *    - Begin database transaction
   *    - For each image in request body:
   *      - UPDATE shopping_mall_product_images SET display_order = :display_order WHERE id = :id
   *    - Handle display order conflicts after update:
   *      - Query all images for product ordered by display_order ASC, created_at ASC
   *      - If any duplicate display_order values exist:
   *        - Reassign sequential display_order values (0, 1, 2, ...) based on the query order
   *      - This ensures the unique constraint on (shopping_mall_product_id, display_order) is maintained
   *    - Commit transaction
   *
   * 4. Response Construction:
   *    - Query all images for the product: SELECT * FROM shopping_mall_product_images WHERE shopping_mall_product_id = :productId ORDER BY display_order ASC, created_at ASC
   *    - Build response array with: id, image_url, display_order, created_at
   *    - Return 200 OK with image array
   *
   * 5. Error Handling:
   *    - 401 Unauthorized: Invalid or missing JWT token
   *    - 403 Forbidden: Not the product owner or seller is suspended
   *    - 404 Not Found: Product does not exist or is deleted
   *    - 400 Bad Request: Invalid image IDs, empty request body, or validation errors
   *
   * 6. Concurrency Considerations:
   *    - Use database transaction to ensure atomic updates
   *    - The unique constraint on (shopping_mall_product_id, display_order) prevents concurrent conflicts
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async updateImages(
    @TypedParam("productId")
    productId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallProductImage.IUpdate,
  ): Promise<IShoppingMallProductImage.ISummary> {
    try {
      return await patchShoppingMallProductsProductIdImages({
        productId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve detailed information about a specific product image.
   *
   * This operation allows authenticated users to view the metadata of an individual product image, including its URL, display order position, and creation timestamp. Product images serve as visual representations of products in the catalog, helping customers understand product appearance and features before making purchase decisions.
   *
   * The image must exist and belong to the specified product. If the image belongs to a different product, the operation returns a not found error. The display_order field indicates the image's position in the product's gallery, where lower values appear first and the image with the lowest display_order serves as the main thumbnail in product listings and search results.
   *
   * This endpoint is useful for:
   * - Customers viewing individual images in a product gallery
   * - Sellers managing their product images
   * - Administrators overseeing product content
   *
   * Related Operations:
   * - GET /products/{productId} - View the full product with all images
   * - GET /products?search=... - Search products with main thumbnail images in listings
   *
   * @param connection
   * @param productId Unique identifier of the product that owns the image (UUID format)
   * @param imageId Unique identifier of the product image to retrieve (UUID format)
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Retrieve a single product image record by its ID, verifying the image belongs to the specified product.
   *
   * Database Operations:
   * 1. Query shopping_mall_products table to verify the product exists (check id = productId)
   * 2. Query shopping_mall_product_images table for the specific image (id = imageId)
   * 3. Verify image.shopping_mall_product_id equals productId - return 404 if mismatch
   * 4. Return the image record with all fields: id, image_url, display_order, created_at, and product reference
   *
   * Authorization:
   * - All authenticated users (customers, sellers, administrators) can access
   * - No ownership verification needed as product images are publicly visible
   *
   * Edge Cases:
   * - Product not found: Return 404
   * - Image not found: Return 404
   * - Image exists but belongs to different product: Return 404
   * - Product is soft-deleted: Return image data (images preserved for historical reference)
   *
   * Response includes the product reference for context, allowing clients to navigate back to the product.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":imageId")
  public async at(
    @TypedParam("productId")
    productId: string & tags.Format<"uuid">,
    @TypedParam("imageId")
    imageId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallProductImage> {
    try {
      return await getShoppingMallProductsProductIdImagesImageId({
        productId,
        imageId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
