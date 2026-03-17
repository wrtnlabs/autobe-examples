import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IEcommerceMallOrderItem } from "../../../../../api/structures/IEcommerceMallOrderItem";
import { IPageIEcommerceMallOrderItem } from "../../../../../api/structures/IPageIEcommerceMallOrderItem";
import { SellerAuth } from "../../../../../decorators/SellerAuth";
import { SellerPayload } from "../../../../../decorators/payload/SellerPayload";
import { getEcommerceMallSellerOrdersOrderIdItemsItemId } from "../../../../../providers/getEcommerceMallSellerOrdersOrderIdItemsItemId";
import { patchEcommerceMallSellerOrdersOrderIdItems } from "../../../../../providers/patchEcommerceMallSellerOrdersOrderIdItems";
import { putEcommerceMallSellerOrdersOrderIdItemsItemId } from "../../../../../providers/putEcommerceMallSellerOrdersOrderIdItemsItemId";

@Controller("/ecommerceMall/seller/orders/:orderId/items")
export class EcommercemallSellerOrdersItemsController {
  /**
   * Retrieve a paginated list of order items within a specific order.
   *
   * This endpoint allows customers, sellers, and administrators to view the items included in an order. Each order item represents an individual purchased product variant with its own fulfillment status tracking.
   *
   * ## Authorization
   *
   * **Customer**: Can view order items for their own orders only. Enables customers to track the status of each purchased item independently.
   *
   * **Seller**: Can view order items for products they own within any order. Allows sellers to identify which items require their attention for shipping or processing cancellation/refund requests.
   *
   * **Administrator**: Can view all order items across all orders for oversight and intervention purposes.
   *
   * ## Order Item Statuses
   *
   * Each order item maintains its own status independent of other items in the same order:
   * - **paid**: Payment completed, waiting for seller to ship
   * - **shipped**: Seller has shipped the item
   * - **delivered**: Item has been delivered to customer
   * - **cancelled**: Item was cancelled (either by seller approval or admin force-cancel)
   * - **refunded**: Item was refunded after delivery
   *
   * ## Multi-Seller Orders
   *
   * Orders can contain items from multiple different sellers. This endpoint returns all items within the specified order regardless of seller, but access is filtered based on the authenticated actor's permissions.
   *
   * ## Related Operations
   *
   * - `GET /orders/{orderId}` - Retrieve order header information
   * - `PATCH /orders` - Search across all orders
   * - `POST /orders/{orderId}/items/{orderItemId}/cancellation-requests` - Request cancellation for a paid item
   * - `POST /orders/{orderId}/items/{orderItemId}/refund-requests` - Request refund for a delivered item
   *
   * @param connection
   * @param orderId Target order's unique identifier (UUID)
   * @param body Search criteria and pagination parameters for filtering order items
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor seller
   * @x-autobe-specification ## Implementation Details
   *
   * ### Database Query
   *
   * Query the `ecommerce_mall_order_items` table filtered by the `order_id` path parameter.
   *
   * ### Authorization Logic
   *
   * 1. **Customer**: Verify the order belongs to the authenticated customer via `customer_id` join with `ecommerce_mall_orders`
   * 2. **Seller**: Filter items where `seller_id` matches the authenticated seller
   * 3. **Administrator**: No additional filtering required
   *
   * ### Search and Filter Support
   *
   * The request body IEcommerceMallOrderItem.IRequest should support:
   * - **status**: Filter by order item status (paid, shipped, delivered, cancelled, refunded)
   * - **seller_id**: Filter to items from a specific seller (useful for admin viewing specific seller participation)
   * - **Pagination**: Standard cursor or offset-based pagination
   *
   * ### Sorting Options
   *
   * - `created_at` (default, descending) - newest items first
   * - `status` - group by fulfillment status
   * - `seller_id` - group by seller
   *
   * ### Related Data Loading
   *
   * For each order item, include:
   * - Product snapshot data (name, description from purchase time)
   * - Variant snapshot data (SKU, options, price from purchase time)
   * - Seller profile snapshot (shop name from purchase time)
   *
   * ### Response Structure
   *
   * Return `IPageIEcommerceMallOrderItem.ISummary` containing:
   * - Pagination info (cursor/total)
   * - Array of `IEcommerceMallOrderItem.ISummary` items with essential fields:
   *   - id, order_id, quantity, price_at_purchase, status
   *   - Product name (from snapshot)
   *   - Variant options (from snapshot)
   *   - Seller shop name (from snapshot)
   *   - Created timestamp
   *
   * ### Edge Cases
   *
   * 1. **Empty Result**: If order has no items or actor lacks permission, return empty pagination
   * 2. **Soft Deleted Items**: Exclude items where `deleted_at` is set (unless admin explicitly requests)
   * 3. **Non-existent Order**: Return 404 if order_id not found
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("orderId")
    orderId: string,
    @TypedBody()
    body: IEcommerceMallOrderItem.IRequest,
  ): Promise<IPageIEcommerceMallOrderItem.ISummary> {
    try {
      return await patchEcommerceMallSellerOrdersOrderIdItems({
        seller,
        orderId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve detailed information for a specific order item within an order.
   *
   * This operation returns complete details about a single order item, including its current status, quantity, price paid, and associated snapshots. Order items represent individual purchased product variants within an order.
   *
   * Each order item maintains immutable snapshots that preserve the exact state of the product, product variant, and seller profile at the moment of purchase. These snapshots ensure accurate record-keeping for dispute resolution and allow customers to see exactly what they purchased even if subsequent edits change the live product data.
   *
   * **Authorization**
   * - Customers can access order items belonging to their own orders
   * - Sellers can access order items for products they own (their sold items)
   * - Administrators can access any order item on the platform for oversight purposes
   *
   * **Response Data**
   * The response includes:
   * - Order item ID, quantity, and price paid
   * - Current status (paid, shipped, delivered, cancelled, refunded)
   * - Product snapshot (name, description, category, base price, images at time of purchase)
   * - Product variant snapshot (SKU code, option values, price at time of purchase)
   * - Seller profile snapshot (shop name, description, logo at time of purchase)
   * - Timestamps for creation and any status changes
   *
   * **Related Operations**
   * - `PATCH /orders` - List all orders for the authenticated customer
   * - `GET /orders/{orderId}` - Retrieve the parent order details
   * - `PATCH /orders/{orderId}/items` - List all items within an order (for sellers/administrators)
   *
   * @param connection
   * @param orderId The unique identifier of the order containing the item (global scope)
   * @param itemId The unique identifier of the specific order item to retrieve (scoped to order)
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor seller
   * @x-autobe-specification Query the ecommerce_mall_order_items table by id where order_id matches the path parameter orderId.
   *
   * **Query Strategy:**
   * 1. Validate that the orderId path parameter is a valid UUID
   * 2. Validate that the itemId path parameter is a valid UUID
   * 3. Query order_items table with WHERE id = {itemId} AND order_id = {orderId}
   * 4. Include joins to:
   *    - ecommerce_mall_order_item_product_snapshots (product snapshot data)
   *    - ecommerce_mall_order_item_variant_snapshots (variant snapshot data)
   *    - ecommerce_mall_order_item_seller_snapshots (seller snapshot data)
   *    - ecommerce_mall_products (current product reference)
   *    - ecommerce_mall_product_variants (current variant reference)
   *    - ecommerce_mall_sellers (current seller reference)
   *
   * **Authorization Checks:**
   * 1. If caller is a customer: verify order belongs to the customer via orders.customer_id
   * 2. If caller is a seller: verify order_item.seller_id matches seller's ID
   * 3. If caller is an admin/superAdmin: allow access to any order item
   * 4. Return 403 Forbidden if authorization fails
   *
   * **Edge Cases:**
   * - Return 404 Not Found if itemId doesn't exist or doesn't belong to the specified orderId
   * - Handle cases where snapshots may reference deleted products/variants (snapshots preserve data even when source is deleted)
   *
   * **Response Construction:**
   * - Map database fields to IEcommerceMallOrderItem DTO
   * - Include all snapshot data as nested objects
   * - Ensure pricePaid reflects the actual transaction amount
   * - Include derived status information
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":itemId")
  public async at(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("orderId")
    orderId: string & tags.Format<"uuid">,
    @TypedParam("itemId")
    itemId: string & tags.Format<"uuid">,
  ): Promise<IEcommerceMallOrderItem> {
    try {
      return await getEcommerceMallSellerOrdersOrderIdItemsItemId({
        seller,
        orderId,
        itemId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update an order item's status and related properties.
   *
   * This operation allows authorized administrators and sellers to modify an order item. Administrators can perform force-cancellation and force-refund operations by updating the item status, which immediately changes the status without requiring approval workflows. Sellers can update fulfillment status for items they own.
   *
   * Order items represent individual purchased product variants within an order. Each item tracks its own status lifecycle independently: paid → shipped → delivered, with possible terminal states of cancelled or refunded. The status transitions control the fulfillment workflow and determine which actions are available for the item.
   *
   * The order item update preserves the integrity of the order history. When administrators update status to cancelled or refunded, the system should automatically restore stock quantities through inventory records and update the order's overall status derivation.
   *
   * The operation uses composite path parameters orderId and itemId to uniquely identify the target resource. These must reference valid, existing order and order item records. The requesting actor must have appropriate permissions: administrators can modify any order item, while sellers can only modify items where the seller_id field matches their account.
   *
   * @param connection
   * @param orderId Target order's ID (UUID)
   * @param itemId Target order item's ID (UUID)
   * @param body Order item update information including status changes
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor seller
   * @x-autobe-specification Implement this operation to update an order item in the ecommerce_mall_order_items table.
   *
   * Input Validation:
   * - Validate orderId and itemId are valid UUID format strings
   * - Verify the order item exists with the given itemId
   * - Verify the order item belongs to the specified orderId (match order_id field)
   * - Check the order item is not soft-deleted (deleted_at is null)
   *
   * Authorization Logic:
   * - If actor is administrator: allow status update to any valid state
   * - If actor is seller: verify the seller's id matches the order item's seller_id field
   * - Throw forbidden error if actor lacks permission
   *
   * Status Update Logic:
   * Based on the request body status value, perform validated transitions:
   * - paid → shipped: Valid when seller ships items (creates shipment record separately)
   * - paid → cancelled: Valid for force-cancel or approved cancellation
   * - shipped → delivered: Valid for delivery confirmation
   * - shipped/delivered → refunded: Valid for approved refunds
   * - Any status: should validate transition is allowed per business rules
   *
   * Database Operations:
   * - Begin transaction
   * - Update the order item record in ecommerce_mall_order_items table
   * - Set updated_at to current timestamp
   * - If status changes to cancelled or refunded:
   *   - Create inventory record to restore stock quantity
   *   - Re-evaluate overall order status from all items
   * - Commit transaction
   *
   * Error Handling:
   * - 404 Not Found: If order or order item doesn't exist
   * - 403 Forbidden: If seller tries to update another seller's item
   * - 400 Bad Request: If status transition is invalid
   * - 409 Conflict: If order item is already deleted
   *
   * Return the updated order item entity joined with related tables (order, product, variant, seller) for complete response data.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":itemId")
  public async update(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("orderId")
    orderId: string,
    @TypedParam("itemId")
    itemId: string,
    @TypedBody()
    body: IEcommerceMallOrderItem.IUpdate,
  ): Promise<IEcommerceMallOrderItem> {
    try {
      return await putEcommerceMallSellerOrdersOrderIdItemsItemId({
        seller,
        orderId,
        itemId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
