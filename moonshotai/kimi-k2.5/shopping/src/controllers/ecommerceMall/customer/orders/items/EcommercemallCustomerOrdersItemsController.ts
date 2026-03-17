import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IEcommerceMallOrderItem } from "../../../../../api/structures/IEcommerceMallOrderItem";
import { IPageIEcommerceMallOrderItem } from "../../../../../api/structures/IPageIEcommerceMallOrderItem";
import { CustomerAuth } from "../../../../../decorators/CustomerAuth";
import { CustomerPayload } from "../../../../../decorators/payload/CustomerPayload";
import { getEcommerceMallCustomerOrdersOrderIdItemsItemId } from "../../../../../providers/getEcommerceMallCustomerOrdersOrderIdItemsItemId";
import { patchEcommerceMallCustomerOrdersOrderIdItems } from "../../../../../providers/patchEcommerceMallCustomerOrdersOrderIdItems";

@Controller("/ecommerceMall/customer/orders/:orderId/items")
export class EcommercemallCustomerOrdersItemsController {
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
   * @x-autobe-authorization-actor customer
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
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedParam("orderId")
    orderId: string,
    @TypedBody()
    body: IEcommerceMallOrderItem.IRequest,
  ): Promise<IPageIEcommerceMallOrderItem.ISummary> {
    try {
      return await patchEcommerceMallCustomerOrdersOrderIdItems({
        customer,
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
   * @x-autobe-authorization-actor customer
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
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedParam("orderId")
    orderId: string & tags.Format<"uuid">,
    @TypedParam("itemId")
    itemId: string & tags.Format<"uuid">,
  ): Promise<IEcommerceMallOrderItem> {
    try {
      return await getEcommerceMallCustomerOrdersOrderIdItemsItemId({
        customer,
        orderId,
        itemId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
