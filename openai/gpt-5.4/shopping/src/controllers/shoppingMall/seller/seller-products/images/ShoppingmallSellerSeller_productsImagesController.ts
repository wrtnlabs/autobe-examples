import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IShoppingMallProductImage } from "../../../../../api/structures/IShoppingMallProductImage";
import { SellerAuth } from "../../../../../decorators/SellerAuth";
import { SellerPayload } from "../../../../../decorators/payload/SellerPayload";
import { deleteShoppingMallSellerSellerProductsProductIdImagesImageId } from "../../../../../providers/deleteShoppingMallSellerSellerProductsProductIdImagesImageId";
import { getShoppingMallSellerSellerProductsProductIdImagesImageId } from "../../../../../providers/getShoppingMallSellerSellerProductsProductIdImagesImageId";
import { patchShoppingMallSellerSellerProductsProductIdImages } from "../../../../../providers/patchShoppingMallSellerSellerProductsProductIdImages";
import { postShoppingMallSellerSellerProductsProductIdImages } from "../../../../../providers/postShoppingMallSellerSellerProductsProductIdImages";
import { putShoppingMallSellerSellerProductsProductIdImagesImageId } from "../../../../../providers/putShoppingMallSellerSellerProductsProductIdImagesImageId";

@Controller("/shoppingMall/seller/seller-products/:productId/images")
export class ShoppingmallSellerSeller_productsImagesController {
  /**
   * Create a new gallery image for a seller-owned product.
   *
   * This operation lets an authenticated seller attach a new visual merchandise media item to an existing product listing. In the business domain, a product gallery image is a product-scoped visual asset used to help customers understand the merchandise through pictures as well as text, and it is explicitly separate from seller branding images such as a shop logo. The newly created image becomes part of the product’s current gallery and is intended for customer-facing presentation in product detail pages and, depending on gallery order, potentially in listing thumbnails.
   *
   * Access to this operation is restricted to the seller who owns the target product. The loaded requirements state that product image management applies only to the seller who owns the product, and that the platform must deny attempts to add, reorder, or delete images for a product owned by another seller. Because image changes are treated as edits to the product’s business content, the server must verify both that the target product exists and that it belongs to the authenticated seller before accepting the request.
   *
   * This operation is related to the current product image gallery represented by the product-image entity attached to the parent product entity. Each successful image addition updates the product gallery used in customer-facing product detail views. The business rules also state that the first image in the gallery order acts as the main thumbnail in listing contexts, so the placement of the new image may affect storefront presentation depending on how ordering metadata is applied. The server should therefore preserve a consistent and deterministic image order after insertion.
   *
   * A successful image creation must also participate in historical preservation behavior. The requirements explicitly state that whenever product images are changed, the system creates a product snapshot that includes the image state at that moment. That means this endpoint is commonly used together with product detail retrieval and product snapshot viewing operations: the current gallery is updated immediately for active product views, while the previous and new image arrangements remain reviewable through snapshot-oriented endpoints for sellers and administrators.
   *
   * Clients typically call this operation after preparing or obtaining an uploadable media URI through the platform’s file handling flow. This endpoint does not define any content delivery network behavior, caching guarantee, or media acceleration policy; those concerns are outside the documented business scope. Its responsibility is to register the uploaded image as product gallery content, validate seller ownership, update presentation order, and return the created gallery image resource.
   *
   * @param connection
   * @param productId Identifier of the seller-owned product that will receive the new gallery image
   * @param body Information required to create a product gallery image
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor seller
     * @x-autobe-specification Implement this operation as a seller-scoped
     *   creation workflow for a child record of the target product.
   *
   * 1. Authenticate the caller as a seller. Reject non-seller actors.
   * 2. Load the target product from the product table by `productId`. If not found, return a not-found error.
   * 3. Verify that the loaded product is owned by the authenticated seller. If ownership does not match, return a forbidden error.
   * 4. Validate the request body against product image creation rules. The payload should include the uploaded image location and any explicit desired ordering metadata supported by the DTO. Do not allow changes to unrelated product properties such as category, ownership, pricing, or seller profile data.
   * 5. Query existing product images for the product to determine current gallery order. If the request specifies insertion behavior, normalize the resulting order so every image has a unique deterministic position. If no explicit order is provided, append the new image to the end of the current gallery.
   * 6. Insert the new product-image record linked to the target product inside a transaction. If insertion requires shifting sibling image positions, update affected sibling rows in the same transaction.
   * 7. After the gallery state is finalized, create a corresponding product snapshot representing the updated product edit state, including the current image arrangement. Ensure the snapshot captures the post-change image set rather than only the newly inserted row.
   * 8. Return the created product-image resource, ideally including identifiers, product linkage, image URI, and resolved order information needed by the client to render the gallery item.
   *
   * Error handling:
   * - Return not found when the product does not exist.
   * - Return forbidden when the product exists but is owned by another seller.
   * - Return validation errors for malformed or unsupported media references, invalid ordering input, or other DTO violations.
   * - Return conflict or validation errors if the requested ordering cannot be applied consistently.
   *
   * Implementation notes:
   * - Keep the image creation and any sibling reorder updates atomic.
   * - Treat this operation strictly as a product gallery edit; do not update product ownership or seller branding media.
   * - Preserve consistent ordering because the first image determines the listing thumbnail in storefront contexts.
   * - If downstream storage verification is part of the platform implementation, perform it before database commit, but keep business-visible behavior centered on gallery registration rather than file transfer.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("productId")
    productId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallProductImage.ICreate,
  ): Promise<IShoppingMallProductImage> {
    try {
      return await postShoppingMallSellerSellerProductsProductIdImages({
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
   * Update the current image gallery for a seller-owned product.
   *
   * This operation lets a seller revise the visual merchandise gallery attached to one product record. In the underlying data model, `shopping_mall_products` is the seller-owned catalog record for marketplace browsing, and `shopping_mall_product_images` stores the ordered gallery images belonging to that product, including the stored `image_uri`, the product-scoped `sequence`, and the `is_thumbnail` flag that identifies the current primary product image. The endpoint is designed for gallery maintenance rather than general product editing, so it focuses specifically on image additions, removals, reordering, and thumbnail updates for the target product.
   *
   * Access is restricted to the seller who owns the product. The service must verify that the authenticated seller is the owner referenced by `shopping_mall_products.shopping_mall_seller_id`, and it must deny the request when the product belongs to another seller. It must also enforce seller restriction rules derived from `shopping_mall_sellers`, especially the requirement that suspended sellers cannot add, reorder, or delete product images. Because product images are part of editable business content for a product, an allowed gallery change is treated as a product edit rather than as a separate marketplace object unrelated to the product.
   *
   * The operation reflects the product gallery management requirements that sellers can maintain multiple images over time and that the first image acts as the main thumbnail in listing contexts. The database schema supports this through ordered rows in `shopping_mall_product_images`, with a uniqueness constraint on `(shopping_mall_product_id, sequence)` to ensure one image position per product. When the submitted gallery state changes ordering, the service must persist a coherent sequence arrangement and exactly one thumbnail state, so customer-facing product detail pages and listing thumbnails remain consistent with the seller’s intended presentation.
   *
   * This endpoint is also responsible for preserving historical reviewability. Requirement sections state that whenever product images are changed, the system creates the next product snapshot including the resulting image set. The persistence model supports that history through `shopping_mall_product_snapshots` as the snapshot event anchor and `shopping_mall_product_snapshot_image_copies` as immutable copies of each gallery image, including preserved `image_uri`, `sequence`, and snapshot thumbnail status. As a result, current gallery updates must not rewrite historical snapshot records, and later snapshot viewers can still see the image arrangement that existed at the time of each edit.
   *
   * Clients typically use this operation after retrieving the current product gallery through a product detail or seller product management view, then submitting the revised image arrangement for synchronization. If the product does not exist, if it is not owned by the requesting seller, or if seller restrictions disallow image changes, the request must fail without altering the current gallery state. Successful completion returns the updated product image resource so the seller UI can immediately reflect the current gallery ordering and thumbnail selection.
   *
   * @param connection
   * @param productId Target product ID for the seller-owned image gallery
   * @param body Desired product image gallery update payload
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor seller
     * @x-autobe-specification 1. Authenticate the requester as a seller
     *   account. 2. Load the target `shopping_mall_products` row by `productId`
     *   where `deleted_at` is null unless product-management policy explicitly
     *   allows editing deleted products; for this endpoint, deny updates when
     *   the product is not an active editable seller product. 3. Join or
     *   separately load the owning `shopping_mall_sellers` row using
     *   `shopping_mall_products.shopping_mall_seller_id`. 4. Validate
     *   authorization and business restrictions: - If the product does not
     *   exist, return a not-found error. - If the authenticated seller does not
     *   own the product, return a forbidden error. - If the seller is
     *   suspended, deny the request and leave the gallery unchanged. - If the
     *   seller is banned or the account is otherwise unusable for platform
     *   actions, deny the request. 5. Parse `IShoppingMallProductImage.IUpdate`
     *   as the desired gallery state. Treat the request as a
     *   synchronization/update command for the product’s current images. 6.
     *   Validate request-level gallery rules: - Every submitted image entry
     *   must contain a valid image URI suitable for stored media references. -
     *   Submitted sequence positions must be unique within the request. -
     *   Normalize ordering into a deterministic ascending sequence if the DTO
     *   is order-based rather than explicit-sequence-based. - Ensure exactly
     *   one thumbnail is designated, or if the contract omits explicit
     *   thumbnail flags, assign the first resulting image as thumbnail because
     *   product listings use the first image as the main thumbnail. - Reject an
     *   empty or inconsistent payload if business policy requires at least one
     *   gallery image for an image-update request; otherwise allow empty
     *   gallery synchronization only when the product is permitted to have no
     *   current images. 7. Start a transaction. 8. Load current active
     *   `shopping_mall_product_images` rows for the product where `deleted_at`
     *   is null. 9. Apply the gallery mutation: - For retained images, update
     *   `sequence`, `is_thumbnail`, and `updated_at` as needed. - For newly
     *   added images, insert new `shopping_mall_product_images` rows with new
     *   UUIDs, `shopping_mall_product_id`, `image_uri`, normalized `sequence`,
     *   `is_thumbnail`, and timestamps. - For removed images, mark `deleted_at`
     *   and update `updated_at` rather than physically deleting rows, because
     *   the schema explicitly supports soft deletion for current image records.
     *   10. Enforce post-write invariants inside the transaction: - No
     *   duplicate active sequence for the product. - At most one active
     *   thumbnail row for the product. - The thumbnail row corresponds to the
     *   first visible image when that is the product-gallery policy. 11. Create
     *   a new `shopping_mall_product_snapshots` row for the product to record
     *   this edit event. 12. Read the resulting active image set after
     *   mutation, ordered by sequence ascending. 13. Insert one
     *   `shopping_mall_product_snapshot_image_copies` row per resulting active
     *   image under the new snapshot, copying the final `image_uri`,
     *   `sequence`, and thumbnail state. 14. Commit the transaction. 15. Return
     *   the updated product image resource representing the current gallery
     *   state for the target product, ordered by ascending sequence. 16. Error
     *   handling: - Unique constraint collisions on `(shopping_mall_product_id,
     *   sequence)` must be surfaced as a validation conflict rather than an
     *   internal error. - Snapshot creation failure must roll back the gallery
     *   update so current state and historical state never diverge. - Invalid
     *   media references must be rejected before any persistent changes are
     *   made.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async patchByProductid(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("productId")
    productId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallProductImage.IUpdate,
  ): Promise<IShoppingMallProductImage> {
    try {
      return await patchShoppingMallSellerSellerProductsProductIdImages({
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
   * Retrieve a single gallery image record from a seller-owned product.
   *
   * This operation allows a seller to inspect one specific image that belongs to the gallery of one of the seller's own product listings. In the product image domain, a gallery image is a visual merchandise media item attached to a product so customers can understand the item through pictures as well as text. The loaded schema for `shopping_mall_product_images` defines each image as an ordered gallery record containing the stored resource location, the product-scoped display order, and whether the image is the current thumbnail. Because the table stores one row per image for a single `shopping_mall_products` record, this endpoint returns the current active state of exactly one gallery image within that seller-managed gallery.
   *
   * Access to this operation is restricted to the seller who owns the parent product. The requirements state that sellers can view the current set of images attached to a product before deciding whether to add, reorder, or remove images, and that the shopping mall must deny image management actions for products owned by another seller. Consistent with that rule, the implementation must verify that the `productId` identifies a product whose `shopping_mall_seller_id` matches the authenticated seller, and that the `imageId` belongs to that same product. This prevents cross-seller access and prevents an image from being fetched outside its parent product scope.
   *
   * This endpoint is related to the broader product gallery management workflow. Sellers typically use the parent product image listing operation before selecting a particular image to inspect, reorder, or remove. The seller-defined gallery order matters because the first image in the ordered set becomes the main thumbnail used in product listings, while the detail page presents the full ordered gallery. The `sequence` and `is_thumbnail` fields returned from this operation therefore have business meaning beyond metadata: they directly affect how the merchandise is presented in listing and detail contexts.
   *
   * The operation reads the current product image record only. Historical image arrangements are preserved through product snapshots, as described by the requirements and reflected by the schema comments referencing immutable snapshot image copies. Accordingly, this endpoint should return the current image entity from `shopping_mall_product_images` rather than historical snapshot content. If the parent product does not exist, does not belong to the authenticated seller, the image does not belong to the specified product, or the image has already been removed from the active gallery, the request must fail instead of returning unrelated or inactive image data.
   *
   * @param connection
   * @param productId Target seller product ID
   * @param imageId Target product image ID within the specified product
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor seller
     * @x-autobe-specification Authenticate the caller as a seller account.
   *
   * Load the parent row from `shopping_mall_products` by `productId` and verify that it exists, that its `deleted_at` is null unless the platform explicitly allows management of deleted products, and that `shopping_mall_seller_id` matches the authenticated seller's account identifier. If the product is missing or ownership does not match, reject the request.
   *
   * Query `shopping_mall_product_images` for a row where `id = imageId`, `shopping_mall_product_id = productId`, and `deleted_at IS NULL`. This product-scoped lookup is mandatory even though `id` is globally unique, because the route is hierarchical and must guarantee that the returned image belongs to the designated product. If no active row is found, return a not-found error.
   *
   * Map the database row to `IShoppingMallProductImage`, including the current image resource URI, gallery sequence, thumbnail flag, and audit timestamps. Do not mutate ordering or thumbnail state in this operation. Do not return snapshot image-copy records from historical product snapshots.
   *
   * Error handling must distinguish between not-found and forbidden conditions according to platform conventions. Forbidden should be used when the authenticated seller attempts to access a product owned by another seller. Not-found should be used when the product does not exist in the seller's accessible scope or when the image does not exist as an active image under the specified product. The implementation should avoid leaking whether another seller owns the target product beyond the platform's standard authorization policy.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":imageId")
  public async at(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("productId")
    productId: string & tags.Format<"uuid">,
    @TypedParam("imageId")
    imageId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallProductImage> {
    try {
      return await getShoppingMallSellerSellerProductsProductIdImagesImageId({
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
   * Update a specific gallery image attached to a seller-owned product.
   *
   * This operation allows a seller to modify the current editable image state of one product gallery image stored in the seller’s active product gallery. The target record is the ordered gallery image belonging to a product listing, represented by the shopping_mall_product_images table, which stores the product-scoped resource URI, display order sequence, and whether the image is the current thumbnail image. The parent product is represented by shopping_mall_products, the seller-owned product listing that defines the current sellable catalog record for marketplace browsing and purchase preparation. Together, these records support the seller’s ability to maintain product presentation without changing the underlying product identity.
   *
   * The operation is restricted to the seller who owns the parent product. The system must verify that the referenced product image belongs to the product identified by productId and that the product itself is owned by the authenticated seller. This follows the requirement that image additions, reordering, and deletions are allowed only for a product owned by that seller, and any attempt to manage images for another seller’s product must be denied. Because product gallery images represent merchandise presentation rather than seller branding, this endpoint applies only to product media and must not be used for seller profile logo management.
   *
   * The update behavior must preserve the business meaning of ordered presentation. Product gallery images are customer-facing visual merchandise media, and their order determines how the product is introduced in product detail views and listing contexts. The first image in that order is the main thumbnail image used as the primary visual representation in listings. Therefore, when an image’s sequence or thumbnail-related state is changed, the resulting gallery order and thumbnail designation must remain aligned with the seller-defined first-position rule so that the product detail gallery and listing thumbnail stay consistent.
   *
   * This operation updates only the current live gallery state. Historical preservation is handled separately through product snapshots. Whenever product images are changed, the system creates a product snapshot that includes the image state at that moment, allowing sellers to review prior arrangements and administrators to review historical product presentation. Changes made here must not rewrite previously preserved snapshot content. Product snapshot history and customer-facing product detail retrieval are related concerns but are separate operations from this live image update endpoint.
   *
   * Validation should ensure that the referenced image exists, is not already deleted unless restoration semantics are explicitly supported elsewhere, and remains unique in product-scoped ordering after the update. If the requested sequence conflicts with another active image of the same product, the implementation should resolve ordering deterministically inside the update transaction rather than leaving duplicate active sequence values. If the product or image cannot be found in the given scope, or if the requester does not own the product, the operation must fail without altering gallery state.
   *
   * @param connection
   * @param productId Target product ID that owns the gallery image
   * @param imageId Target product image ID within the specified product
   * @param body Product image update information
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor seller
     * @x-autobe-specification Load the target shopping_mall_products row by
     *   productId and ensure it exists, is not deleted for seller-edit
     *   purposes, and is owned by the authenticated seller account. Load the
     *   target shopping_mall_product_images row by imageId together with
     *   shopping_mall_product_id, and verify that it belongs to the same
     *   productId from the path. Reject the request when the product does not
     *   exist, the image does not exist, the image does not belong to the
     *   product, or the seller does not own the product.
   *
   * Apply updates from IShoppingMallProductImage.IUpdate only to fields that represent editable live gallery state. At minimum, support updating image_uri and sequence. Do not allow the client to bypass parent-child integrity by changing shopping_mall_product_id or any ownership field. Maintain updated_at on the image row.
   *
   * When sequence is changed, execute the reorder logic within a single transaction for all active shopping_mall_product_images rows of the same shopping_mall_product_id where deleted_at is null. Normalize sequence values to a contiguous product-scoped order so the unique constraint on [shopping_mall_product_id, sequence] is preserved. After reordering, recompute is_thumbnail for all active images of the product so exactly the first ordered active image has is_thumbnail = true and all other active images have is_thumbnail = false. If image_uri changes without sequence changes, still ensure thumbnail consistency remains valid.
   *
   * Treat this change as a product edit. After the live gallery update succeeds, trigger product snapshot creation for the parent product so the current image state is preserved historically, including the new ordering and thumbnail outcome. The snapshot process should not mutate existing historical snapshot records.
   *
   * Return the refreshed updated shopping_mall_product_images record after transaction completion. Error handling should distinguish at least: product not found, image not found, image/product scope mismatch, forbidden seller ownership violation, invalid update payload, and ordering conflict that cannot be resolved. All write steps affecting ordering and thumbnail designation must be atomic to avoid transient duplicate sequence or multiple-thumbnail states.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":imageId")
  public async putByProductidAndImageid(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("productId")
    productId: string & tags.Format<"uuid">,
    @TypedParam("imageId")
    imageId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallProductImage.IUpdate,
  ): Promise<IShoppingMallProductImage> {
    try {
      return await putShoppingMallSellerSellerProductsProductIdImagesImageId({
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
   * Remove a specific image from a seller-owned product gallery.
   *
   * This operation deletes one gallery image from the current editable image set of a product listing owned by the authenticated seller. The underlying product image record is the ordered gallery image entity stored in `shopping_mall_product_images`, which keeps the product-scoped display order through `sequence`, the current thumbnail designation through `is_thumbnail`, and the stored resource location through `image_uri`. The parent product is the live sellable catalog record in `shopping_mall_products`, and the deletion is scoped beneath that parent because a product image has meaning only within its product's gallery.
   *
   * Access to this operation is limited to signed-in sellers acting on their own products. The service must verify that the target product belongs to the requesting seller by checking `shopping_mall_products.shopping_mall_seller_id` against the authenticated seller identity. This follows the owner-only editing rule for product changes and the product-image-specific rule that gallery management applies only to the seller who owns the product. In addition, the service must deny the request when the seller account is suspended, because suspended sellers are explicitly prohibited from adding, reordering, or deleting product images. Customer-facing access is not allowed, and administrative historical review concerns snapshots rather than direct gallery mutation.
   *
   * The operation modifies the active gallery presentation of the product. After deletion, the removed image must no longer appear in the product detail gallery, and if the deleted image had the first gallery position or was the current thumbnail, the remaining ordered images must be normalized so there is no gap in `sequence` values and the first remaining image becomes the new thumbnail. If no images remain, the product must be treated as having no thumbnail image. These behaviors are grounded in the product image gallery rules that define the gallery as an ordered set with distinct positions rather than an unordered collection.
   *
   * This operation affects only the live gallery state. Historical preservation is handled separately through product snapshot behavior described in the requirements: when product images change, prior gallery states are preserved in snapshot structures for seller and administrator review. Therefore, this deletion removes the image from the active product presentation while leaving previously captured historical image sets available through snapshot-oriented operations.
   *
   * A client will commonly use the product image listing or product detail retrieval operation before invoking this endpoint so the user can select the target gallery image to remove. After successful deletion, the client should refresh the product gallery or product detail view to reflect recalculated ordering and thumbnail state. If the specified image does not belong to the specified product, if the image is already absent from the active gallery, if the product does not belong to the authenticated seller, or if the seller is suspended, the service must reject the request without altering the current gallery state.
   *
   * @param connection
   * @param productId Target product identifier owned by the authenticated seller
   * @param imageId Target product image identifier within the specified product gallery
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor seller
     * @x-autobe-specification Implement this operation as a seller-authorized
     *   transactional delete on `shopping_mall_product_images` scoped by the
     *   parent product.
   *
   * 1. Authenticate the requester as a seller.
   * 2. Load the seller account from `shopping_mall_sellers` and reject if `deleted_at` is not null, if `banned` prevents platform use according to service policy, or if `suspended` is true. At minimum, `suspended` must block this operation because suspended sellers cannot delete product images.
   * 3. Load the parent product from `shopping_mall_products` by `id = productId` and reject if not found, if `deleted_at` is not null, or if `shopping_mall_seller_id` does not match the authenticated seller. This enforces owner-only product editing.
   * 4. Load the target image from `shopping_mall_product_images` by `id = imageId` and `shopping_mall_product_id = productId`. Reject if not found or if `deleted_at` is already non-null, because deleting an already absent image must fail.
   * 5. Capture the target image's current `sequence` and `is_thumbnail` values before removal.
   * 6. Mark the target image as deleted by setting `deleted_at` to the current timestamp and updating `updated_at`. Do not physically remove the row if service conventions use the schema's lifecycle column; the active gallery must exclude rows where `deleted_at` is non-null.
   * 7. Query remaining active images for the same product with `deleted_at IS NULL`, ordered by `sequence` ascending.
   * 8. Rebuild contiguous gallery ordering for the remaining active images so there are no gaps. Update `sequence` values where necessary and set `updated_at` on changed rows.
   * 9. Recompute thumbnail state across the remaining active images:
   *    - if no active images remain, ensure no active thumbnail exists for the product;
   *    - otherwise set `is_thumbnail = true` only for the first image in ascending `sequence` order and `false` for all other remaining active images.
   * 10. Trigger product snapshot creation through the product-change snapshot mechanism so the gallery change is historically preserved, including the image arrangement resulting from this deletion, if snapshot generation is implemented in the same service boundary.
   * 11. Return the deleted image record representation, including its identifiers and lifecycle fields, as the successful response payload.
   *
   * Use a single database transaction to guarantee consistency between the image deletion, sequence normalization, thumbnail recalculation, and any snapshot enqueue/persist step. Ensure that concurrent deletions or reorder operations on the same product cannot leave duplicate sequences or multiple thumbnails. Reject cross-product references explicitly: if `imageId` exists but belongs to another product, treat it as invalid for this route. The operation must be idempotency-safe only in the sense that a repeated call after successful deletion returns an error because the image is already absent from the active gallery, matching the business rule.
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
      return await deleteShoppingMallSellerSellerProductsProductIdImagesImageId(
        {
          seller,
          productId,
          imageId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
