import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIShoppingMallProductSnapshotImage } from "../../../../../api/structures/IPageIShoppingMallProductSnapshotImage";
import { IShoppingMallProductSnapshotImage } from "../../../../../api/structures/IShoppingMallProductSnapshotImage";
import { AdminAuth } from "../../../../../decorators/AdminAuth";
import { AdminPayload } from "../../../../../decorators/payload/AdminPayload";
import { getShoppingMallAdminSnapshotsSnapshotIdImagesImageId } from "../../../../../providers/getShoppingMallAdminSnapshotsSnapshotIdImagesImageId";
import { patchShoppingMallAdminSnapshotsSnapshotIdImages } from "../../../../../providers/patchShoppingMallAdminSnapshotsSnapshotIdImages";

@Controller("/shoppingMall/admin/snapshots/:snapshotId/images")
export class ShoppingmallAdminSnapshotsImagesController {
  /**
   * Retrieve a paginated list of image records belonging to a specific product snapshot, accessible only to administrators.
   *
   * This operation returns all image assets that were captured as part of a given product snapshot record (`shopping_mall_product_snapshot_images`). Each image record is an immutable, ordered entry that preserves the URL and display sequence number of product images exactly as they existed at the moment the snapshot was created. Images are ordered by their `sequence` field, with lower values appearing first to reflect the original visual presentation order on the product detail page.
   *
   * Product snapshots (`shopping_mall_product_snapshots`) are point-in-time records created automatically whenever a seller edits a product — including its images, name, description, base price, or category — or when an order is placed. Since any change to a product's images (additions, removals, or reordering) constitutes a product edit, a new snapshot is always created that includes the complete and ordered set of images at that moment. The image list returned by this operation therefore accurately reflects the product's visual presentation at the exact moment of snapshot creation, and cannot be modified retroactively.
   *
   * This endpoint is restricted to administrator access only. Administrators may retrieve snapshot images for any product on the platform regardless of ownership or deletion status. Snapshot image records (`shopping_mall_product_snapshot_images`) are retained permanently even after the parent product is deleted, as product snapshots themselves are immutable and cannot be deleted. This ensures that historical order records, dispute resolution workflows, and audit processes always have access to the complete visual state of a product at any past point in time.
   *
   * To use this endpoint, the caller must first obtain a valid `snapshotId` from the list of snapshots associated with a product. Once a snapshot ID is known, this endpoint returns all images captured within that snapshot, paginated according to the provided request parameters.
   *
   * This endpoint does not support creation, update, or deletion of snapshot image records. Snapshot images are immutable and are only created as part of the snapshot creation process triggered by product edits or order placement.
   *
   * @param connection
   * @param snapshotId The UUID of the product snapshot whose images are to be retrieved. Corresponds to shopping_mall_product_snapshots.id.
   * @param body Pagination and filtering criteria for the snapshot image list.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor admin
     * @x-autobe-specification 1. Validate that the snapshotId path parameter
     *   corresponds to an existing shopping_mall_product_snapshots record. If
     *   the snapshot does not exist, return 404. 2. Verify authorization: if
     *   the caller is a seller, check that the snapshot's associated product
     *   (via product_id) is owned by the requesting seller. If the product has
     *   been deleted (product_id is null), the seller who originally owned the
     *   product should still be verifiable via the snapshot's product
     *   relationship or the order context. Administrators bypass this check and
     *   may access any snapshot's images. 3. Query
     *   shopping_mall_product_snapshot_images WHERE product_snapshot_id =
     *   snapshotId. 4. Apply pagination using the
     *   IShoppingMallProductSnapshotImage.IRequest body: page number, page
     *   size. 5. Apply sorting: default to ascending sequence order (display
     *   order). Allow sort by sequence or created_at if specified in the
     *   request. 6. Map each result record to
     *   IShoppingMallProductSnapshotImage.ISummary, including: id,
     *   product_snapshot_id, url, sequence, created_at. 7. Return the result
     *   wrapped in IPageIShoppingMallProductSnapshotImage.ISummary with
     *   pagination metadata (total count, current page, page size). 8. Edge
     *   case: if the snapshot exists but has no images (unlikely but possible),
     *   return an empty data array with total 0.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("snapshotId")
    snapshotId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallProductSnapshotImage.IRequest,
  ): Promise<IPageIShoppingMallProductSnapshotImage.ISummary> {
    try {
      return await patchShoppingMallAdminSnapshotsSnapshotIdImages({
        admin,
        snapshotId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single product snapshot image record by its identifier, scoped within a specific product snapshot.
   *
   * This operation returns the full detail of one image entry captured as part of an immutable product snapshot. The `shopping_mall_product_snapshot_images` table stores ordered visual image assets that were preserved at the exact moment a product snapshot was created. Each image record contains the image URL as it existed at snapshot time, along with a display sequence number (`sequence`) that controls the presentation order within the snapshot's image gallery.
   *
   * Product snapshots (`shopping_mall_product_snapshots`) are created automatically whenever a seller edits any field of a product — including adding, removing, or reordering images — or when an order is placed. Because any change to a product's images constitutes a product edit, the complete image set and ordering are always faithfully captured in every snapshot. Snapshot image records are immutable: they cannot be modified or deleted after creation, ensuring a permanent historical record of the product's visual presentation at any given point in time.
   *
   * Access to this endpoint is restricted to administrators. Administrators may use this endpoint to inspect the exact visual state of a product at any specific historical point, for example during dispute resolution or platform audit reviews. This access pattern is consistent with the broader rule that product snapshots and their image records may be viewed by administrators for any product on the platform.
   *
   * To use this endpoint, the caller must first identify the relevant snapshot ID. Snapshot IDs can be obtained by listing the product snapshots via the product snapshots index endpoint. Once the desired `snapshotId` is known, the `imageId` of a specific image within that snapshot can be obtained from the snapshot's image list endpoint. This endpoint then returns the complete detail of that individual image record, including its `id`, `product_snapshot_id`, `url`, `sequence`, and `created_at` timestamp.
   *
   * @param connection
   * @param snapshotId The UUID of the parent product snapshot. References shopping_mall_product_snapshots.id.
   * @param imageId The UUID of the specific product snapshot image record to retrieve. References shopping_mall_product_snapshot_images.id.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor admin
     * @x-autobe-specification 1. Validate that the authenticated caller is
     *   either the seller who owns the product associated with the target
     *   snapshot, or an administrator. 2. Query shopping_mall_product_snapshots
     *   by the given snapshotId. If not found, return 404. 3. For seller
     *   callers: join shopping_mall_products to verify the product's
     *   shopping_mall_seller_id matches the caller's seller ID. If ownership
     *   does not match, return 403. 4. Query
     *   shopping_mall_product_snapshot_images by the given imageId AND where
     *   product_snapshot_id = snapshotId. If not found (either the imageId does
     *   not exist or does not belong to the specified snapshot), return 404. 5.
     *   Return the full image record including: id, product_snapshot_id, url,
     *   sequence, and created_at. 6. No pagination or filtering is needed as
     *   this returns a single record.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":imageId")
  public async at(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("snapshotId")
    snapshotId: string & tags.Format<"uuid">,
    @TypedParam("imageId")
    imageId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallProductSnapshotImage> {
    try {
      return await getShoppingMallAdminSnapshotsSnapshotIdImagesImageId({
        admin,
        snapshotId,
        imageId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
