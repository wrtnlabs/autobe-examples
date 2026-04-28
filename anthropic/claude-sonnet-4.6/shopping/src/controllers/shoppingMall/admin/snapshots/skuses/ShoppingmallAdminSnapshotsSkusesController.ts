import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIShoppingMallProductSnapshotSkus } from "../../../../../api/structures/IPageIShoppingMallProductSnapshotSkus";
import { IShoppingMallProductSnapshotSkus } from "../../../../../api/structures/IShoppingMallProductSnapshotSkus";
import { AdminAuth } from "../../../../../decorators/AdminAuth";
import { AdminPayload } from "../../../../../decorators/payload/AdminPayload";
import { getShoppingMallAdminSnapshotsSnapshotIdSkusesSkuId } from "../../../../../providers/getShoppingMallAdminSnapshotsSnapshotIdSkusesSkuId";
import { patchShoppingMallAdminSnapshotsSnapshotIdSkuses } from "../../../../../providers/patchShoppingMallAdminSnapshotsSnapshotIdSkuses";

@Controller("/shoppingMall/admin/snapshots/:snapshotId/skuses")
export class ShoppingmallAdminSnapshotsSkusesController {
  /**
   * Retrieve a paginated and filterable list of product snapshot SKU records belonging to a specific product snapshot.
   *
   * This operation returns the variant states captured at the exact moment the parent product snapshot (`shopping_mall_product_snapshots`) was taken. Each result entry corresponds to a `shopping_mall_product_snapshot_skuses` record — a frozen, immutable point-in-time representation of a product variant that existed when the snapshot was created. The records include the variant's SKU code, its price at snapshot time (either the variant's own override price or the product's base price), a nullable reference back to the originating variant, and the creation timestamp.
   *
   * Each snapshot SKU also carries a nested collection of option key-value pairs (`shopping_mall_product_snapshot_skus_options`), such as `color: red` or `size: XL`, which together reconstruct the full variant configuration as it was recorded. These option records are ordered by their `sequence` field and are likewise immutable.
   *
   * Access to this endpoint is restricted to the seller who owns the product whose snapshot is being queried, and to platform administrators. Customers do not have direct access to snapshot internals; they may view product state only through order history or product detail views.
   *
   * The endpoint supports filtering by SKU code (partial match), price range, and option key-value pairs, allowing consumers to narrow down the variant list within a specific historical snapshot. Pagination is provided to handle snapshots with large variant lineups.
   *
   * As these records are immutable — created once and never modified or deleted — there is no concern about race conditions or data freshness. The snapshot represents a guaranteed complete and consistent record of all variants as they existed at a single atomic point in time.
   *
   * Related operations:
   * - `GET /snapshots/{snapshotId}` must be pre-executed or independently known to obtain the `snapshotId` required by this endpoint.
   * - `GET /products/{productId}/snapshots` can be used to list all snapshots for a given product, from which a specific `snapshotId` can be selected.
   *
   * @param connection
   * @param snapshotId The UUID of the target product snapshot whose SKU records are to be retrieved.
   * @param body Filtering criteria and pagination parameters for the snapshot SKU list.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor admin
     * @x-autobe-specification 1. Validate that the `snapshotId` path parameter
     *   corresponds to an existing `shopping_mall_product_snapshots` record. If
     *   not found, return 404. 2. Authorization check: verify that the
     *   requesting actor is either (a) the seller who owns the product
     *   referenced by the snapshot (via
     *   `shopping_mall_product_snapshots.product_id` →
     *   `shopping_mall_products.shopping_mall_seller_id`), or (b) an
     *   administrator (admin or superAdmin). If unauthorized, return 403. 3.
     *   Query `shopping_mall_product_snapshot_skuses` where
     *   `product_snapshot_id = snapshotId`. 4. Apply optional filters from the
     *   request body: - `skuCode`: partial text match against `sku_code` using
     *   trigram index. - `minPrice` / `maxPrice`: filter on the `price` field.
     *   - Option key/value filters: join with
     *   `shopping_mall_product_snapshot_skus_options` and filter by `key`
     *   and/or `value` using trigram indexes. 5. Apply pagination using `limit`
     *   and `offset` (or cursor) from the request body. Default page size
     *   should be a reasonable value (e.g., 20). 6. For each matching snapshot
     *   SKU, eager-load its `shopping_mall_product_snapshot_skus_options`
     *   records, ordered by `sequence` ascending. 7. Return the paginated
     *   result as `IPageIShoppingMallProductSnapshotSkus.ISummary`, including a
     *   `pagination` metadata object (total count, current page, limit) and a
     *   `data` array of snapshot SKU summaries. 8. No mutation of records
     *   occurs; this is a read-only operation. 9. Edge cases: if the referenced
     *   product has been deleted (product_id is null on the snapshot), still
     *   return the snapshot SKU data as these records are retained permanently
     *   regardless of product deletion.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("snapshotId")
    snapshotId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallProductSnapshotSkus.IRequest,
  ): Promise<IPageIShoppingMallProductSnapshotSkus.ISummary> {
    try {
      return await patchShoppingMallAdminSnapshotsSnapshotIdSkuses({
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
   * Retrieve the full detail of a single product snapshot SKU record, scoped under a specific product snapshot.
   *
   * This operation returns the complete detail of a `shopping_mall_product_snapshot_skuses` record — an immutable, frozen representation of a product variant as it existed at the exact moment the parent `shopping_mall_product_snapshots` record was created. The snapshot SKU captures the variant's SKU code (`sku_code`), price at snapshot time (`price`), a nullable back-reference to the originating `shopping_mall_product_variants` record (which may be null if the variant was subsequently deleted), and the creation timestamp (`created_at`).
   *
   * The response also includes the full set of option key-value pairs from `shopping_mall_product_snapshot_skus_options` — for example, `color: red` or `size: XL` — which together reconstruct the complete variant option combination as it existed at snapshot time. Options are ordered by their `sequence` field (ascending).
   *
   * Access to this endpoint is restricted to administrators only. Both regular administrators and super administrators may retrieve snapshot SKU records for any product on the platform, regardless of which seller originally created the product or whether the product has since been deleted. This unrestricted administrative access supports platform-wide oversight, dispute resolution, and compliance review as described in the platform's snapshot access control policy.
   *
   * Customers, guests, and sellers do not have access to snapshot SKU records through this endpoint. Any such request will be denied.
   *
   * Because `shopping_mall_product_snapshot_skuses` records are immutable by design, the data returned by this endpoint represents a permanent historical record. Once a snapshot SKU is created, its `sku_code`, `price`, and all associated options from `shopping_mall_product_snapshot_skus_options` are never modified or deleted, regardless of any subsequent changes to the original product variant.
   *
   * To obtain the parent snapshot record and its full context (product name, description, base price, category, and the list of all sibling SKUs), use the corresponding parent snapshot retrieval endpoint `GET /shoppingMall/admin/snapshots/{snapshotId}` first.
   *
   * @param connection
   * @param snapshotId The UUID of the parent product snapshot that contains this SKU record.
   * @param skuId The UUID of the target product snapshot SKU record to retrieve.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor admin
     * @x-autobe-specification 1. Validate that the snapshotId path parameter is
     *   a valid UUID and that the corresponding shopping_mall_product_snapshots
     *   record exists. If not found, return 404. 2. Validate that the skuId
     *   path parameter is a valid UUID and that the corresponding
     *   shopping_mall_product_snapshot_skuses record exists with
     *   product_snapshot_id matching the given snapshotId. If the SKU does not
     *   exist or does not belong to the specified snapshot, return 404. 3.
     *   Authorization check: if the caller is a seller, verify that the parent
     *   product_snapshot's product belongs to the authenticated seller. If not,
     *   return 403. If the caller is an admin or super admin, allow access
     *   unconditionally. 4. Fetch the shopping_mall_product_snapshot_skuses
     *   record by skuId, including a JOIN or eager-load of its
     *   shopping_mall_product_snapshot_skus_options records, ordered by
     *   sequence ASC. 5. Return the assembled DTO
     *   (IShoppingMallProductSnapshotSkus) containing: id, product_snapshot_id,
     *   product_variant_id (nullable), sku_code, price, created_at, and an
     *   ordered array of options (each with id, key, value, sequence).
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":skuId")
  public async at(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("snapshotId")
    snapshotId: string & tags.Format<"uuid">,
    @TypedParam("skuId")
    skuId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallProductSnapshotSkus> {
    try {
      return await getShoppingMallAdminSnapshotsSnapshotIdSkusesSkuId({
        admin,
        snapshotId,
        skuId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
