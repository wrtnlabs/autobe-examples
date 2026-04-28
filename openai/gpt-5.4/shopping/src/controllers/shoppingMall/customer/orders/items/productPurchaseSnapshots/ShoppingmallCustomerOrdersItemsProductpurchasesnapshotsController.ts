import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IShoppingMallProductPurchaseSnapshot } from "../../../../../../api/structures/IShoppingMallProductPurchaseSnapshot";
import { CustomerAuth } from "../../../../../../decorators/CustomerAuth";
import { CustomerPayload } from "../../../../../../decorators/payload/CustomerPayload";
import { getShoppingMallCustomerOrdersOrderIdItemsItemIdProductPurchaseSnapshots } from "../../../../../../providers/getShoppingMallCustomerOrdersOrderIdItemsItemIdProductPurchaseSnapshots";
import { getShoppingMallCustomerOrdersOrderIdItemsItemIdProductPurchaseSnapshotsProductPurchaseSnapshotId } from "../../../../../../providers/getShoppingMallCustomerOrdersOrderIdItemsItemIdProductPurchaseSnapshotsProductPurchaseSnapshotId";
import { postShoppingMallCustomerOrdersOrderIdItemsItemIdProductPurchaseSnapshots } from "../../../../../../providers/postShoppingMallCustomerOrdersOrderIdItemsItemIdProductPurchaseSnapshots";

