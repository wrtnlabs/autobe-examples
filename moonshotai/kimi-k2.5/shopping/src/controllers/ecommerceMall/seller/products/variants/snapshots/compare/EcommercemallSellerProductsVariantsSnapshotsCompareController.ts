import { TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia from "typia";

import { IEcommerceMallProductVariantSnapshot } from "../../../../../../../api/structures/IEcommerceMallProductVariantSnapshot";
import { SellerAuth } from "../../../../../../../decorators/SellerAuth";
import { SellerPayload } from "../../../../../../../decorators/payload/SellerPayload";
import { getEcommerceMallSellerProductsProductIdVariantsVariantIdSnapshotsSnapshotIdCompareOtherSnapshotId } from "../../../../../../../providers/getEcommerceMallSellerProductsProductIdVariantsVariantIdSnapshotsSnapshotIdCompareOtherSnapshotId";

@Controller(
  "/ecommerceMall/seller/products/:productId/variants/:variantId/snapshots/:snapshotId/compare/:otherSnapshotId",
)
export class EcommercemallSellerProductsVariantsSnapshotsCompareController {
  /**
   * Compare two variant snapshots to identify what changed between them.
   *
   * This operation allows authorized users to compare the state of a product variant at two different points in time. The comparison reveals which fields differed between the two snapshots and displays the before/after values for each changed field.
   *
   * Variant snapshots are immutable records created automatically whenever a seller edits variant details including SKU code, option values, variant-specific price, or stock quantity. Each snapshot preserves the complete state of the variant at that moment, including timestamp and all field values.
   *
   * Authorization:
   * - Sellers can compare snapshots of variants belonging to their own products
   * - Administrators can compare snapshots of any variant on the platform
   * - The permission check validates that both snapshots belong to the specified variantId, which belongs to the specified productId
   * - Access is denied if the requesting user is neither the product owner seller nor an administrator
   *
   * The comparison result organizes changes by field type:
   * - SKU code changes: Shows old and new SKU values
   * - Option value changes: Lists added, removed, or modified option values
   * - Price changes: Displays price differences including currency formatting
   * - Stock quantity: Shows inventory level changes (snapshot records quantity at that moment)
   *
   * Snapshots are immutable and cannot be modified after creation, ensuring the comparison reflects accurate historical data. The comparison is useful for:
   * - Tracking pricing changes over time
   * - Auditing SKU code modifications
   * - Reviewing option value updates
   * - Dispute resolution by showing exactly what changed and when
   *
   * @param connection
   * @param productId Unique identifier of the product (global scope)
   * @param variantId Unique identifier of the product variant having snapshots (scoped to product)
   * @param snapshotId Unique identifier of the first variant snapshot being compared (scoped to variant)
   * @param otherSnapshotId Unique identifier of the second variant snapshot being compared (scoped to variant)
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor seller
   * @x-autobe-specification Implementation requires validating authorization and fetching both snapshots from the database:
   *
   * 1. Authorization Validation:
   *    - Verify requesting user is authenticated
   *    - If user is a seller: verify product.sellerId matches requesting seller.id
   *    - If user is an administrator: allow comparison for any variant
   *    - Reject with 403 Forbidden if unauthorized
   *
   * 2. Snapshot Retrieval:
   *    - Fetch both snapshots using their IDs
   *    - Verify snapshotId belongs to the specified variantId
   *    - Verify otherSnapshotId belongs to the same variantId
   *    - Verify both snapshots belong to a variant that belongs to the specified productId
   *    - Return 404 Not Found if either snapshot doesn't exist or doesn't belong to the specified variant
   *
   * 3. Comparison Logic:
   *    - Load snapshot data including: sku_code, price, option_values (key-value pairs), created_at
   *    - Compare each field:
   *      - skuCode: string comparison
   *      - price: numeric comparison with format showing before/after
   *      - optionValues: compare each key-value pair, identify added, removed, changed
   *      - createdAt: include both timestamps for temporal context
   *    - Sort comparison results by field name for consistent output
   *
   * 4. Database Schema Involved:
   *    - ecommerce_mall_products (for ownership verification)
   *    - ecommerce_mall_product_variants (for variant-parent relationship)
   *    - ecommerce_mall_product_variant_snapshots (for snapshot data)
   *
   * 5. Response Construction:
   *    - Include both snapshot IDs and their creation timestamps
   *    - Include an array of differences, each with: field name, old value, new value
   *    - Handle special formatting for option values (object comparison)
   *    - Return empty differences array if snapshots are identical (rare but possible)
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get()
  public async compareSnapshots(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("productId")
    productId: string,
    @TypedParam("variantId")
    variantId: string,
    @TypedParam("snapshotId")
    snapshotId: string,
    @TypedParam("otherSnapshotId")
    otherSnapshotId: string,
  ): Promise<IEcommerceMallProductVariantSnapshot.ISnapshotCompare> {
    try {
      return await getEcommerceMallSellerProductsProductIdVariantsVariantIdSnapshotsSnapshotIdCompareOtherSnapshotId(
        {
          seller,
          productId,
          variantId,
          snapshotId,
          otherSnapshotId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
