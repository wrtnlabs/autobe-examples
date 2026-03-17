import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IEcommerceMallProductImage } from "../../../../../api/structures/IEcommerceMallProductImage";
import { SellerAuth } from "../../../../../decorators/SellerAuth";
import { SellerPayload } from "../../../../../decorators/payload/SellerPayload";
import { deleteEcommerceMallSellerProductsProductIdImagesImageId } from "../../../../../providers/deleteEcommerceMallSellerProductsProductIdImagesImageId";
import { postEcommerceMallSellerProductsProductIdImages } from "../../../../../providers/postEcommerceMallSellerProductsProductIdImages";
import { putEcommerceMallSellerProductsProductIdImagesImageId } from "../../../../../providers/putEcommerceMallSellerProductsProductIdImagesImageId";

@Controller("/ecommerceMall/seller/products/:productId/images")
export class EcommercemallSellerProductsImagesController {
  /**
   * Upload product images for a specific product in the ecommerce mall catalog.
   *
   * This operation allows sellers to add images to their products, supporting multiple image uploads per product. Each product can have up to 10 images, with the first image (sort_order=0) automatically serving as the main thumbnail displayed in search results and category listings.
   *
   * **Database Entity**:
   *
   * Images are stored in the `ecommerce_mall_product_images` table with the following key fields:
   * - `url`: CDN or file storage URI reference to the stored image file
   * - `sort_order`: Display order position (lower values appear first)
   * - `is_primary`: Boolean flag indicating the main thumbnail image (true for sort_order=0)
   * - `deleted_at`: Soft delete timestamp for audit trail preservation
   *
   * Images are always managed through their parent `ecommerce_mall_products` entity via the foreign key `ecommerce_mall_product_id`. Images are cascade-deleted when the parent product is deleted.
   *
   * **File Upload Requirements**:
   *
   * - Supported formats: JPEG, PNG, GIF, WebP (per validation rules in section 736)
   * - Maximum file size: 10MB per image
   * - Minimum resolution: 800x800 pixels
   * - Maximum resolution: 4000x4000 pixels
   * - Images are validated for malicious content before storage
   * - Thumbnail versions (200x200 pixels) are automatically generated for listing displays
   *
   * **Image Ordering and Thumbnail Designation**:
   *
   * - Images are assigned sequential sort_order values starting from 0
   * - The image with sort_order=0 is automatically marked with is_primary=true
   * - The first image serves as the thumbnail in product listings and search results
   * - Image order can be modified using the reorder endpoint (PATCH /products/{productId}/images/reorder)
   * - Reordering updates sort_order values and triggers product snapshot creation
   *
   * **Snapshot and Audit Trail**:
   *
   * - Every image upload creates a product snapshot in `ecommerce_mall_product_snapshots`
   * - Snapshots capture the complete image list before and after the upload
   * - Snapshot includes changedBy reference (seller id), createdAt timestamp, previousValues and currentValues JSON fields
   * - Snapshots are immutable and preserved even when the product is soft-deleted
   * - Snapshots support dispute resolution and audit purposes
   *
   * **Authorization and Access Control**:
   *
   * - Only the product's owning seller can upload images (verified via ecommerce_mall_products.seller_id)
   * - Administrators cannot directly upload images but can view all product images for oversight
   * - Image upload events are logged for audit purposes
   * - Sellers can view all images for their products (section 646)
   *
   * **Related Operations**:
   *
   * - `PATCH /ecommerceMall/seller/products/{productId}/images/reorder` - Reorder existing images and update thumbnail designation
   * - `DELETE /ecommerceMall/seller/products/{productId}/images/{imageId}` - Soft delete individual images (preserves in snapshots)
   * - `GET /ecommerceMall/seller/products/{productId}` - View complete product with all images
   * - `GET /ecommerceMall/seller/products/{productId}/snapshots` - View product snapshots including image history
   * - `PATCH /ecommerceMall/seller/products/{productId}` - Update product details (triggers snapshot with image list)
   *
   * @param connection
   * @param productId Target product's ID (global scope)
   * @param body Image file URI and upload metadata for product image creation
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor seller
   * @x-autobe-specification 1. Validate productId exists and belongs to authenticated seller
   * 2. Validate file format (JPEG, PNG, GIF) and size limits
   * 3. Store image in CDN/file storage, generate unique URI
   * 4. Determine sort_order: if no images exist, set to 0 and is_primary=true; otherwise increment max sort_order
   * 5. Create ecommerce_mall_product_images record with url, sort_order, is_primary
   * 6. Create product snapshot capturing new image list
   * 7. Return created image with all fields
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("productId")
    productId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IEcommerceMallProductImage.ICreate,
  ): Promise<IEcommerceMallProductImage> {
    try {
      return await postEcommerceMallSellerProductsProductIdImages({
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
   * Update an existing product image's properties for a seller's product.
   *
   * This operation allows sellers to modify image attributes including the image URL and display sort order. Only the seller who owns the product can update its images. When image properties are modified, a complete product snapshot is created to preserve the audit trail.
   *
   * The sort order determines the display sequence of images, with lower values appearing first. The image with sort order 0 serves as the main thumbnail displayed in search results and category listings. If the sort order is changed such that a different image becomes first, that image's is_primary flag will be automatically updated.
   *
   * Image updates are subject to ownership validation - sellers can only update images for products they own. The operation validates that the product exists, the image belongs to that product, and the authenticated seller is the product owner.
   *
   * Related operations:
   * - `GET /products/{productId}/images` - Retrieve all images for a product
   * - `POST /products/{productId}/images` - Upload new images to a product
   * - `DELETE /products/{productId}/images/{imageId}` - Soft delete an image from a product
   * - `PATCH /products/{productId}/images` - Batch reorder multiple images
   *
   * @param connection
   * @param productId Target product's unique identifier (UUID)
   * @param imageId Target product image's unique identifier (UUID)
   * @param body Image update payload containing fields to modify
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor seller
   * @x-autobe-specification 1. Authenticate request and identify seller actor
   * 2. Validate productId exists in ecommerce_mall_products table
   * 3. Validate imageId exists in ecommerce_mall_product_images table
   * 4. Verify image's ecommerce_mall_product_id matches productId
   * 5. Verify seller owns the product (ecommerce_mall_products.seller_id = authenticated seller id)
   * 6. Validate request body fields:
   *    - url: if provided, must be valid URL string, max 80000 characters
   *    - sortOrder: if provided, must be non-negative integer
   * 7. Begin database transaction
   * 8. Update image record with provided fields (url, sort_order)
   * 9. Recalculate is_primary flag: set to true if sort_order=0, false otherwise
   * 10. For all other images of this product, update is_primary flags accordingly
   * 11. Create product snapshot with before/after state including all variant data
   * 12. Update updated_at timestamp
   * 13. Commit transaction
   * 14. Return updated image record with all fields
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":imageId")
  public async update(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("productId")
    productId: string & tags.Format<"uuid">,
    @TypedParam("imageId")
    imageId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IEcommerceMallProductImage.IUpdate,
  ): Promise<IEcommerceMallProductImage> {
    try {
      return await putEcommerceMallSellerProductsProductIdImagesImageId({
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
   * Permanently remove a product image from a seller's product catalog.
   *
   * This operation deletes a specific image associated with a product, updating the product's image collection and maintaining the audit trail through product snapshots. The image is soft-deleted (marked with deleted_at timestamp) rather than physically removed from storage.
   *
   * **Security and Authorization**:
   *
   * Only the product's owning seller or a system administrator can delete product images. The system verifies seller ownership before allowing the operation to proceed. Administrators have override permissions for policy enforcement.
   *
   * **Business Rules and Validation**:
   *
   * - The product must exist and be in 'active' or 'suspended' status (not already deleted)
   * - The image must belong to the specified product
   * - **Cannot delete the last remaining image** from an active product - at least one image must remain
   * - If the deleted image is the primary thumbnail (sort_order=0), the next image automatically becomes the new thumbnail
   * - All remaining images have their sort_order values adjusted to maintain sequential ordering
   * - A product snapshot is created to record the image deletion for audit purposes
   *
   * **Thumbnail Management**:
   *
   * When the primary thumbnail image is deleted, the system automatically promotes the image with the next lowest sort_order value to become the new thumbnail (sort_order=0). This ensures products always have a visible thumbnail for search results and category listings.
   *
   * **Snapshot Creation**:
   *
   * Upon successful deletion, the system creates a product snapshot capturing the before and after state of the product's image collection. This snapshot includes the complete image list before deletion and the updated image list after deletion, providing a complete audit trail for dispute resolution and historical reference.
   *
   * **Related Operations**:
   *
   * - `GET /products/{productId}` - Retrieve complete product details including all images
   * - `PATCH /products/{productId}/images` - Reorder product images
   * - `POST /products/{productId}/images` - Upload new product images
   * - `GET /products/{productId}/snapshots` - View product modification history including image changes
   *
   * @param connection
   * @param productId Target product's unique identifier (UUID)
   * @param imageId Target image's unique identifier (UUID)
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor seller
   * @x-autobe-specification 1. Validate productId and imageId are valid UUIDs
   * 2. Fetch product from ecommerce_mall_products table by id
   * 3. Verify product exists and is not already deleted (deleted_at IS NULL)
   * 4. Fetch image from ecommerce_mall_product_images table by id
   * 5. Verify image exists, belongs to the specified product, and is not already deleted
   * 6. Verify authorization: current user is product seller OR is admin
   * 7. Count remaining non-deleted images for this product
   * 8. IF remaining image count <= 1, reject with error 'Cannot delete last image'
   * 9. Fetch all remaining images for the product (non-deleted, excluding target)
   * 10. IF deleted image is primary (sort_order=0):
   *     - Find image with next lowest sort_order
   *     - Update that image's sort_order to 0 and is_primary to true
   *     - Update target image's is_primary to false
   * 11. Soft-delete target image: set deleted_at to current timestamp
   * 12. Update remaining images' sort_order values to maintain sequential ordering (0, 1, 2, ...)
   * 13. Create product snapshot in ecommerce_mall_product_snapshots:
   *     - snapshotType: 'product'
   *     - previousValues: complete product state including full image list
   *     - currentValues: complete product state with updated image list
   *     - changedBy: current user id
   * 14. Return deleted image object with updated deleted_at timestamp
   * 15. Handle edge cases: product not found, image not found, unauthorized, last image deletion attempt
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":imageId")
  public async erase(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("productId")
    productId: string & tags.Format<"uuid">,
    @TypedParam("imageId")
    imageId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteEcommerceMallSellerProductsProductIdImagesImageId({
        seller,
        productId,
        imageId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
