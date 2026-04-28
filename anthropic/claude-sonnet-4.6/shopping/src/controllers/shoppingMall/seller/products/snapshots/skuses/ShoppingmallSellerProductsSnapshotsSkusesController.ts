import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIShoppingMallProductSnapshotSkus } from "../../../../../../api/structures/IPageIShoppingMallProductSnapshotSkus";
import { IShoppingMallProductSnapshotSkus } from "../../../../../../api/structures/IShoppingMallProductSnapshotSkus";
import { SellerAuth } from "../../../../../../decorators/SellerAuth";
import { SellerPayload } from "../../../../../../decorators/payload/SellerPayload";
import { getShoppingMallSellerProductsProductIdSnapshotsSnapshotIdSkusesSkuId } from "../../../../../../providers/getShoppingMallSellerProductsProductIdSnapshotsSnapshotIdSkusesSkuId";
import { patchShoppingMallSellerProductsProductIdSnapshotsSnapshotIdSkuses } from "../../../../../../providers/patchShoppingMallSellerProductsProductIdSnapshotsSnapshotIdSkuses";

@Controller(
  "/shoppingMall/seller/products/:productId/snapshots/:snapshotId/skuses",
)
export class ShoppingmallSellerProductsSnapshotsSkusesController {
  /**
   * Retrieve a paginated and filterable list of product snapshot SKU records captured under a specific product snapshot.
   *
   * This operation returns all `shopping_mall_product_snapshot_skuses` records that belong to the specified product snapshot (`snapshotId`) of the given product (`productId`). Each ProductSnapshotSKU is an immutable, frozen record that preserves the exact state of a product variant — including its SKU code, price, and complete set of option key-value pairs (stored in `shopping_mall_product_snapshot_skus_options`) — at the moment the parent snapshot was created.
   *
   * Product snapshots are created automatically by the system whenever a seller edits any editable field of a product (name, description, category, base price, images, or variant configurations). Each snapshot captures a complete, self-contained picture of the product at that point in time. The SKU records within a snapshot represent every variant that existed at the moment the snapshot was taken, including variants that may have been subsequently deleted. Once created, these records are immutable and cannot be modified or deleted by any party.
   *
   * Access control is enforced as follows: sellers may only list snapshot SKUs for snapshots belonging to products they own. Administrators (admin and superAdmin) may access snapshot SKUs for any product on the platform, including products that have been deleted, enabling full historical audit capability. Customers and guests do not have access to this endpoint.
   *
   * The request body supports optional search and filter criteria such as partial SKU code matching, price range filtering, and option key-value pair filtering. Results are returned in a paginated format with configurable page size and sorting options (e.g., by SKU code, price, or creation timestamp).
   *
   * Before calling this operation, use `PATCH /products/{productId}/snapshots` to retrieve the list of available snapshots for a product, and `GET /products/{productId}/snapshots/{snapshotId}` to retrieve the full details of a specific snapshot including its SKU list context.
   *
   * @param connection
   * @param productId The UUID of the target product whose snapshot SKU records are being retrieved.
   * @param snapshotId The UUID of the target product snapshot under which the SKU records are listed.
   * @param body Search criteria and pagination parameters for filtering the list of product snapshot SKU records.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor seller
     * @x-autobe-specification 1. Validate productId: query
     *   shopping_mall_products by id. If not found (or deleted_at is not null
     *   and caller is not admin), return 404. 2. Validate snapshotId: query
     *   shopping_mall_product_snapshots where id = snapshotId AND product_id =
     *   productId. If not found, return 404. 3. Authorization: If caller is a
     *   seller, verify that shopping_mall_product_snapshots.product_id
     *   references a product owned by the authenticated seller
     *   (shopping_mall_products.shopping_mall_seller_id). If caller is admin or
     *   superAdmin, allow access to any product's snapshots, including deleted
     *   products. Customers and guests do not have access. 4. Query
     *   shopping_mall_product_snapshot_skuses where product_snapshot_id =
     *   snapshotId. 5. Apply optional filters from the request body (e.g.,
     *   sku_code partial match, price range, option key/value filters). 6.
     *   Apply pagination (page number, page size) and optional sorting (by
     *   sku_code, price, created_at). 7. For each result, eager-load the child
     *   shopping_mall_product_snapshot_skus_options records ordered by
     *   sequence. 8. Return the paginated result set wrapped in an IPage
     *   structure containing pagination metadata (total count, current page,
     *   page size) and the data array of ISummary objects. 9. Edge case: if the
     *   product snapshot has no SKU records, return an empty paginated result
     *   without error.
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
    @TypedBody()
    body: IShoppingMallProductSnapshotSkus.IRequest,
  ): Promise<IPageIShoppingMallProductSnapshotSkus.ISummary> {
    try {
      return await patchShoppingMallSellerProductsProductIdSnapshotsSnapshotIdSkuses(
        {
          seller,
          productId,
          snapshotId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a specific product snapshot SKU record by its identifier within a product snapshot.
   *
   * This endpoint returns the full detail of a single `shopping_mall_product_snapshot_skuses` record, including all associated option key-value pairs stored in the `shopping_mall_product_snapshot_skus_options` child table. The record is a frozen, immutable capture of a specific product variant's state — including its SKU code, price, and complete option combination (e.g., color: red, size: XL) — at the exact moment the parent product snapshot was taken.
   *
   * The `shopping_mall_product_snapshot_skuses` table stores one record per variant that existed at the moment a parent `shopping_mall_product_snapshots` record was created. Once created, these records are never modified or deleted. The `product_variant_id` field is nullable because the originating variant may have been deleted after the snapshot was taken, but the SKU record itself is always preserved for historical integrity.
   *
   * Access to this endpoint is restricted based on actor role. Sellers may only retrieve snapshot SKU records belonging to their own products; attempting to access a snapshot SKU for a product owned by another seller will result in a denial. Administrators may retrieve snapshot SKU records for any product on the platform, regardless of ownership or whether the parent product has been deleted — this unrestricted access supports platform-wide oversight, dispute resolution, and compliance review. Customers do not have access to product snapshot SKU records under any circumstances.
   *
   * This endpoint is typically used in conjunction with `GET /products/{productId}/snapshots/{snapshotId}` to browse the full snapshot detail, and the result from this endpoint provides granular variant-level historical data. The path hierarchy — product → snapshot → SKU — must all be consistent: the specified snapshot must belong to the specified product, and the specified SKU must belong to the specified snapshot; otherwise the request is rejected.
   *
   * @param connection
   * @param productId The UUID of the product that owns the snapshot. Must match the product associated with the target snapshot.
   * @param snapshotId The UUID of the product snapshot that contains the target SKU record. Must belong to the specified product.
   * @param skuId The UUID of the specific product snapshot SKU record to retrieve. Must belong to the specified snapshot.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor seller
     * @x-autobe-specification 1. Validate the productId path parameter: look up
     *   shopping_mall_products by id. If not found (including permanently
     *   deleted products where snapshot records may still exist), check whether
     *   snapshots remain under that product_id in
     *   shopping_mall_product_snapshots (product_id is nullable but the route
     *   productId must match). For deleted products, administrators may still
     *   access snapshots; sellers may not. 2. Validate the snapshotId: look up
     *   shopping_mall_product_snapshots by id WHERE product_id = productId (or
     *   product_id IS NULL for deleted-product snapshots; use the snapshot's
     *   own product_id reference). Confirm the snapshot actually belongs to the
     *   given product. Return 404 if not found or mismatched. 3. Validate the
     *   skuId: look up shopping_mall_product_snapshot_skuses by id WHERE
     *   product_snapshot_id = snapshotId. Return 404 if not found or
     *   mismatched. 4. Authorization check: - If caller is a seller: verify
     *   that shopping_mall_products.shopping_mall_seller_id matches the
     *   authenticated seller's id. If the product is deleted, deny access. If
     *   the snapshot's product_id does not match or the seller does not own the
     *   product, return 403. - If caller is admin or superAdmin: allow access
     *   unconditionally, including for deleted products. - If caller is
     *   customer or guest: deny access with 403. 5. Load the
     *   shopping_mall_product_snapshot_skuses record and eagerly join
     *   shopping_mall_product_snapshot_skus_options (ordered by sequence ASC)
     *   to reconstruct the full option combination. 6. Return the composed
     *   IShoppingMallProductSnapshotSku response including: id,
     *   product_snapshot_id, product_variant_id (nullable), sku_code, price,
     *   created_at, and options array (each with id, sequence, key, value).
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":skuId")
  public async at(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("productId")
    productId: string & tags.Format<"uuid">,
    @TypedParam("snapshotId")
    snapshotId: string & tags.Format<"uuid">,
    @TypedParam("skuId")
    skuId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallProductSnapshotSkus> {
    try {
      return await getShoppingMallSellerProductsProductIdSnapshotsSnapshotIdSkusesSkuId(
        {
          seller,
          productId,
          snapshotId,
          skuId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
