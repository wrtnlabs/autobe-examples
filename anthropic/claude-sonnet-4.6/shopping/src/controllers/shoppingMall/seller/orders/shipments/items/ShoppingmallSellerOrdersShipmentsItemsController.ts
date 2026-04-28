import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIShoppingMallShipmentItem } from "../../../../../../api/structures/IPageIShoppingMallShipmentItem";
import { IShoppingMallShipmentItem } from "../../../../../../api/structures/IShoppingMallShipmentItem";
import { SellerAuth } from "../../../../../../decorators/SellerAuth";
import { SellerPayload } from "../../../../../../decorators/payload/SellerPayload";
import { deleteShoppingMallSellerOrdersOrderIdShipmentsShipmentIdItemsShipmentItemId } from "../../../../../../providers/deleteShoppingMallSellerOrdersOrderIdShipmentsShipmentIdItemsShipmentItemId";
import { getShoppingMallSellerOrdersOrderIdShipmentsShipmentIdItemsShipmentItemId } from "../../../../../../providers/getShoppingMallSellerOrdersOrderIdShipmentsShipmentIdItemsShipmentItemId";
import { patchShoppingMallSellerOrdersOrderIdShipmentsShipmentIdItems } from "../../../../../../providers/patchShoppingMallSellerOrdersOrderIdShipmentsShipmentIdItems";
import { postShoppingMallSellerOrdersOrderIdShipmentsShipmentIdItems } from "../../../../../../providers/postShoppingMallSellerOrdersOrderIdShipmentsShipmentIdItems";

