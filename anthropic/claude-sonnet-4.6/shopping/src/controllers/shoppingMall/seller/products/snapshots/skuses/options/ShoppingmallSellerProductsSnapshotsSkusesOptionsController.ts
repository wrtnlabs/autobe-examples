import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIShoppingMallProductSnapshotSkusOption } from "../../../../../../../api/structures/IPageIShoppingMallProductSnapshotSkusOption";
import { IShoppingMallProductSnapshotSkusOption } from "../../../../../../../api/structures/IShoppingMallProductSnapshotSkusOption";
import { SellerAuth } from "../../../../../../../decorators/SellerAuth";
import { SellerPayload } from "../../../../../../../decorators/payload/SellerPayload";
import { getShoppingMallSellerProductsProductIdSnapshotsSnapshotIdSkusesSkuIdOptionsOptionId } from "../../../../../../../providers/getShoppingMallSellerProductsProductIdSnapshotsSnapshotIdSkusesSkuIdOptionsOptionId";
import { patchShoppingMallSellerProductsProductIdSnapshotsSnapshotIdSkusesSkuIdOptions } from "../../../../../../../providers/patchShoppingMallSellerProductsProductIdSnapshotsSnapshotIdSkusesSkuIdOptions";

@Controller(
  "/shoppingMall/seller/products/:productId/snapshots/:snapshotId/skuses/:skuId/options",
)
export class ShoppingmallSellerProductsSnapshotsSkusesOptionsController {
  /**
   * Retrieve a paginated and filtered list of option key-value pairs belonging to a specific product snapshot SKU record.
   *
   * This operation returns the complete set of option entries (e.g., 'color: red', 'size: XL', 'material: cotton') captured within a single `shopping_mall_product_snapshot_skuses` record at snapshot creation time. Each option entry (`shopping_mall_product_snapshot_skus_options`) stores an immutable key-value pair that describes one dimension of the variant's configuration as it existed when the parent product snapshot was taken.
   *
   * The options are ordered by their `sequence` field so that the complete variant option combination is consistently reconstructed and presented in the intended display order. The `key` field identifies the option dimension (e.g., 'color'), and the `value` field holds the specific selection for that dimension (e.g., 'red') at the time the snapshot was recorded.
   *
   * These records are strictly immutable. They are created atomically alongside the parent `shopping_mall_product_snapshot_skuses` and `shopping_mall_product_snapshots` records at the moment a seller edits a product or an order is placed. No user — including sellers, administrators, or the system — may modify or remove these records after their creation, ensuring that the historical variant configuration is permanently trustworthy.
   *
   * Access is restricted: only the seller who owns the product referenced by `productId` and platform administrators may call this endpoint. The `productId`, `snapshotId`, and `skuId` path parameters must form a valid ownership chain (the snapshot must belong to the product and the SKU record must belong to the snapshot), otherwise the request is rejected with a 404 or 403 error.
   *
   * This operation is useful for dispute resolution, audit by administrators, and seller review of historical variant configurations. It is typically preceded by listing product snapshots via `PATCH /products/{productId}/snapshots` to identify the target snapshot, then listing snapshot SKUs via `PATCH /products/{productId}/snapshots/{snapshotId}/skuses` to identify the target SKU record, before calling this endpoint to retrieve the granular option details.
   *
   * @param connection
   * @param productId The UUID of the product that owns the target snapshot. Used to verify ownership and scope the request.
   * @param snapshotId The UUID of the product snapshot that contains the target snapshot SKU record. Must belong to the specified product.
   * @param skuId The UUID of the product snapshot SKU record whose option entries are to be listed. Must belong to the specified snapshot.
   * @param body Optional search and pagination criteria for filtering the snapshot SKU option list by key or value, with configurable page size and ordering.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor seller
     * @x-autobe-specification 1. Validate the productId path parameter —
     *   confirm a `shopping_mall_products` record with this UUID exists. If the
     *   caller is a seller, confirm they are the owner. If not found or
     *   unauthorized, return 403/404. 2. Validate snapshotId — confirm a
     *   `shopping_mall_product_snapshots` record with this UUID exists and its
     *   `product_id` matches the given productId. Return 404 if not found or
     *   mismatched. 3. Validate skuId — confirm a
     *   `shopping_mall_product_snapshot_skuses` record with this UUID exists
     *   and its `product_snapshot_id` matches the given snapshotId. Return 404
     *   if not found or mismatched. 4. Query
     *   `shopping_mall_product_snapshot_skus_options` WHERE
     *   `product_snapshot_skus_id` = skuId. 5. Apply optional filters from the
     *   request body: - Filter by `key` using trigram partial matching (GIN
     *   index on `key` column supports this). - Filter by `value` using trigram
     *   partial matching (GIN index on `value` column supports this). 6. Order
     *   results by `sequence` ASC (default, to reconstruct display order), with
     *   pagination applied via `limit` and `page` from the request body. 7.
     *   Return a paginated result object containing the matched option records
     *   with their id, sequence, key, and value fields. 8. No write operations
     *   are permitted; this is a read-only endpoint.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("productId")
    productId: string & tags.Format<"uuid">,
    @TypedParam("snapshotId")
    snapshotId: string & tags.Format<"uuid">,
    @TypedParam("skuId")
    skuId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallProductSnapshotSkusOption.IRequest,
  ): Promise<IPageIShoppingMallProductSnapshotSkusOption> {
    try {
      return await patchShoppingMallSellerProductsProductIdSnapshotsSnapshotIdSkusesSkuIdOptions(
        {
          seller,
          productId,
          snapshotId,
          skuId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve the full detail of a single option key-value pair belonging to a product snapshot SKU.
   *
   * Product snapshot SKU options (shopping_mall_product_snapshot_skus_options) are the leaf-level records of the product snapshot hierarchy. Each option record captures one dimension of a variant's configuration — for example, `key: 'color', value: 'red'` or `key: 'size', value: 'XL'` — as it existed at the exact moment the parent product snapshot was created. Together, all option records for a given snapshot SKU reconstruct the complete option combination that identified the variant at snapshot time.
   *
   * This endpoint traverses the full four-level hierarchy: product → snapshot → snapshot SKU → option. All four path parameters must match their respective parent-child relationships, or a 404 error is returned. This strict hierarchy validation prevents cross-product or cross-snapshot data leakage.
   *
   * The returned option record is immutable historical data. Once created as part of a product snapshot, option records are never updated or removed, ensuring that the historical record for order items, dispute resolution, and audit purposes remains trustworthy and tamper-proof.
   *
   * Access to this endpoint is restricted exclusively to the seller who owns the product. A seller can only access snapshot option data for products they own; attempting to access another seller's product snapshot data will result in a 403 or 404 error. Administrator access to product snapshots is provided through separate platform-wide admin-scoped endpoints.
   *
   * This endpoint is typically used in the context of reviewing an order, investigating a customer dispute, or auditing a historical transaction. To navigate to a specific option, callers should first retrieve the list of snapshots via `PATCH /shoppingMall/seller/products/{productId}/snapshots`, then retrieve the specific snapshot SKU list via `PATCH /shoppingMall/seller/products/{productId}/snapshots/{snapshotId}/skuses`, then retrieve the option list via `PATCH /shoppingMall/seller/products/{productId}/snapshots/{snapshotId}/skuses/{skuId}/options`, and finally use this endpoint to access an individual option's full detail.
   *
   * @param connection
   * @param productId The UUID of the product whose snapshot hierarchy is being accessed.
   * @param snapshotId The UUID of the product snapshot that contains the target SKU.
   * @param skuId The UUID of the product snapshot SKU record that owns this option.
   * @param optionId The UUID of the specific option key-value pair to retrieve.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor seller
     * @x-autobe-specification Retrieve a single option record from the
     *   shopping_mall_product_snapshot_skus_options table.
   *
   * 1. Validate that a product record exists in shopping_mall_products with id = productId. If not found, return 404.
   * 2. Validate that a snapshot record exists in shopping_mall_product_snapshots with id = snapshotId AND product_id = productId. If not found or mismatched, return 404.
   * 3. Validate that a snapshot SKU record exists in shopping_mall_product_snapshot_skuses with id = skuId AND product_snapshot_id = snapshotId. If not found or mismatched, return 404.
   * 4. Validate that an option record exists in shopping_mall_product_snapshot_skus_options with id = optionId AND product_snapshot_skus_id = skuId. If not found or mismatched, return 404.
   * 5. Return the full option record including: id, product_snapshot_skus_id, sequence, key, value.
   *
   * Authorization rules:
   * - Sellers may only access snapshots that belong to their own products (verify shopping_mall_products.shopping_mall_seller_id matches the authenticated seller).
   * - Admins may access option records for any product snapshot on the platform.
   * - No write access is permitted on this or any other snapshot sub-resource; snapshot data is fully immutable.
   *
   * No pagination or filtering is needed — this is a point lookup by primary key within a fully specified hierarchy.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":optionId")
  public async at(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("productId")
    productId: string & tags.Format<"uuid">,
    @TypedParam("snapshotId")
    snapshotId: string & tags.Format<"uuid">,
    @TypedParam("skuId")
    skuId: string & tags.Format<"uuid">,
    @TypedParam("optionId")
    optionId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallProductSnapshotSkusOption> {
    try {
      return await getShoppingMallSellerProductsProductIdSnapshotsSnapshotIdSkusesSkuIdOptionsOptionId(
        {
          seller,
          productId,
          snapshotId,
          skuId,
          optionId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
