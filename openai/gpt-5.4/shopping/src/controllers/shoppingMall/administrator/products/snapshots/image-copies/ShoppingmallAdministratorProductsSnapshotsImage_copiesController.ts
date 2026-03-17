import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIShoppingMallProductSnapshotImageCopy } from "../../../../../../api/structures/IPageIShoppingMallProductSnapshotImageCopy";
import { IShoppingMallProductSnapshotImageCopy } from "../../../../../../api/structures/IShoppingMallProductSnapshotImageCopy";
import { AdministratorAuth } from "../../../../../../decorators/AdministratorAuth";
import { AdministratorPayload } from "../../../../../../decorators/payload/AdministratorPayload";
import { getShoppingMallAdministratorProductsProductIdSnapshotsProductSnapshotIdImageCopiesImageCopyId } from "../../../../../../providers/getShoppingMallAdministratorProductsProductIdSnapshotsProductSnapshotIdImageCopiesImageCopyId";
import { patchShoppingMallAdministratorProductsProductIdSnapshotsProductSnapshotIdImageCopies } from "../../../../../../providers/patchShoppingMallAdministratorProductsProductIdSnapshotsProductSnapshotIdImageCopies";

@Controller(
  "/shoppingMall/administrator/products/:productId/snapshots/:productSnapshotId/image-copies",
)
export class ShoppingmallAdministratorProductsSnapshotsImage_copiesController {
  /**
   * Retrieve the preserved image copies recorded for a specific product snapshot.
   *
   * This operation exposes the immutable historical gallery state stored beneath a product snapshot. Each returned entry corresponds to a row in the preserved image-copy collection for the target snapshot and represents how one gallery image existed when the snapshot event was created. In accordance with the database schema, the returned records are based on `shopping_mall_product_snapshot_image_copies`, which preserves the historical image location through `image_uri`, the gallery position through `sequence`, and whether the image served as the snapshot thumbnail through `thumbnail`. The parent snapshot is anchored by `shopping_mall_product_snapshots`, and that snapshot in turn belongs to the current or historically preserved product identified by `shopping_mall_products.id`.
   *
   * Access to this historical gallery is restricted by platform role and ownership. Sellers may review only snapshots of products they own, which means the system must verify that the requested product belongs to the signed-in seller and that the requested snapshot belongs to that product. Administrators and super administrators may review snapshot history for any product as part of platform oversight, dispute investigation, and historical evidence review. Customers do not have permission to access product snapshot history. These rules follow the requirements that preserved product snapshots, including preserved images, are available to the owning seller and to platform oversight roles.
   *
   * The operation is intended for historical review rather than live gallery management. Image additions, removals, and reordering are handled as product edits elsewhere, and each such edit causes the system to preserve the previous state as a snapshot. This endpoint therefore does not expose mutable product-image behavior; it reads the preserved business record that remains available even if the live product gallery has changed again. It must also continue to work when the current product has been removed from active listings, because the platform explicitly preserves product snapshots and their associated image history after product deletion from listings.
   *
   * Consumers will typically use this endpoint after selecting a specific product snapshot from snapshot history. A snapshot-list operation should be executed first to identify the relevant `productSnapshotId`, and then this operation can be called to reconstruct the gallery that existed at that historical point. The response should be ordered by the preserved `sequence` value so the client can render the historical gallery in the same arrangement that existed when the snapshot was created, with the `thumbnail` flag indicating which image was the main listing image at that time.
   *
   * If the specified product does not exist, if the snapshot does not exist, if the snapshot is not attached to the given product, or if the caller does not satisfy the ownership or administrative access rules, the operation must reject the request. The endpoint returns preserved records only and does not infer or merge current live product images, because the requirement is to show the historical state exactly as preserved for audit, oversight, and dispute resolution purposes.
   *
   * @param connection
   * @param productId Target product's ID
   * @param productSnapshotId Target product snapshot's ID
   * @param body Pagination and ordering options for preserved snapshot image copies
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor administrator
   * @x-autobe-specification Implement a paginated historical-gallery retrieval for `shopping_mall_product_snapshot_image_copies` scoped to one product snapshot.
   *
   * 1. Authenticate the session and determine actor role.
   * 2. Load the target product from `shopping_mall_products` by `productId`. The product may have `deleted_at` populated; this must not block historical snapshot access by an authorized actor.
   * 3. Load the target snapshot from `shopping_mall_product_snapshots` by `productSnapshotId` and verify `shopping_mall_product_id === productId`. Reject the request if the snapshot does not belong to the specified product.
   * 4. Apply authorization:
   *    - seller: allow only when `shopping_mall_products.shopping_mall_seller_id` matches the authenticated seller account id;
   *    - administrator: allow for any product;
   *    - superAdministrator: allow for any product;
   *    - all other actors: reject.
   * 5. Query `shopping_mall_product_snapshot_image_copies` where `shopping_mall_product_snapshot_id = productSnapshotId`.
   * 6. Apply pagination from `IShoppingMallProductSnapshotImageCopy.IRequest`.
   * 7. Apply stable sorting with `sequence ASC` as the default and fallback tie-breaker so the preserved gallery order is deterministic. Optional alternate sort fields, if supported by the shared request DTO, must never violate deterministic ordering.
   * 8. Map results to summary DTOs containing the preserved identity and gallery reconstruction data needed for historical review, especially the preserved image URI, sequence, thumbnail flag, and creation metadata.
   * 9. Return `IPageIShoppingMallProductSnapshotImageCopy.ISummary`.
   *
   * Validation and error handling rules:
   * - Reject when `productId` is not a valid UUID input.
   * - Reject when `productSnapshotId` is not a valid UUID input.
   * - Reject when the product record is missing.
   * - Reject when the snapshot record is missing.
   * - Reject when the snapshot-product relationship is invalid.
   * - Reject when a seller requests snapshots for a product not owned by that seller.
   * - Do not require the live product to remain listed; historical records stay available for authorized review even when the product has been deleted from active listings.
   * - Do not mutate snapshot or image-copy data under any circumstance; these records are immutable historical evidence.
   *
   * Performance guidance:
   * - Use the existing snapshot index on `shopping_mall_product_snapshots(shopping_mall_product_id, created_at)` for parent verification where helpful.
   * - Use the unique and indexed fields on `shopping_mall_product_snapshot_image_copies` to support ordered retrieval by snapshot and sequence.
   * - Avoid joining live product-image tables because this endpoint must return only preserved snapshot image data.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @AdministratorAuth()
    administrator: AdministratorPayload,
    @TypedParam("productId")
    productId: string & tags.Format<"uuid">,
    @TypedParam("productSnapshotId")
    productSnapshotId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallProductSnapshotImageCopy.IRequest,
  ): Promise<IPageIShoppingMallProductSnapshotImageCopy.ISummary> {
    try {
      return await patchShoppingMallAdministratorProductsProductIdSnapshotsProductSnapshotIdImageCopies(
        {
          administrator,
          productId,
          productSnapshotId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve one preserved image copy from a specific product snapshot.
   *
   * This operation returns a single immutable image-copy record stored under a product snapshot so authorized users can inspect how a product gallery appeared at a particular historical edit point. The underlying snapshot-image table preserves the stored image location, the gallery display order, and whether the image served as the main thumbnail when the parent snapshot was created. This supports the business requirement that historical product presentation remains reviewable even after the live product gallery is later reordered, replaced, or removed.
   *
   * Access is restricted to actors who are allowed to review product snapshots. A seller may retrieve image copies only for snapshots belonging to that seller's own products. An administrator may retrieve image copies for any product on the platform as part of product oversight and dispute investigation. A super administrator has the same platform-wide oversight capability through inherited administrator authority. Customers are not authorized to open this historical snapshot media record.
   *
   * The operation is tied to three related resources: the current product record in shopping_mall_products, the snapshot event record in shopping_mall_product_snapshots, and the immutable copied gallery row in shopping_mall_product_snapshot_image_copies. The system must confirm that the specified snapshot belongs to the specified product and that the specified image copy belongs to the specified snapshot before returning data. This nested lookup is important because the copied image is not a standalone business object; it is historical evidence attached to one snapshot event for one product.
   *
   * This endpoint is typically used together with product snapshot history browsing operations. A client would first retrieve available snapshots for a product, then open a specific snapshot, and finally request one of its preserved image copies when a detailed historical gallery record is needed. The response should reflect the preserved state only and must not be rewritten from current product images. If any identifier does not resolve within the declared parent scope, or if the seller does not own the target product, the request must be rejected.
   *
   * @param connection
   * @param productId Target product's ID
   * @param productSnapshotId Target product snapshot's ID
   * @param imageCopyId Target preserved image copy's ID
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor administrator
   * @x-autobe-specification Implement a read-only detail query for shopping_mall_product_snapshot_image_copies.
   *
   * 1. Resolve the authenticated actor from session context and allow only seller, administrator, or superAdministrator roles. Reject unauthenticated access and reject customer access.
   * 2. Load the target product from shopping_mall_products by id = productId. If not found, return a not-found error.
   * 3. Load the target snapshot from shopping_mall_product_snapshots by id = productSnapshotId and shopping_mall_product_id = productId. If not found, return a not-found error scoped to the product.
   * 4. Load the target image copy from shopping_mall_product_snapshot_image_copies by id = imageCopyId and shopping_mall_product_snapshot_id = productSnapshotId. If not found, return a not-found error scoped to the snapshot.
   * 5. Authorization rules:
   *    - seller: permit only when shopping_mall_products.shopping_mall_seller_id matches the authenticated seller account id.
   *    - administrator: permit for any product snapshot.
   *    - superAdministrator: permit for any product snapshot through inherited administrator-level oversight.
   * 6. Return the immutable historical fields from the image-copy record, including id, shopping_mall_product_snapshot_id, sequence, image_uri, thumbnail, and created_at, mapped to IShoppingMallProductSnapshotImageCopy.
   * 7. Do not query current live product images to reconstruct the response. The response must come from the preserved snapshot-image table so historical review remains stable.
   * 8. No mutation, regeneration, or deletion behavior is allowed in this endpoint. This operation is strictly for historical retrieval.
   * 9. Handle edge cases explicitly:
   *    - product exists but snapshot does not belong to it;
   *    - snapshot exists but image copy does not belong to it;
   *    - seller attempts to access another seller's product snapshot;
   *    - product is deleted from active listings but preserved snapshots still exist and remain retrievable for authorized users.
   * 10. Prefer a single transactional read or equivalent consistent read path when loading the parent-child chain to avoid mismatched scope checks.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":imageCopyId")
  public async at(
    @AdministratorAuth()
    administrator: AdministratorPayload,
    @TypedParam("productId")
    productId: string & tags.Format<"uuid">,
    @TypedParam("productSnapshotId")
    productSnapshotId: string & tags.Format<"uuid">,
    @TypedParam("imageCopyId")
    imageCopyId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallProductSnapshotImageCopy> {
    try {
      return await getShoppingMallAdministratorProductsProductIdSnapshotsProductSnapshotIdImageCopiesImageCopyId(
        {
          administrator,
          productId,
          productSnapshotId,
          imageCopyId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
