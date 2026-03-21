import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IEcommerceMallShipment } from "../../../../api/structures/IEcommerceMallShipment";
import { IPageIEcommerceMallShipment } from "../../../../api/structures/IPageIEcommerceMallShipment";
import { SellerAuth } from "../../../../decorators/SellerAuth";
import { SellerPayload } from "../../../../decorators/payload/SellerPayload";
import { deleteEcommerceMallSellerShipmentsShipmentId } from "../../../../providers/deleteEcommerceMallSellerShipmentsShipmentId";
import { getEcommerceMallSellerShipmentsShipmentId } from "../../../../providers/getEcommerceMallSellerShipmentsShipmentId";
import { patchEcommerceMallSellerShipments } from "../../../../providers/patchEcommerceMallSellerShipments";
import { postEcommerceMallSellerShipments } from "../../../../providers/postEcommerceMallSellerShipments";
import { putEcommerceMallSellerShipmentsShipmentId } from "../../../../providers/putEcommerceMallSellerShipmentsShipmentId";

@Controller("/ecommerceMall/seller/shipments")
export class EcommercemallSellerShipmentsController {
  /**
   * Create a new shipment for one or more order items belonging to the authenticated seller.
   *
   * This endpoint allows sellers to create shipments for their paid order items. When a seller prepares to ship products, they select one or more of their order items that have 'paid' status and bundle them into a shipment. The seller must provide the carrier name and tracking number for delivery tracking.
   *
   * **Business Rules:**
   * - All order items in a single shipment MUST belong to the same seller
   * - All order items MUST have 'paid' status to be included in a shipment
   * - All order items MUST belong to the same order
   * - When shipment is created, all included order items automatically change status to 'shipped'
   * - Order item can only belong to one shipment
   *
   * **Related Entities:**
   * - Creates record in ecommerce_mall_shipments table
   * - Creates junction records in ecommerce_mall_shipment_items table
   * - Updates status in ecommerce_mall_order_items table from 'paid' to 'shipped'
   * - Updates updated_at timestamp in ecommerce_mall_orders table
   *
   * **Workflow:**
   * 1. Seller authenticates with valid session token
   * 2. Seller selects order items to ship (must all have 'paid' status)
   * 3. Seller enters carrier name and tracking number
   * 4. System validates single-seller rule, order item existence, and status
   * 5. System creates shipment with all included items atomically
   * 6. System updates order item statuses to 'shipped'
   * 7. System returns created shipment with all included items
   *
   * @param connection
   * @param body Shipment creation request containing order ID, order item IDs to include, carrier name, and tracking number
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor seller
   * @x-autobe-specification ## Shipment Creation Implementation
   *
   * ### Service Layer Logic
   * 1. Extract seller ID from authenticated session token
   * 2. Validate request body contains required fields: orderId, orderItemIds (array), carrier, trackingNumber
   * 3. Validate carrier name is non-empty string (max 100 characters)
   * 4. Validate tracking number is non-empty string (max 100 characters)
   *
   * ### Business Validation
   * 1. Fetch all order items by provided orderItemIds
   * 2. Verify all order items exist (return 404 if any not found)
   * 3. Verify all order items belong to the specified order (orderId)
   * 4. Verify all order items have status 'paid' (return 400 if any not paid)
   * 5. Verify all order items belong to the authenticated seller (return 403 if unauthorized)
   * 6. Verify no order item is already in a shipment (return 400 if already shipped)
   *
   * ### Single Seller Rule Enforcement
   * 1. Extract seller_id from first order item's product relationship
   * 2. Verify all order items reference the same seller_id
   * 3. Return 400 error if items from different sellers detected
   *
   * ### Database Transaction
   * 1. Begin transaction
   * 2. Create ecommerce_mall_shipments record with:
   *    - id: UUID (auto-generated)
   *    - ecommerce_mall_order_id: provided orderId
   *    - ecommerce_mall_seller_id: authenticated seller ID
   *    - carrier: provided carrier name
   *    - tracking_number: provided tracking number
   *    - created_at: current timestamp
   *    - updated_at: current timestamp
   *    - deleted_at: null
   * 3. For each orderItemId:
   *    - Create ecommerce_mall_shipment_items record
   *    - Update ecommerce_mall_order_items status to 'shipped'
   *    - Update ecommerce_mall_order_items updated_at timestamp
   * 4. Update ecommerce_mall_orders updated_at timestamp
   * 5. Commit transaction
   * 6. If any error occurs, rollback transaction and return appropriate error
   *
   * ### Error Handling
   * - 400 Bad Request: Invalid input, items not paid, items already shipped, items from different sellers
   * - 401 Unauthorized: Missing or invalid authentication
   * - 403 Forbidden: Order items do not belong to authenticated seller
   * - 404 Not Found: Order or order items not found
   * - 500 Internal Server Error: Database or transaction failure
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @SellerAuth()
    seller: SellerPayload,
    @TypedBody()
    body: IEcommerceMallShipment.ICreate,
  ): Promise<IEcommerceMallShipment> {
    try {
      return await postEcommerceMallSellerShipments({
        seller,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a filtered and paginated list of shipments.
   *
   * This operation provides advanced search capabilities for shipments including filtering by status, seller, order, carrier, and date range. Sellers can view their own shipments, and customers can view shipments for their orders.
   *
   * Sellers can filter by status (pending, shipped, delivered) to find shipments awaiting shipping or track delivered items. The carrier and tracking number filters help locate specific shipments. Date range filtering allows searching within specific time periods.
   *
   * Supports cursor-based pagination with configurable page sizes. The response includes shipment summary information optimized for list displays, showing carrier name, tracking number, and shipping date.
   *
   * This endpoint is the primary way for sellers to manage their shipment workflows and for customers to track their order deliveries.
   *
   * @param connection
   * @param body Search criteria and pagination parameters for shipments
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor seller
   * @x-autobe-specification Query ecommerce_mall_shipments table with pagination and filtering.
   *
   * Apply search filters based on provided criteria:
   * - Filter by status if provided (shipped, delivered)
   * - Filter by sellerId if provided (for seller-specific queries)
   * - Filter by orderId if provided (for order-specific shipment lookups)
   * - Filter by carrier if provided (partial match)
   * - Filter by created_at date range if provided
   *
   * Join with ecommerce_mall_orders for order information.
   * Join with ecommerce_mall_shipment_items to include item count per shipment.
   *
   * Order results by created_at descending (newest first).
   *
   * Return cursor-based pagination with configurable page sizes.
   *
   * Include shipment summary data: id, carrier, tracking_number, created_at, item_count.
   *
   * Verify actor permissions:
   * - Sellers can only view their own shipments (filter by authenticated seller ID)
   * - Customers can only view shipments for their own orders
   * - Admins can view all shipments
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @SellerAuth()
    seller: SellerPayload,
    @TypedBody()
    body: IEcommerceMallShipment.IRequest,
  ): Promise<IPageIEcommerceMallShipment.ISummary> {
    try {
      return await patchEcommerceMallSellerShipments({
        seller,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve detailed information about a specific shipment by its unique identifier.
   *
   * This endpoint returns the complete shipment record including the carrier name, tracking number, shipping timestamp, and all order items included in the shipment. The response includes nested data structures providing context about the parent order and the seller who created the shipment.
   *
   * The shipment belongs to an order and contains one or more order items bundled together by the seller. Each shipment item links to the original order item through the ecommerce_mall_shipment_items junction table, which maintains the many-to-many relationship between shipments and order items.
   *
   * Security and access control: Only the seller who created the shipment or the customer who owns the parent order can access this endpoint. The shipment includes soft delete support via the deleted_at timestamp field, and deleted shipments are not accessible through this endpoint.
   *
   * The tracking information (carrier name and tracking number) enables customers to monitor delivery progress through external carrier tracking systems. The created_at timestamp indicates when the seller shipped the package.
   *
   * Related operations:
   * - POST /shipments to create new shipments (seller only)
   * - GET /orders/{orderId}/shipments to list all shipments for an order
   * - POST /orders/{orderId}/shipments/{shipmentId}/confirm-delivery to confirm delivery receipt
   *
   * This endpoint does not modify any data; it is a read-only operation that returns the current state of the shipment and its associated records.
   *
   * @param connection
   * @param shipmentId Unique identifier of the shipment to retrieve
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor seller
   * @x-autobe-specification Query the ecommerce_mall_shipments table using the provided shipmentId as the primary key.
   *
   * 1. Validate that the shipment exists and has not been soft deleted (deleted_at IS NULL).
   * 2. Load the associated order information (ecommerce_mall_orders) to verify ownership and provide context.
   * 3. Load the associated seller information (ecommerce_mall_sellers) for seller details.
   * 4. Load all shipment items (ecommerce_mall_shipment_items) linked to this shipment.
   * 5. For each shipment item, load the associated order item (ecommerce_mall_order_items) with product snapshot information.
   * 6. Return the complete shipment data with nested arrays:
   *    - Shipment: id, orderId, sellerId, carrier, trackingNumber, createdAt, updatedAt
   *    - Order summary: id, orderNumber, status
   *    - Seller summary: id, shopName
   *    - ShipmentItems array: each containing order item details with product information
   *
   * If the shipment does not exist or is deleted, return a 404 error.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":shipmentId")
  public async at(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("shipmentId")
    shipmentId: string & tags.Format<"uuid">,
  ): Promise<IEcommerceMallShipment> {
    try {
      return await getEcommerceMallSellerShipmentsShipmentId({
        seller,
        shipmentId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update tracking information for an existing shipment.
   *
   * This endpoint allows sellers to modify the carrier name and tracking number of a shipment they have created. The seller can only update their own shipments, ensuring proper access control. If the shipment has been deleted (soft deleted), the operation returns a not found error.
   *
   * The shipment must belong to an order, and the tracking information is essential for customers to monitor delivery progress through external carrier systems. Sellers may need to update tracking numbers if they made errors during shipment creation or when carriers provide updated tracking codes.
   *
   * Authorization: Only the seller who created the shipment can update it. The system validates that the authenticated seller matches the shipment's ecommerce_mall_seller_id.
   *
   * Validation rules: Carrier name must not be empty, tracking number must not be empty. All order items within this shipment remain associated with the updated tracking information.
   *
   * Related operations: POST /seller/orders/items/:itemId/ship for creating shipments, GET /customers/orders/:orderId/shipments for viewing shipment tracking information.
   *
   * @param connection
   * @param shipmentId Unique identifier of the shipment to update
   * @param body Updated tracking information for the shipment
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor seller
   * @x-autobe-specification 1. Extract shipmentId from path parameter (UUID format)
   * 2. Authenticate the seller from the request session
   * 3. Query the ecommerce_mall_shipments table to find the shipment by id
   * 4. Verify shipment exists and is not soft-deleted (deleted_at IS NULL)
   * 5. Verify the authenticated seller matches ecommerce_mall_seller_id
   * 6. Validate request body: carrier and trackingNumber are required and non-empty
   * 7. Update the shipment record with new carrier and tracking_number values
   * 8. Update the updated_at timestamp
   * 9. Return the updated shipment entity with related order and seller information
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":shipmentId")
  public async update(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("shipmentId")
    shipmentId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IEcommerceMallShipment.IUpdate,
  ): Promise<IEcommerceMallShipment> {
    try {
      return await putEcommerceMallSellerShipmentsShipmentId({
        seller,
        shipmentId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently removes a shipment from the system.
   *
   * This operation performs a soft delete on the specified shipment, marking it as deleted without physically removing the record from the database. The shipment record remains in the database for audit and historical reference purposes but will no longer appear in active shipment listings.
   *
   * Only sellers who created the shipment or administrators with appropriate permissions can delete a shipment. Sellers can only delete shipments they created, while administrators can delete any shipment.
   *
   * Shipments that have been delivered to customers cannot be deleted. If delivery confirmation has been processed, the shipment must remain accessible for customer reference. Attempting to delete a delivered shipment returns an error.
   *
   * Deleting a shipment does not revert the order item statuses back to paid. The order items remain in their current shipped status. If a seller needs to cancel shipped items, they must process a cancellation request through the appropriate workflow.
   *
   * The system validates that the shipment exists and is not already deleted before performing the operation. If the shipment has already been deleted or does not exist, the operation returns an appropriate error response.
   *
   * @param connection
   * @param shipmentId Unique identifier of the shipment to delete
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor seller
   * @x-autobe-specification Retrieve the shipment by shipmentId and verify it exists and is not already deleted. If shipment is not found or already deleted, return 404 error.
   *
   * Verify the requesting user has permission to delete the shipment. For sellers: verify ecommerce_mall_seller_id matches the authenticated seller. For admins: allow deletion of any shipment. Return 403 if unauthorized.
   *
   * Check if shipment has been delivered by examining related order items and delivery status. If delivery has been confirmed, return 400 error with message indicating shipment cannot be deleted after delivery confirmation.
   *
   * Perform soft delete by setting deleted_at to current timestamp. Do not modify carrier, tracking_number, or any other fields.
   *
   * Return 204 No Content on successful deletion.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":shipmentId")
  public async erase(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("shipmentId")
    shipmentId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteEcommerceMallSellerShipmentsShipmentId({
        seller,
        shipmentId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