@Controller(
  "/shoppingMall/customer/orders/:orderId/items/:itemId/productPurchaseSnapshots",
)
export class ShoppingmallCustomerOrdersItemsProductpurchasesnapshotsController {
  /**
   * Retrieve the immutable product purchase snapshot preserved for a specific order item within a specific order.
   *
   * This operation returns the purchase-time merchandise record captured for the selected order item. The returned snapshot reflects the frozen commercial catalog state that the customer actually bought, including the product name, product description, purchased SKU code, and the effective unit price applied at checkout. Its purpose is historical accuracy: order detail views and dispute review must continue to show the purchased merchandise exactly as it existed when payment succeeded, instead of being rewritten by later catalog edits or listing removal.
   *
   * The underlying data comes from `shopping_mall_order_items`, which stores the transactional line facts such as purchased quantity, unit price, seller responsibility, and lifecycle status, and from `shopping_mall_product_purchase_snapshots`, which stores the immutable purchase-time presentation fields linked one-to-one to that order item. The order context is anchored by `shopping_mall_orders`, whose `code`, `status`, and `total_price` represent the confirmed purchase record created only after successful payment. The snapshot is nested under both the order and the order item so the API can validate that the requested item truly belongs to the specified order before returning historical merchandise data.
   *
   * Access to this operation must be restricted to actors with legitimate order-history visibility. The owning customer may inspect the snapshot from order details, the responsible seller may inspect it for fulfillment and after-sales handling of that seller's purchased item, and administrators may inspect it for oversight, audit, and dispute resolution. The operation must not depend on current catalog state for historical display. Even if the live product or variant has changed or is no longer available, the preserved purchase snapshot remains the source of truth for what was bought.
   *
   * This operation is commonly used together with the order-detail retrieval flow. Clients typically obtain the order and its line items first, then request this snapshot when showing merchandise details for an individual purchased line. If seller identity display is also needed for historical review, the corresponding seller purchase-time snapshot should be consulted separately so order history remains understandable even when current seller profile data is unavailable.
   *
   * If the order does not exist, the order item does not exist, or the order item is not contained in the specified order, the operation must fail without revealing unrelated records. If the snapshot row is unexpectedly missing for an existing order item, the system should treat that as a historical-integrity error because purchase snapshots are intended to be preserved for stable order review.
   *
   * @param connection
   * @param orderId Target order identifier
   * @param itemId Target order item identifier within the order
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor customer
     * @x-autobe-specification Implement a read-only detail operation that
     *   resolves a product purchase snapshot strictly within order ownership
     *   context.
   *
   * 1. Validate `orderId` as a UUID and load `shopping_mall_orders` by `id`. Reject when the order does not exist or is not visible to the requesting actor.
   * 2. Load `shopping_mall_order_items` by `id = itemId` and `shopping_mall_order_id = orderId` in the same query or with an equivalent guarded lookup. This must prove the item belongs to the specified order before proceeding.
   * 3. Apply authorization by actor:
   *    - Customer: allow only when `shopping_mall_orders.shopping_mall_customer_id` matches the authenticated customer.
   *    - Seller: allow only when `shopping_mall_order_items.shopping_mall_seller_id` matches the authenticated seller, because sellers may handle only their own purchased items.
   *    - Administrator and superAdministrator: allow for oversight and dispute review.
   * 4. Load `shopping_mall_product_purchase_snapshots` by `shopping_mall_order_item_id = itemId`. Because the schema defines `@@unique([shopping_mall_order_item_id])`, expect at most one row.
   * 5. Return the snapshot as the historical source of truth. Map fields directly from the snapshot row, especially `product_name`, `product_description`, `sku_code`, `unit_price`, `created_at`, and traceability references if exposed by the DTO.
   * 6. Do not reconstruct historical display from live `shopping_mall_products` or `shopping_mall_product_variants`. Optional references to live catalog entities are traceability-only and must not override preserved purchase-time values.
   * 7. Error handling:
   *    - 404-equivalent failure when the order or item is not found in the requested hierarchy.
   *    - 403-equivalent failure when the actor lacks access to the order context.
   *    - Historical integrity failure when the order item exists but no purchase snapshot exists, because order history requires preserved purchase-time merchandise data.
   * 8. No mutation, transaction, or side effect is required beyond normal read consistency. This operation must not update timestamps or derive new snapshot records.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get()
  public async getByOrderidAndItemid(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedParam("orderId")
    orderId: string & tags.Format<"uuid">,
    @TypedParam("itemId")
    itemId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallProductPurchaseSnapshot> {
    try {
      return await getShoppingMallCustomerOrdersOrderIdItemsItemIdProductPurchaseSnapshots(
        {
          customer,
          orderId,
          itemId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Create the immutable product purchase snapshot for a specific order item within a preserved customer order.
   *
   * This operation freezes the commercial product state that was actually purchased for the target order item. The created record is stored in the purchase-time snapshot table that preserves the frozen product name, frozen product description, purchased SKU code, and effective per-unit purchase price used at checkout. The snapshot exists specifically so historical order details remain understandable even when the original live catalog product or product variant is later edited, hidden, or removed.
   *
   * The endpoint is nested beneath both the order and the order item because the historical merchandise snapshot is not an independent business resource. It belongs to exactly one purchased line item in the order record. The implementation must verify that the specified order item truly belongs to the specified order before creating the snapshot, because order records are preserved business records and their line-level historical context must remain internally consistent. The underlying database schema also enforces a one-to-one relationship between an order item and its product purchase snapshot, so a second snapshot for the same order item must be rejected.
   *
   * From a business perspective, this operation supports the platform requirement that past orders continue to show preserved purchase information. The order record is the umbrella purchase grouping, while the order item represents the purchased line identity and operational seller scope. This snapshot complements that line item by preserving customer-facing merchandise details that should not drift with later catalog changes. If option values are provided, they must be stored as ordered child rows so the purchased variant configuration can be reconstructed in a stable display order in later order-detail views, dispute handling, and administrative oversight.
   *
   * This operation is not intended as a customer-authored or seller-authored content creation feature. Product purchase snapshots are historical preservation data created at successful order placement or by tightly controlled platform repair workflows. Because the snapshot is intended to remain immutable after creation, callers must treat the result as a preserved historical record rather than editable catalog content. Related order-detail retrieval operations should later display this preserved snapshot instead of relying on current live product data when presenting past purchases.
   *
   * Expected failures include cases where the order does not exist, the order item does not exist, the order item does not belong to the specified order, the order item already has a product purchase snapshot, or the provided snapshot payload is inconsistent with the purchased line context. These validation steps are essential to preserve accurate order history for customers, sellers, and administrators reviewing earlier transactions.
   *
   * @param connection
   * @param orderId Target order's UUID
   * @param itemId Target order item's UUID within the specified order
   * @param body Purchase-time product snapshot creation data
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor customer
     * @x-autobe-specification Implement a creation service that preserves
     *   purchase-time merchandise history for one specific order item.
   *
   * 1. Authorize only trusted internal order-finalization workflows or privileged administrative recovery tools. Ordinary customer and seller clients must not be allowed to create arbitrary purchase snapshots because this data is system-preserved historical evidence.
   *
   * 2. Load the target shopping_mall_orders row by orderId and the target shopping_mall_order_items row by itemId. Validate that shopping_mall_order_items.shopping_mall_order_id equals the specified orderId. If either record is missing, return a not-found error. If the order item belongs to another order, return a validation error.
   *
   * 3. Check whether a shopping_mall_product_purchase_snapshots row already exists for the target order item using the unique constraint on shopping_mall_order_item_id. If one exists, reject the request as a conflict because the purchase snapshot is intended to be immutable and one-to-one with the order item.
   *
   * 4. Validate the request body against business consistency expectations. The snapshot unit price should match the order item's captured unit_price unless the platform explicitly allows administrative repair with a justified override policy. If original product or variant IDs are provided, ensure they correspond to the purchased product context when traceability is available. Validate option values so option_name is unique within the request and display_order is deterministic.
   *
   * 5. Insert the shopping_mall_product_purchase_snapshots row with a new UUID, shopping_mall_order_item_id from the path context, optional traceability references to shopping_mall_product_id and shopping_mall_product_variant_id when supplied, and the frozen product_name, product_description, sku_code, and unit_price from the request. Set created_at and updated_at to the current timestamp and deleted_at to null.
   *
   * 6. If the request body includes option values, insert child rows into shopping_mall_product_purchase_snapshot_option_values within the same transaction. For each option row, generate a UUID, copy the parent snapshot ID, persist option_name, option_value, and display_order, and set created_at and updated_at to the current timestamp with deleted_at null. Preserve stable ordering for downstream display.
   *
   * 7. Commit the transaction only after both parent and child records succeed. On any failure, roll back the entire transaction so no partial historical snapshot is created.
   *
   * 8. Return the created snapshot resource including its ordered option values so downstream order-detail rendering can rely entirely on preserved historical data instead of live catalog records.
   *
   * Edge cases: reject duplicate snapshot creation; reject duplicate option names for the same snapshot payload; reject empty or malformed frozen product data; reject orphan creation when the order item does not belong to the order. Do not implement later mutation behavior here because the record is intended to remain immutable after creation.
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
    @TypedBody()
    body: IShoppingMallProductPurchaseSnapshot.ICreate,
  ): Promise<IShoppingMallProductPurchaseSnapshot> {
    try {
      return await postShoppingMallCustomerOrdersOrderIdItemsItemIdProductPurchaseSnapshots(
        {
          customer,
          orderId,
          itemId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve the immutable purchase-time product snapshot for a specific order item within a specific order.
   *
   * This operation returns the historical catalog information that was frozen when the customer successfully purchased the item. The underlying snapshot record in shopping_mall_product_purchase_snapshots preserves the product name, product description, purchased SKU code, and effective unit price that were actually applied at checkout time. This design exists so order details remain stable and understandable even when the seller later edits the live product catalog, changes variant information, or removes the original listing.
   *
   * The operation is scoped through shopping_mall_orders and shopping_mall_order_items because the purchase snapshot is not an independent business object. Each snapshot belongs to exactly one order item, and each order item belongs to one order. The order item stores the core transactional facts such as purchased quantity, responsible seller, current lifecycle status, delivery timestamp, and shipment assignment, while the snapshot stores the frozen commercial presentation of what the customer bought. Together, these records allow historical order review without relying on mutable live product data.
   *
   * Access to this operation must follow ownership and oversight rules. The customer who placed the order may retrieve the snapshot as part of order-history review. The seller responsible for the order item may retrieve it when processing fulfillment or after-sales obligations for that item, including shipment, cancellation, and refund handling. Administrators and super administrators may retrieve it for oversight, investigation, and dispute resolution. Unrelated customers and unrelated sellers must not be allowed to read this preserved purchase record.
   *
   * This operation is especially important for historical continuity. Past orders must remain reviewable even when current seller profile data or current product catalog data is unavailable or has changed. Clients will commonly use this endpoint after first retrieving the parent order detail and its item list, then selecting a specific item whose preserved purchase-time product context needs to be displayed in full. If the order, order item, or snapshot identifier does not exist, or if the identifiers do not form a valid parent-child chain, the request must fail rather than returning unrelated historical data.
   *
   * @param connection
   * @param orderId Target order's ID
   * @param itemId Target order item's ID
   * @param productPurchaseSnapshotId Target product purchase snapshot's ID
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor customer
     * @x-autobe-specification Implement a read-only detail lookup for one
     *   shopping_mall_product_purchase_snapshots record under a validated
     *   parent chain.
   *
   * 1. Authenticate the caller and resolve actor type.
   * 2. Load the target order from shopping_mall_orders by id = orderId and deleted_at IS NULL unless historical policy explicitly allows reading administratively removed orders. If not found, return not found.
   * 3. Load the target order item from shopping_mall_order_items by id = itemId, shopping_mall_order_id = orderId, and deleted_at IS NULL unless historical policy explicitly requires inclusion of administratively removed items. If not found, return not found. This parent-child validation is mandatory to prevent cross-order item access.
   * 4. Load the target purchase snapshot from shopping_mall_product_purchase_snapshots by id = productPurchaseSnapshotId, shopping_mall_order_item_id = itemId. Do not substitute another snapshot by order item only; the explicit snapshot id must match. If not found, return not found.
   * 5. Authorize access:
   *    - customer: allow only when shopping_mall_orders.shopping_mall_customer_id matches the authenticated customer account.
   *    - seller: allow only when shopping_mall_order_items.shopping_mall_seller_id matches the authenticated seller account. Suspension does not remove the seller's ability to complete obligations connected to existing orders, so suspended sellers may still read snapshots for their own existing order items.
   *    - administrator and superAdministrator: allow for oversight.
   *    - all other contexts: reject.
   * 6. Return the snapshot mapped to IShoppingMallProductPurchaseSnapshot using the preserved snapshot columns as the source of truth for historical display. The response should include identifiers and immutable business fields such as product_name, product_description, sku_code, unit_price, created_at, and updated_at according to the DTO definition.
   * 7. Do not join to live product or product variant data for response truth. Optional original product and variant references may be used only for traceability or diagnostics, but historical display must come from the snapshot record itself.
   * 8. Error handling:
   *    - return not found when any parent resource in the chain is missing or mismatched;
   *    - return forbidden when the caller is authenticated but does not own or oversee the target resource;
   *    - return unauthorized when no valid authentication is present.
   * 9. This operation performs no mutation, no transaction is required beyond a consistent read scope.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":productPurchaseSnapshotId")
  public async getByOrderidAndItemidAndProductpurchasesnapshotid(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedParam("orderId")
    orderId: string & tags.Format<"uuid">,
    @TypedParam("itemId")
    itemId: string & tags.Format<"uuid">,
    @TypedParam("productPurchaseSnapshotId")
    productPurchaseSnapshotId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallProductPurchaseSnapshot> {
    try {
      return await getShoppingMallCustomerOrdersOrderIdItemsItemIdProductPurchaseSnapshotsProductPurchaseSnapshotId(
        {
          customer,
          orderId,
          itemId,
          productPurchaseSnapshotId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
