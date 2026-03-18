import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIShoppingMallInventoryRecord } from "../../../../../api/structures/IPageIShoppingMallInventoryRecord";
import { IShoppingMallInventoryRecord } from "../../../../../api/structures/IShoppingMallInventoryRecord";
import { SellerAuth } from "../../../../../decorators/SellerAuth";
import { SellerPayload } from "../../../../../decorators/payload/SellerPayload";
import { getShoppingMallSellerProductVariantsProductVariantIdInventoryRecordsInventoryRecordId } from "../../../../../providers/getShoppingMallSellerProductVariantsProductVariantIdInventoryRecordsInventoryRecordId";
import { patchShoppingMallSellerProductVariantsProductVariantIdInventoryRecords } from "../../../../../providers/patchShoppingMallSellerProductVariantsProductVariantIdInventoryRecords";

@Controller(
  "/shoppingMall/seller/productVariants/:productVariantId/inventoryRecords",
)
export class ShoppingmallSellerProductvariantsInventoryrecordsController {
  /**
   * Retrieve or record inventory movement history for a specific product variant.
   *
   * This operation is scoped to one purchasable product variant and is used to inspect the stock movement trail that belongs to that variant. The underlying inventory record table stores each atomic movement as a signed quantity change, a business reason, and the timestamp when the movement occurred. The variant table stores the current stock quantity and links the history entries to the exact variant that received the movement.
   *
   * The response is intended for sellers managing stock and for administrators who need oversight of inventory history. It should be used together with the product variant detail operations because the variant resource provides the current stock position, while this endpoint provides the chronological movement history that explains how that stock position was reached. The history should be ordered by the business event time and must preserve the immutable audit trail for review and accountability.
   *
   * When recording a new inventory movement through this endpoint, the service must validate that the signed quantity change is consistent with the business reason and that the target variant exists and belongs to an accessible product. The service should create a new inventory record, update the variant's stored stock quantity atomically, and reject any request that would drive the stock below an allowed limit if such validation is enforced by the business rules. If the request is only for browsing, the endpoint should return a paginated result set without modifying data.
   *
   * Because inventory records are append-only history entries, updates to existing history rows should not be exposed here. Any correction should be represented as a new movement record so that the historical trail remains intact. Related flows such as order placement, cancellation, and refund processing may also create inventory movements elsewhere in the system, and this endpoint should surface those records as part of the full variant stock history.
   *
   * @param connection
   * @param productVariantId Target product variant ID.
   * @param body Inventory history filters, pagination, and optional movement data for the selected product variant.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor seller
   * @x-autobe-specification Implement a variant-scoped inventory history endpoint backed by shopping_mall_inventory_records and shopping_mall_product_variants.
   *
   * 1. Resolve the target variant by productVariantId and ensure it exists.
   * 2. Enforce authorization so that the owning seller can access and manage the history; allow administrator read access if platform policy requires oversight.
   * 3. For query use cases, load inventory records filtered by shopping_mall_product_variant_id, ordered primarily by occurred_at descending and secondarily by created_at descending for stable pagination.
   * 4. Support pagination, optional reason search, and occurred_at range filtering through the request body. Return a paginated page type with summary/history entries.
   * 5. If the request includes a new movement command, validate quantity_change as a signed integer, validate reason as a non-empty business explanation, and require occurred_at when the movement time must be explicit.
   * 6. Insert the new inventory record in a transaction and update shopping_mall_product_variants.stock_quantity by the same delta atomically so the current stock remains consistent with the history trail.
   * 7. Prevent partial updates: if the insert or stock update fails, roll back both operations.
   * 8. Reject requests that reference a missing variant, violate ownership/access control, or contain invalid pagination/filter values.
   * 9. Do not expose direct edits or deletions of existing inventory records from this endpoint; preserve the movement history as immutable operational evidence.
   * 10. The DTO for results should represent inventory record summaries or page data suitable for stock history browsing, while any create-capable request should only include fields present in the inventory record schema and pagination/filter fields needed for list retrieval.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("productVariantId")
    productVariantId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallInventoryRecord.IRequest,
  ): Promise<IPageIShoppingMallInventoryRecord.ISummary> {
    try {
      return await patchShoppingMallSellerProductVariantsProductVariantIdInventoryRecords(
        {
          seller,
          productVariantId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single inventory history entry for a specific product variant.
   *
   * An inventory record is a stock history entry for one product variant. It preserves the business history of how that variant’s stock changed over time and provides a clear trail for review and accountability. This operation returns one exact record by its identifier within the scope of the specified product variant, allowing callers to inspect the quantity change, the reason for the movement, and the timestamp when the change was recorded.
   *
   * This endpoint is intended for the seller who owns the product variant and for administrators who need to review inventory movement history. The record must belong to the product variant identified in the path; if the record does not exist in that variant’s inventory history, the request must be rejected as not found. The data returned by this endpoint is read-only and represents historical movement information, not the current stock value itself.
   *
   * Current stock for a variant is derived from the full sequence of inventory history records for that variant. For that reason, this endpoint is typically used together with product variant detail views and inventory history list endpoints when callers need to understand how the current stock position was formed. It does not modify stock, create movements, or recalculate inventory; it only exposes the stored movement entry in detail.
   *
   * @param connection
   * @param productVariantId Target product variant's ID.
   * @param inventoryRecordId Target inventory record's ID within the specified variant.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor seller
   * @x-autobe-specification Load the inventory record by inventoryRecordId and ensure it belongs to the productVariantId provided in the path.
   * Use a join or scoped lookup that filters by both identifiers so cross-variant access is impossible.
   * If the record is missing, or if it belongs to a different variant, return not found.
   * Do not compute stock here; the endpoint is a pure read of a single immutable history row.
   * Authorize access for the owning seller of the product variant and administrators only.
   * Return the full inventory record payload including quantity change, reason, and timestamp fields defined by the schema.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":inventoryRecordId")
  public async at(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("productVariantId")
    productVariantId: string & tags.Format<"uuid">,
    @TypedParam("inventoryRecordId")
    inventoryRecordId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallInventoryRecord> {
    try {
      return await getShoppingMallSellerProductVariantsProductVariantIdInventoryRecordsInventoryRecordId(
        {
          seller,
          productVariantId,
          inventoryRecordId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
