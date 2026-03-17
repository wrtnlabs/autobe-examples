import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIShoppingMallProductPurchaseSnapshotOptionValue } from "../../../../../../../api/structures/IPageIShoppingMallProductPurchaseSnapshotOptionValue";
import { IShoppingMallProductPurchaseSnapshotOptionValue } from "../../../../../../../api/structures/IShoppingMallProductPurchaseSnapshotOptionValue";
import { CustomerAuth } from "../../../../../../../decorators/CustomerAuth";
import { CustomerPayload } from "../../../../../../../decorators/payload/CustomerPayload";
import { getShoppingMallCustomerOrdersOrderIdItemsItemIdProductPurchaseSnapshotsProductPurchaseSnapshotIdOptionValuesOptionValueId } from "../../../../../../../providers/getShoppingMallCustomerOrdersOrderIdItemsItemIdProductPurchaseSnapshotsProductPurchaseSnapshotIdOptionValuesOptionValueId";
import { patchShoppingMallCustomerOrdersOrderIdItemsItemIdProductPurchaseSnapshotsProductPurchaseSnapshotIdOptionValues } from "../../../../../../../providers/patchShoppingMallCustomerOrdersOrderIdItemsItemIdProductPurchaseSnapshotsProductPurchaseSnapshotIdOptionValues";
import { postShoppingMallCustomerOrdersOrderIdItemsItemIdProductPurchaseSnapshotsProductPurchaseSnapshotIdOptionValues } from "../../../../../../../providers/postShoppingMallCustomerOrdersOrderIdItemsItemIdProductPurchaseSnapshotsProductPurchaseSnapshotIdOptionValues";