@Controller("/shoppingMall/seller/orders/:orderId/shipments/:shipmentId/items")
export class ShoppingmallSellerOrdersShipmentsItemsController {
  /**
   * Assign one or more paid order items to a specific shipment, creating the corresponding shipment item records.
   *
   * This operation allows a seller to attach order items to an existing shipment record. Each assigned item is recorded in the `shopping_mall_shipment_items` junction table, which links the `shopping_mall_shipments` record to each individual `shopping_mall_order_items` entry. The junction table enforces a unique constraint on the order item foreign key, ensuring that each order item can belong to at most one shipment at any given time.
   *
   * Only order items in the `paid` status are eligible to be included in a shipment. Attempting to assign an item in any other status (e.g., `pending`, `shipped`, `delivered`, `cancelled`, or `refunded`) will result in a validation error. At least one order item must be specified in the request — an empty assignment list is not permitted.
   *
   * The system enforces strict seller isolation: every order item specified in the request must belong to a product owned by the same seller who created the shipment. If any of the selected order items belong to a different seller's product, the entire request is rejected. This ensures that shipment responsibility remains clearly associated with the originating seller, and that sellers cannot interfere with other sellers' fulfillment operations.
   *
   * The `orderId` path parameter identifies the parent order (`shopping_mall_orders`), and the `shipmentId` identifies the specific shipment (`shopping_mall_shipments`) within that order. The system validates that the referenced shipment belongs to the specified order before proceeding. The shipment itself must be in an active state (not deleted via `deleted_at`).
   *
   * Upon successful assignment, the operation returns the list of newly created `shopping_mall_shipment_items` records. Each record carries the timestamp of when the order item was assigned to the shipment. This endpoint is intended to be called after creating the shipment record (via `POST /orders/{orderId}/shipments`), once the seller has selected which of their paid items to group into the shipment.
   *
   * @param connection
   * @param orderId The unique identifier (UUID) of the parent order to which the shipment belongs.
   * @param shipmentId The unique identifier (UUID) of the shipment to which the order items will be assigned.
   * @param body The list of paid order item IDs to assign to this shipment.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor seller
     * @x-autobe-specification 1. Authenticate the caller as a seller actor. 2.
     *   Retrieve the shipment record from `shopping_mall_shipments` by
     *   `shipmentId`, verifying it exists, is not deleted (`deleted_at IS
     *   NULL`), belongs to the specified `orderId`, and belongs to the
     *   authenticated seller (`shopping_mall_seller_id` matches caller). 3. For
     *   each `orderItemId` in the request body: a. Retrieve the
     *   `shopping_mall_order_items` record. b. Verify it belongs to the
     *   specified `orderId`. c. Verify its status is `'paid'`. d. Verify the
     *   associated `shopping_mall_product_variants.shopping_mall_product_id`
     *   maps to a product owned by the authenticated seller. e. Verify it does
     *   not already have an entry in `shopping_mall_shipment_items` (unique
     *   constraint check). 4. If any item fails validation (wrong seller, wrong
     *   status, already shipped, or wrong order), reject the entire request
     *   with a clear error message identifying the offending item. 5. If the
     *   request body contains zero order item IDs, reject the request. 6.
     *   Within a database transaction: a. Insert one
     *   `shopping_mall_shipment_items` record per order item with the
     *   `shopping_mall_shipment_id`, `shopping_mall_order_item_id`, and
     *   `created_at = NOW()`. b. Update each included
     *   `shopping_mall_order_items.status` from `'paid'` to `'shipped'` and set
     *   `updated_at = NOW()`. c. Recalculate and update
     *   `shopping_mall_orders.status` based on the aggregate statuses of all
     *   child order items. 7. Return the array of newly created
     *   `shopping_mall_shipment_items` records.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("orderId")
    orderId: string & tags.Format<"uuid">,
    @TypedParam("shipmentId")
    shipmentId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallShipmentItem.ICreate,
  ): Promise<IShoppingMallShipmentItem> {
    try {
      return await postShoppingMallSellerOrdersOrderIdShipmentsShipmentIdItems({
        seller,
        orderId,
        shipmentId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a paginated list of order items belonging to a specific shipment within an order.
   *
   * This operation allows authenticated users to browse and filter the individual order items that have been grouped into a particular shipment. Each item in the result includes the purchased product's snapshot details (product name, variant options, price at purchase time), the current lifecycle status of the order item, and quantity information — all as recorded in the shopping_mall_order_items and shopping_mall_order_item_snapshots tables.
   *
   * The shipment is uniquely identified by its UUID (shipmentId) and must belong to the order specified by orderId (shopping_mall_shipments.shopping_mall_order_id). The system enforces ownership: a customer may only access shipments belonging to their own orders, and a seller may only access shipments they are responsible for (shopping_mall_shipments.shopping_mall_seller_id).
   *
   * The shopping_mall_shipment_items junction table associates each order item with exactly one shipment. This endpoint traverses that relationship to surface the full list of items, along with embedded snapshot data from shopping_mall_order_item_snapshots — ensuring the product name, variant configuration, and seller profile are shown exactly as they were at the time of purchase, even if those entities have since been modified or removed.
   *
   * This operation is particularly useful when a customer views order tracking details (see GET /orders/{orderId} for the parent order detail view) and wants to inspect the specific items contained within each shipment, including per-item status. Sellers use this endpoint to review which items were bundled into a given shipment they created.
   *
   * Results are paginated and support optional filtering criteria such as order item status. The 'index' name and PATCH method are used because the operation accepts complex search/filter criteria in the request body alongside pagination parameters.
   *
   * @param connection
   * @param orderId The UUID of the parent order. The shipment must belong to this order (shopping_mall_shipments.shopping_mall_order_id). Used to verify ownership and scope the query.
   * @param shipmentId The UUID of the specific shipment whose items are to be listed. Must belong to the order identified by orderId.
   * @param body Pagination and optional filter criteria for the shipment item list, such as filtering by order item status.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor seller
     * @x-autobe-specification 1. Authenticate the requesting actor (customer or
     *   seller). 2. Validate that the order identified by orderId exists in
     *   shopping_mall_orders. If the actor is a customer, verify that
     *   shopping_mall_orders.shopping_mall_customer_id matches the
     *   authenticated customer's ID. If the actor is a seller, verify that the
     *   shipment identified by shipmentId has
     *   shopping_mall_shipments.shopping_mall_seller_id equal to the
     *   authenticated seller's ID. 3. Validate that the shipment identified by
     *   shipmentId exists in shopping_mall_shipments and that
     *   shopping_mall_shipments.shopping_mall_order_id matches the provided
     *   orderId. Return 404 if not found or mismatched. 4. Query
     *   shopping_mall_shipment_items where shopping_mall_shipment_id =
     *   shipmentId to get all junction records. 5. Join with
     *   shopping_mall_order_items on shopping_mall_order_item_id to retrieve
     *   quantity, unit_price, status, created_at, and updated_at for each item.
     *   6. Join with shopping_mall_order_item_snapshots (1:1 via order_item_id)
     *   to include product_snapshot_id, product_snapshot_skus_id, and
     *   seller_profile_snapshot_id. 7. Optionally join with
     *   shopping_mall_product_snapshots and
     *   shopping_mall_product_snapshot_skuses to embed product name, variant
     *   options, and price at purchase time in the summary response. 8. Apply
     *   optional filters from the request body: filter by order item status if
     *   provided. 9. Apply pagination (page number and page size) from the
     *   request body, with default values. 10. Return the paginated result as
     *   IPageIShoppingMallShipmentItem.ISummary, including pagination metadata
     *   (total count, current page, page size) and the data array of shipment
     *   item summaries. 11. Edge cases: if the shipment has no items (should
     *   not occur due to business rules requiring at least one item), return an
     *   empty paginated result. If pagination parameters exceed available
     *   records, return the last page of results.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("orderId")
    orderId: string & tags.Format<"uuid">,
    @TypedParam("shipmentId")
    shipmentId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallShipmentItem.IRequest,
  ): Promise<IPageIShoppingMallShipmentItem.ISummary> {
    try {
      return await patchShoppingMallSellerOrdersOrderIdShipmentsShipmentIdItems(
        {
          seller,
          orderId,
          shipmentId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve the detailed information of a specific shipment item record identified by its unique ID, scoped within the context of a parent shipment and order.
   *
   * A shipment item (backed by the `shopping_mall_shipment_items` junction table) represents the association between an individual order item (`shopping_mall_order_items`) and a shipment (`shopping_mall_shipments`). Each order item can belong to at most one shipment, enforced by a unique constraint on the `shopping_mall_order_item_id` column of the junction table. This endpoint returns the full detail of one such association, including the identity of both the shipment and the linked order item.
   *
   * Access to this endpoint is restricted to the authenticated seller who created the shipment. This is consistent with the seller-scoped path namespace (`/shoppingMall/seller/...`) and the platform's ownership-bounded permission model: a seller may only inspect shipment items that belong to shipments they created. Any attempt to access a shipment that belongs to another seller will result in a not-found or forbidden response.
   *
   * Access is further scoped by the `orderId` and `shipmentId` path parameters to ensure the requested shipment item actually belongs to the correct shipment and order hierarchy. The system will verify that the shipment identified by `shipmentId` belongs to the order identified by `orderId`, and that the shipment item identified by `shipmentItemId` belongs to that shipment. Any mismatch in this hierarchy will result in a not-found response.
   *
   * This endpoint is useful for a seller to confirm which specific order items are included in a given shipment package, at item-level granularity. Tracking information for the shipment as a whole (carrier name, tracking number, timestamps) is available on the parent shipment resource.
   *
   * To retrieve the full list of shipment items in a shipment, use the `PATCH /shoppingMall/seller/orders/{orderId}/shipments/{shipmentId}/items` operation (index). To retrieve the full shipment record, use `GET /shoppingMall/seller/orders/{orderId}/shipments/{shipmentId}`.
   *
   * @param connection
   * @param orderId The UUID of the order this shipment belongs to.
   * @param shipmentId The UUID of the shipment containing the target item.
   * @param shipmentItemId The UUID of the specific shipment item record to retrieve.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor seller
     * @x-autobe-specification 1. Validate that the order identified by
     *   `orderId` exists. Return 404 if not found. 2. Validate that the
     *   shipment identified by `shipmentId` exists and belongs to the order
     *   `orderId` (check shopping_mall_shipments.shopping_mall_order_id ==
     *   orderId). Return 404 if not matched. 3. Validate that the shipment item
     *   identified by `shipmentItemId` exists and belongs to the shipment
     *   `shipmentId` (check
     *   shopping_mall_shipment_items.shopping_mall_shipment_id == shipmentId).
     *   Return 404 if not matched. 4. Enforce authorization: - If caller is a
     *   customer, verify the order's shopping_mall_customer_id matches the
     *   authenticated customer. - If caller is a seller, verify the shipment's
     *   shopping_mall_seller_id matches the authenticated seller. - Admins and
     *   superAdmins may access any shipment item. 5. Join
     *   shopping_mall_shipment_items with shopping_mall_order_items to retrieve
     *   the associated order item fields (id, quantity, unit_price, status,
     *   product variant reference, created_at, updated_at). 6. Return the
     *   assembled IShoppingMallShipmentItem DTO containing: the shipment item
     *   id, shopping_mall_shipment_id, created_at, and the nested order item
     *   details. 7. Handle edge cases: if any path parameter is not a valid
     *   UUID format, return 400. Cascade hierarchy checks before performing the
     *   final item lookup.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":shipmentItemId")
  public async at(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("orderId")
    orderId: string & tags.Format<"uuid">,
    @TypedParam("shipmentId")
    shipmentId: string & tags.Format<"uuid">,
    @TypedParam("shipmentItemId")
    shipmentItemId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallShipmentItem> {
    try {
      return await getShoppingMallSellerOrdersOrderIdShipmentsShipmentIdItemsShipmentItemId(
        {
          seller,
          orderId,
          shipmentId,
          shipmentItemId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Remove a specific order item assignment from a shipment, effectively un-grouping that order item from the shipment package.
   *
   * This operation targets the `shopping_mall_shipment_items` junction table, which links individual order items (`shopping_mall_order_items`) to a shipment (`shopping_mall_shipments`). By deleting this junction record, the order item is disassociated from the given shipment, allowing the seller to reassign it to a different shipment or ship it separately.
   *
   * The path is fully hierarchical: the `orderId` identifies the parent order, the `shipmentId` identifies the specific shipment within that order, and the `shipmentItemId` identifies the exact junction record to remove. The system validates that the shipment belongs to the specified order, and that the shipment item belongs to the specified shipment, rejecting the request with an appropriate error if any mismatch is found.
   *
   * Access control is strictly enforced. Only the seller who owns the shipment (i.e., the seller whose `shopping_mall_seller_id` matches the shipment's `shopping_mall_seller_id`) may remove items from it. Administrators also have the authority to intervene and modify shipment contents as part of their platform-wide oversight powers, including force-cancellation and order management capabilities.
   *
   * This operation is typically performed before the shipment has been dispatched (i.e., before `shipped_at` is set). Removing an item from a shipment does not cancel or refund the order item — it only removes the logistics grouping. The order item's status remains unchanged and it may subsequently be included in a new or different shipment by the seller.
   *
   * Related operations: `POST /orders/{orderId}/shipments` creates a new shipment and assigns order items to it; `GET /orders/{orderId}/shipments/{shipmentId}` retrieves the current state of a shipment and its assigned items.
   *
   * @param connection
   * @param orderId The UUID of the parent order to which the shipment belongs.
   * @param shipmentId The UUID of the shipment from which the order item assignment will be removed.
   * @param shipmentItemId The UUID of the shipment item junction record to be removed, which links a specific order item to this shipment.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor seller
     * @x-autobe-specification 1. Authenticate the calling actor. Accept seller
     *   (must own the shipment) or admin actors. 2. Look up the order by
     *   `orderId` in `shopping_mall_orders`. Return 404 if not found. 3. Look
     *   up the shipment by `shipmentId` in `shopping_mall_shipments`. Verify
     *   `shopping_mall_order_id` matches `orderId`. Return 404 if not found or
     *   mismatched. 4. If the actor is a seller, verify
     *   `shopping_mall_seller_id` on the shipment matches the authenticated
     *   seller's ID. Return 403 if it does not. 5. Look up the shipment item by
     *   `shipmentItemId` in `shopping_mall_shipment_items`. Verify
     *   `shopping_mall_shipment_id` matches `shipmentId`. Return 404 if not
     *   found or mismatched. 6. (Optional guard) If the shipment has already
     *   been dispatched (`shipped_at` is not null), consider whether removal
     *   should be rejected or allowed depending on business rules. Log a
     *   warning if needed. 7. Delete the `shopping_mall_shipment_items` record
     *   identified by `shipmentItemId`. Because this is a junction record, the
     *   underlying `shopping_mall_order_items` record remains intact — only the
     *   assignment is removed. 8. Return HTTP 204 No Content on success. 9. All
     *   steps should be wrapped in a database transaction to ensure atomicity.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":shipmentItemId")
  public async erase(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("orderId")
    orderId: string & tags.Format<"uuid">,
    @TypedParam("shipmentId")
    shipmentId: string & tags.Format<"uuid">,
    @TypedParam("shipmentItemId")
    shipmentItemId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteShoppingMallSellerOrdersOrderIdShipmentsShipmentIdItemsShipmentItemId(
        {
          seller,
          orderId,
          shipmentId,
          shipmentItemId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
