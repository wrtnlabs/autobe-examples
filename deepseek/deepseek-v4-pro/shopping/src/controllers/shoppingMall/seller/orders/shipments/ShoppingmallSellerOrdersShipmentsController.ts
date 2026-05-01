import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IShoppingMallShipment } from "../../../../../api/structures/IShoppingMallShipment";
import { SellerAuth } from "../../../../../decorators/SellerAuth";
import { SellerPayload } from "../../../../../decorators/payload/SellerPayload";
import { getShoppingMallSellerOrdersOrderCodeShipmentsShipmentId } from "../../../../../providers/getShoppingMallSellerOrdersOrderCodeShipmentsShipmentId";
import { postShoppingMallSellerOrdersOrderIdShipments } from "../../../../../providers/postShoppingMallSellerOrdersOrderIdShipments";

@Controller("/shoppingMall/seller/orders")
export class ShoppingmallSellerOrdersShipmentsController {
  /**
   * Creates a new shipment for an order, grouping selected paid order items from the authenticated seller into a physical package with carrier and tracking information.
   *
   * When a seller is ready to ship items from an order, they create a shipment by selecting one or more of their own order items that are in "paid" status. All items included in the shipment must belong to the same seller — items from different sellers must be shipped in separate shipments. The seller provides the carrier name (e.g., "FedEx", "UPS", "DHL") and the tracking number for the package.
   *
   * Upon successful creation, all included order items transition from "paid" to "shipped" status simultaneously and share the same tracking information. The order's overall status is recalculated based on the updated statuses of all its items after the shipment is created.
   *
   * A seller may create multiple shipments for the same order, shipping items individually or in separate bundles. Each shipment operates independently with its own carrier and tracking details.
   *
   * Tracking information becomes immediately available to the customer upon shipment creation, enabling the customer to monitor each package's delivery progress. Delivery confirmation occurs per shipment — either manually by the customer or automatically 14 days after the shipment was created.
   *
   * @param connection
   * @param orderId The unique identifier of the order to create a shipment for. The authenticated seller must have order items within this order that are in "paid" status and owned by them.
   * @param body Shipment creation payload containing the list of order item IDs to include in the shipment (must be non-empty, all in "paid" status, all belonging to the authenticated seller), the carrier name, and the tracking number.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor seller
     * @x-autobe-specification Create a new shipment record in the
     *   shopping_mall_shipments table and update associated order items.
   *
   * 1. Validate the order exists by querying shopping_mall_orders WHERE id = orderId AND deleted_at IS NULL. Return 404 if not found.
   *
   * 2. Identify the authenticated seller from the session. The seller ID comes from the authenticated user's seller account (shopping_mall_sellers). Verify the seller is approved (approval_status = "approved") and not suspended/banned (suspended_at IS NULL, banned_at IS NULL). Return 403 if the seller is not in good standing.
   *
   * 3. Validate the request body:
   *    - orderItemIds must be a non-empty array. Return 400 if empty.
   *    - carrier_name must be a non-empty string. Return 400 if missing or empty.
   *    - tracking_number must be a non-empty string. Return 400 if missing or empty.
   *
   * 4. Deduplicate orderItemIds before processing.
   *
   * 5. For each orderItemId in the deduplicated list, query shopping_mall_order_items:
   *    - WHERE id = orderItemId AND shopping_mall_order_id = orderId. Return 400 with details if any item does not belong to this order.
   *    - WHERE status = "paid". Return 400 if any item is not in "paid" status (items already shipped, delivered, cancelled, or refunded cannot be included).
   *    - WHERE shopping_mall_shipment_id IS NULL. Return 400 if any item is already assigned to another shipment.
   *
   * 6. Verify all order items belong to the same seller (the authenticated seller). Query the product variants of the selected order items (shopping_mall_order_items → shopping_mall_product_variants → shopping_mall_products) and confirm all products have shopping_mall_seller_id matching the authenticated seller. Return 403 if any item belongs to a different seller — cross-seller shipment grouping is prohibited.
   *
   * 7. Insert a new row into shopping_mall_shipments:
   *    - id: generate UUID
   *    - shopping_mall_order_id: orderId from path
   *    - shopping_mall_seller_id: authenticated seller ID
   *    - carrier_name: from request body
   *    - tracking_number: from request body
   *    - delivered_at: null (not yet delivered)
   *    - created_at: current timestamp
   *    - updated_at: current timestamp
   *    - deleted_at: null
   *
   * 8. Update all included order items in shopping_mall_order_items:
   *    - SET shopping_mall_shipment_id = new shipment ID, status = "shipped", updated_at = current timestamp
   *    - WHERE id IN (orderItemIds) AND shopping_mall_shipment_id IS NULL AND status = "paid"
   *    - Use a transaction to prevent race conditions. If no rows were updated (all items were claimed by a concurrent shipment), return 409 Conflict.
   *
   * 9. Recalculate the order status by querying all order items for the order:
   *    - All items "paid" → "paid"
   *    - Any item "shipped" and none "delivered" → "shipped"
   *    - All items "delivered" → "delivered"
   *    - All items "cancelled" → "cancelled"
   *    - All items "refunded" → "refunded"
   *    - Mixed states → "partially_completed"
   *    Update shopping_mall_orders.status and updated_at accordingly.
   *
   * 10. Return the created shipment record with its included order items (join shopping_mall_order_items WHERE shopping_mall_shipment_id = new shipment ID), including each item's product variant details and current status.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post(":orderId/shipments")
  public async create(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("orderId")
    orderId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallShipment.ICreate,
  ): Promise<IShoppingMallShipment> {
    try {
      return await postShoppingMallSellerOrdersOrderIdShipments({
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
   * Retrieve the full details of a specific shipment within an order.
   *
   * Returns the carrier name, tracking number, shipping date (created_at), and delivery confirmation status. The delivered_at field is null while the shipment is in transit and non-null once delivery has been confirmed — either manually by the customer or automatically 14 days after shipment creation.
   *
   * All order items included in this shipment are listed with their product names, variant options, quantities, and prices as recorded at the time of purchase. Seller profile snapshots captured during checkout are also included, preserving the shop name and logo as they appeared when the order was placed.
   *
   * Customers can use this endpoint to track packages for their own orders. Sellers can view shipments they have created to monitor delivery progress across their products.
   *
   * @param connection
   * @param orderCode Unique order code identifying the order this shipment belongs to (global scope).
   * @param shipmentId UUID of the shipment to retrieve.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor seller
     * @x-autobe-specification Retrieve a single shipment by its ID within the
     *   context of an order identified by its unique code.
   *
   * Query the shopping_mall_shipments table by id, joining on the shopping_mall_orders table by the order's unique code to ensure the shipment belongs to the specified order. Include all related shopping_mall_order_items belonging to this shipment (where shopping_mall_shipment_id matches), along with their associated shopping_mall_order_item_seller_snapshots for complete historical context.
   *
   * Authorization:
   * - Customers may only access shipments belonging to their own orders (the order's shopping_mall_customer_id must match the authenticated customer).
   * - Sellers may only access shipments they created (the shipment's shopping_mall_seller_id must match the authenticated seller).
   * - Return 403 Forbidden if the authenticated actor lacks access.
   *
   * Error handling:
   * - Return 404 Not Found if no order exists with the given orderCode.
   * - Return 404 Not Found if no shipment exists with the given shipmentId, or if the shipment does not belong to the order identified by orderCode.
   *
   * Delivery state: delivered_at is null when the shipment is in transit; non-null when delivery has been confirmed. The auto-delivery confirmation logic runs 14 days after created_at if no manual confirmation has occurred.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":orderCode/shipments/:shipmentId")
  public async at(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("orderCode")
    orderCode: string,
    @TypedParam("shipmentId")
    shipmentId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallShipment> {
    try {
      return await getShoppingMallSellerOrdersOrderCodeShipmentsShipmentId({
        seller,
        orderCode,
        shipmentId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