@Controller(
  "/shoppingMall/customer/orders/:orderId/items/:itemId/productPurchaseSnapshots/:productPurchaseSnapshotId/optionValues",
)
export class ShoppingmallCustomerOrdersItemsProductpurchasesnapshotsOptionvaluesController {
  /**
   * Create a new purchase-time option value entry for a specific product purchase snapshot within an order item.
   *
   * This operation adds one normalized option name and option value pair, such as Color = Red or Size = Large, to the product purchase snapshot that freezes the catalog state actually bought by the customer. The related database model, shopping_mall_product_purchase_snapshot_option_values, exists specifically to preserve the exact selected variant option combination in one row per option key-value pair and to reconstruct that combination in stable display order for historical order detail presentation. The parent purchase snapshot, stored in shopping_mall_product_purchase_snapshots, captures the frozen product name, product description, purchased SKU code, and effective unit price applied at checkout time so that later catalog edits or deletions do not alter past order history.
   *
   * Because this resource belongs to a product purchase snapshot, which in turn belongs to shopping_mall_order_items inside shopping_mall_orders, the operation is deeply nested and must validate the entire parent chain. The supplied order identifier must resolve to the unique business order number used for lookup and history display, the itemId must identify an order item that belongs to that order, and the productPurchaseSnapshotId must identify the snapshot attached to that exact order item. The created option value becomes part of the immutable purchase-time description shown when customers, sellers, or administrators inspect historical order details.
   *
   * From a business perspective, this endpoint supports preservation of historical purchase accuracy rather than routine catalog editing. The loaded requirements state that historical purchased merchandise data must remain stable even when live product or seller information is changed or unavailable later. This operation should therefore be used during successful order placement when the platform materializes purchase-time snapshots, or in narrowly controlled administrative repair scenarios where historical completeness must be restored without changing the commercial meaning of the purchase.
   *
   * Security and validation are strict. Ordinary product editing authority is not sufficient here because this operation does not modify live catalog data; it contributes to preserved transaction history. The implementation must reject creation when the parent order, order item, or product purchase snapshot cannot be resolved consistently, and it must also reject duplicate option_name values within the same product purchase snapshot because the database enforces uniqueness for that scope. The display_order should be validated as a stable reconstruction sequence for historical presentation, and once created, downstream operations should treat the resulting purchase-time option data as preserved order evidence rather than a mutable customer-facing preference record.
   *
   * This operation is related to order creation and order item purchase snapshot construction. In a normal checkout workflow, the parent order, order item, and product purchase snapshot must already exist before this child option value is created. Historical order viewing APIs depend on this preserved snapshot structure to show the exact purchased variant configuration even when the current catalog variant no longer matches or no longer exists.
   *
   * @param connection
   * @param orderId Unique business order code in global scope.
   * @param itemId Target order item's UUID within the specified order.
   * @param productPurchaseSnapshotId Target product purchase snapshot's UUID within the specified order item.
   * @param body Creation data for a purchase snapshot option value
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification Implement creation against shopping_mall_product_purchase_snapshot_option_values as a child of shopping_mall_product_purchase_snapshots.
   *
   * 1. Resolve the parent order by shopping_mall_orders.code using the orderId path parameter, not by the orders primary key. Reject when no active matching order exists.
   * 2. Resolve the target order item by shopping_mall_order_items.id using itemId and verify shopping_mall_order_id matches the resolved order.id. Reject on mismatch or missing item.
   * 3. Resolve the target product purchase snapshot by shopping_mall_product_purchase_snapshots.id using productPurchaseSnapshotId and verify shopping_mall_order_item_id matches the resolved order item. Reject on mismatch or missing snapshot.
   * 4. Validate the request body for required creation fields defined in IShoppingMallProductPurchaseSnapshotOptionValue.ICreate. Use only actual schema-backed properties: option_name, option_value, and display_order. Do not accept parent identifiers in the body.
   * 5. Enforce the unique constraint on [shopping_mall_product_purchase_snapshot_id, option_name]. If the same option name already exists for the snapshot, reject with a conflict error.
   * 6. Validate display_order as an integer appropriate for deterministic reconstruction order. If business policy requires contiguous ordering, verify against existing sibling rows and reject invalid placement; otherwise allow insertion with the supplied sequence and return rows sorted by display_order in readers.
   * 7. Create the row with a generated UUID id, the resolved shopping_mall_product_purchase_snapshot_id, request values, and current timestamps for created_at and updated_at. deleted_at must remain null on creation.
   * 8. Return the created IShoppingMallProductPurchaseSnapshotOptionValue resource.
   *
   * Implementation notes: this operation should generally be invoked from the order finalization workflow that creates shopping_mall_orders, shopping_mall_order_items, and shopping_mall_product_purchase_snapshots after successful payment. If exposed beyond internal orchestration, apply strict authorization so only trusted administrative or system actors can create historical snapshot option rows. Use a transaction when this operation participates in larger snapshot materialization to preserve historical completeness.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedParam("orderId")
    orderId: string & tags.Format<"uuid">,
    @TypedParam("itemId")
    itemId: string & tags.Format<"uuid">,
    @TypedParam("productPurchaseSnapshotId")
    productPurchaseSnapshotId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallProductPurchaseSnapshotOptionValue.ICreate,
  ): Promise<IShoppingMallProductPurchaseSnapshotOptionValue> {
    try {
      return await postShoppingMallCustomerOrdersOrderIdItemsItemIdProductPurchaseSnapshotsProductPurchaseSnapshotIdOptionValues(
        {
          customer,
          orderId,
          itemId,
          productPurchaseSnapshotId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a filtered and paginated list of preserved option values recorded for a purchased product snapshot within a specific order item.
   *
   * This operation exposes the atomic option name and option value pairs captured in the historical product purchase snapshot that belongs to the specified order item. In the underlying database, `shopping_mall_product_purchase_snapshot_option_values` stores one row per selected option, such as Color or Size, and preserves the exact variant configuration shown at purchase time. The `display_order` column exists specifically so the purchased variant description can be reconstructed in a stable and user-facing order during historical order review.
   *
   * The operation is scoped through the enclosing order, order item, and product purchase snapshot because the preserved option values are not standalone business records. They are children of `shopping_mall_product_purchase_snapshots`, which in turn is a one-to-one historical record attached to `shopping_mall_order_items`, and the order item belongs to `shopping_mall_orders`. This nested design ensures that callers retrieve purchase-time option details only in the context of the correct commercial transaction record rather than treating the snapshot contents as editable catalog data.
   *
   * From a business perspective, this endpoint supports order-detail review for customers, seller-side review of their own fulfilled items, and administrative review for oversight or dispute handling. The preserved purchase snapshot exists so order history remains stable even if the seller later edits the live product, changes the variant definition, or removes the current catalog entry. For the same reason, this operation must return historical option data from the purchase snapshot tables rather than deriving display values from live product variant records.
   *
   * Security and ownership checks are essential. Customers may access option values only for their own orders. Sellers may access them only when the referenced order item belongs to that seller, which matches the platform rule that sellers continue handling obligations for their own historical order items. Administrators may access the data for operational oversight and dispute review. Missing or mismatched parent resources must be treated as invalid context, such as when the order item does not belong to the specified order or the purchase snapshot does not belong to the specified item.
   *
   * This operation is intended for list retrieval, so it accepts a request body for pagination, filtering, and ordering behavior consistent with platform browsing rules. In normal use, consumers will often call the parent order detail retrieval first to identify the relevant order item and preserved purchase snapshot, then call this endpoint to reconstruct the exact purchased option combination for display. The response should be ordered primarily by `display_order` so the purchase-time selection appears in the same stable sequence recorded when the order was created.
   *
   * @param connection
   * @param orderId Target order identifier
   * @param itemId Target order item identifier
   * @param productPurchaseSnapshotId Target product purchase snapshot identifier
   * @param body Pagination and filter criteria for purchase snapshot option values
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification Validate that `orderId` references an existing `shopping_mall_orders` row, that `itemId` references an existing `shopping_mall_order_items` row belonging to that order, and that `productPurchaseSnapshotId` references an existing `shopping_mall_product_purchase_snapshots` row belonging to that order item. Reject the request when any parent-child relationship is inconsistent.
   *
   * Authorize by actor context before reading child rows. If the caller is a customer, require `shopping_mall_orders.shopping_mall_customer_id` to match the authenticated customer. If the caller is a seller, require `shopping_mall_order_items.shopping_mall_seller_id` to match the authenticated seller. If the caller is an administrator or super administrator, allow access for oversight purposes.
   *
   * Query `shopping_mall_product_purchase_snapshot_option_values` filtered by `shopping_mall_product_purchase_snapshot_id = productPurchaseSnapshotId`. Exclude rows whose `deleted_at` is not null unless the platform's common read policy explicitly includes deleted child records for audit-only tooling. Apply pagination from `IShoppingMallProductPurchaseSnapshotOptionValue.IRequest`. Support deterministic sorting with `display_order` as the default ascending sort so the variant option combination is reconstructed in stable business order. Additional exact or partial filters may be applied only if they are defined by the request DTO schema, such as option name or option value search.
   *
   * Return a paginated payload of summary records using `IPageIShoppingMallProductPurchaseSnapshotOptionValue.ISummary`. Each summary item should expose the preserved option identity needed for historical display, including the captured option name, captured option value, and display ordering metadata defined by the DTO schema. Do not derive or replace values from live product variant tables because the purchase snapshot is the historical source of truth.
   *
   * Handle edge cases explicitly. If the order exists but the item is from another order, return a not-found or forbidden result according to the platform's ownership disclosure policy. If the purchase snapshot for the given order item does not exist, return not found. If the snapshot exists but has no option value rows, return an empty paginated collection rather than failing, because some purchased variants may not require option combinations. This operation performs no mutation and must not alter historical purchase records.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedParam("orderId")
    orderId: string & tags.Format<"uuid">,
    @TypedParam("itemId")
    itemId: string & tags.Format<"uuid">,
    @TypedParam("productPurchaseSnapshotId")
    productPurchaseSnapshotId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallProductPurchaseSnapshotOptionValue.IRequest,
  ): Promise<IPageIShoppingMallProductPurchaseSnapshotOptionValue.ISummary> {
    try {
      return await patchShoppingMallCustomerOrdersOrderIdItemsItemIdProductPurchaseSnapshotsProductPurchaseSnapshotIdOptionValues(
        {
          customer,
          orderId,
          itemId,
          productPurchaseSnapshotId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve one immutable purchase-time option value captured for a purchased order item.
   *
   * This operation returns a single row from the purchase snapshot option value history that belongs to a specific product purchase snapshot, nested under an order and order item. The underlying database model `shopping_mall_product_purchase_snapshot_option_values` stores one atomic option key-value pair per row, such as a selected color or size, and includes `option_name`, `option_value`, and `display_order` so the purchased variant description can be reconstructed in a stable order. Its parent model `shopping_mall_product_purchase_snapshots` preserves the frozen `product_name`, `product_description`, `sku_code`, and `unit_price` that the customer actually bought at checkout time. Together, these records ensure order details remain historically accurate even if the live product or variant is later edited or deleted.
   *
   * This endpoint is intended for historical order-detail viewing and audit-safe reconstruction of what was purchased. The order model `shopping_mall_orders` is the top-level commercial transaction record for customer order history and administrative oversight, while `shopping_mall_order_items` represents one purchased variant inside that order, including the responsible seller, quantity, captured sale price, shipment assignment, and item lifecycle status. By traversing the full nested path, the API guarantees that the returned option value is not a free-floating record but the exact purchase-time option entry attached to the targeted purchased item.
   *
   * Access to this operation must follow order-visibility and responsibility boundaries. A customer may read option values only for the customer's own order history. A seller may read option values only for order items belonging to that seller's own products and fulfillment scope, which aligns with the requirement that seller shipment and order-item processing must remain restricted to the seller's own items. Administrators may read this historical data for oversight and dispute-resolution purposes. When current seller profile data is unavailable, historical order review must still remain possible by relying on preserved purchase-time records; this endpoint therefore serves preserved snapshot data rather than depending on mutable live catalog state.
   *
   * This operation should typically be used after an order detail or order item detail view has already identified the target purchased item and its associated purchase snapshot. In a client flow, an order detail endpoint is used first to locate the order and item context, then the purchase snapshot is inspected, and finally this endpoint can retrieve a specific normalized option row when exact purchase-time variant details must be shown individually. If any relationship in the nested chain does not match—for example, the option value does not belong to the specified purchase snapshot, or the purchase snapshot does not belong to the specified order item within the specified order—the system must reject the request instead of exposing unrelated historical data.
   *
   * @param connection
   * @param orderId Target order identifier
   * @param itemId Target order item identifier
   * @param productPurchaseSnapshotId Target product purchase snapshot identifier
   * @param optionValueId Target purchase snapshot option value identifier
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification Implement a read-only detail query for a single `shopping_mall_product_purchase_snapshot_option_values` row scoped by its full parent chain.
   *
   * 1. Authenticate the caller and authorize by actor type. Allow the purchasing customer only when the resolved `shopping_mall_orders.shopping_mall_customer_id` belongs to the authenticated customer. Allow the responsible seller only when the resolved `shopping_mall_order_items.shopping_mall_seller_id` belongs to the authenticated seller. Allow administrators and super administrators for oversight. Deny all other access.
   *
   * 2. Resolve the resource using a relational join chain, not by loading the option row alone. Query `shopping_mall_product_purchase_snapshot_option_values` joined to `shopping_mall_product_purchase_snapshots`, `shopping_mall_order_items`, and `shopping_mall_orders`, with predicates on all four IDs: `orders.id = :orderId`, `order_items.id = :itemId`, `product_purchase_snapshots.id = :productPurchaseSnapshotId`, and `option_values.id = :optionValueId`. Also enforce the parent-child relations: `order_items.shopping_mall_order_id = orders.id`, `product_purchase_snapshots.shopping_mall_order_item_id = order_items.id`, and `option_values.shopping_mall_product_purchase_snapshot_id = product_purchase_snapshots.id`.
   *
   * 3. Exclude logically removed records from normal reads by requiring `deleted_at IS NULL` on `shopping_mall_orders`, `shopping_mall_order_items`, `shopping_mall_product_purchase_snapshots`, and `shopping_mall_product_purchase_snapshot_option_values`, unless the platform's internal administrative policy explicitly allows otherwise. This prevents returning administratively removed records through a standard historical-detail API.
   *
   * 4. If no row matches the full nested chain, return a not-found error. Do not reveal which segment failed, because doing so could leak the existence of unrelated order, item, or snapshot records.
   *
   * 5. Return the option value resource mapped to `IShoppingMallProductPurchaseSnapshotOptionValue`. The DTO should reflect the persisted historical snapshot row, including the option name, selected option value, stable display order, identifiers, and timestamps as defined by the schema generation pipeline.
   *
   * 6. Do not mutate any purchase snapshot data. The purchase snapshot and its option values are historical preservation records intended to remain immutable after order creation. This operation must perform no side effects, no recalculation of catalog data, and no fallback to current product variant option definitions.
   *
   * 7. Keep ordering semantics deterministic if the implementation internally loads siblings for validation or assembly, using `display_order` ascending. Even though this endpoint returns one row, any internal consistency checks involving sibling option rows should respect the preserved display sequence.
   *
   * 8. Log access for audit purposes where platform standards require it, especially for administrator review of historical purchase records in dispute scenarios, but do not alter business timestamps on the historical records themselves.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":optionValueId")
  public async at(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedParam("orderId")
    orderId: string & tags.Format<"uuid">,
    @TypedParam("itemId")
    itemId: string & tags.Format<"uuid">,
    @TypedParam("productPurchaseSnapshotId")
    productPurchaseSnapshotId: string & tags.Format<"uuid">,
    @TypedParam("optionValueId")
    optionValueId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallProductPurchaseSnapshotOptionValue> {
    try {
      return await getShoppingMallCustomerOrdersOrderIdItemsItemIdProductPurchaseSnapshotsProductPurchaseSnapshotIdOptionValuesOptionValueId(
        {
          customer,
          orderId,
          itemId,
          productPurchaseSnapshotId,
          optionValueId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
