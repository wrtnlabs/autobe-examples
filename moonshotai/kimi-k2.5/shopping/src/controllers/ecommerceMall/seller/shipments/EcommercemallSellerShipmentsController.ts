import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IEcommerceMallShipment } from "../../../../api/structures/IEcommerceMallShipment";
import { IPageIEcommerceMallShipment } from "../../../../api/structures/IPageIEcommerceMallShipment";
import { SellerAuth } from "../../../../decorators/SellerAuth";
import { SellerPayload } from "../../../../decorators/payload/SellerPayload";
import { getEcommerceMallSellerShipmentsShipmentId } from "../../../../providers/getEcommerceMallSellerShipmentsShipmentId";
import { patchEcommerceMallSellerShipments } from "../../../../providers/patchEcommerceMallSellerShipments";
import { postEcommerceMallSellerShipments } from "../../../../providers/postEcommerceMallSellerShipments";

@Controller("/ecommerceMall/seller/shipments")
export class EcommercemallSellerShipmentsController {
  /**
   * Create a new shipment for order items that are ready to be shipped.
   *
   * This endpoint allows sellers to group one or more paid order items into a single shipment package. Shipments represent physical packages sent to customers with tracking information.
   *
   * **Business Rules:**
   * - All order items in a shipment must belong to the same seller (enforced by the system)
   * - Only order items with status 'paid' can be included in a shipment
   * - At least one order item must be selected
   * - Carrier name and tracking number are required for customer tracking
   * - Different sellers' items cannot be combined - they must ship separately
   *
   * **Process:**
   * When a shipment is created, the system:
   * 1. Validates that all selected order items exist and have status 'paid'
   * 2. Creates the shipment record with carrier and tracking information
   * 3. Creates shipment_item junction records linking the shipment to each selected order item
   * 4. Updates all included order items' status from 'paid' to 'shipped'
   * 5. Records the shipped_at timestamp
   *
   * **Authorization:**
   * Only authenticated sellers can create shipments. The seller is identified from the JWT token. A seller can only create shipments containing their own order items.
   *
   * **Related Operations:**
   * Sellers typically view pending shipments first via a GET/PATCH endpoint filtering order items by status. Customers view shipment tracking through order detail endpoints.
   *
   * @param connection
   * @param body Shipment creation data containing order item IDs to include, carrier name, and tracking number
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor seller
   * @x-autobe-specification Implementation logic for creating shipments:
   *
   * 1. **Authentication Check**: Verify JWT token identifies an authenticated seller.
   *
   * 2. **Validation**:
   *    - Validate carrierName is non-empty string (max 100 chars)
   *    - Validate trackingNumber is non-empty string (max 100 chars)
   *    - Validate orderItemIds array is non-empty (at least one item)
   *    - Validate all orderItemIds are valid UUIDs
   *
   * 3. **Order Item Verification**:
   *    - Query ecommerce_mall_order_items for provided IDs
   *    - Verify all items exist
   *    - Verify all items have status = 'paid'
   *    - Verify all items belong to the authenticated seller (via seller_id)
   *    - Verify no item is already assigned to another shipment (check shipmentItem relation is null)
   *
   * 4. **Consistency Check**:
   *    - All items must belong to same order (optional business rule - they can span orders but more complex)
   *    - Based on requirements, items from same order would share customer/address
   *
   * 5. **Database Transaction**:
   *    - BEGIN TRANSACTION
   *    - Create shipment record in ecommerce_mall_shipments:
   *      - id: generate UUID
   *      - seller_id: from auth context
   *      - order_id: from first order item's order_id
   *      - carrier_name: from request
   *      - tracking_number: from request
   *      - shipped_at: current timestamp
   *      - created_at: current timestamp
   *      - updated_at: current timestamp
   *    - For each order_item_id:
   *      - Create ecommerce_mall_shipment_items record
   *      - Update ecommerce_mall_order_items.status to 'shipped'
   *      - Update ecommerce_mall_order_items.updated_at
   *    - COMMIT
   *
   * 6. **Order Status Update**:
   *    - After items are shipped, check if order status needs update
   *    - If any items shipped → order status becomes 'shipped' (if not already 'delivered')
   *
   * 7. **Response**:
   *    - Return shipment with nested shipmentItems containing order items
   *    - Include 201 status code
   *
   * **Error Cases:**
   * - 401: Unauthorized (not a seller)
   * - 400: Invalid order item IDs
   * - 400: Order items not found
   * - 400: Order items not in 'paid' status
   * - 400: Order items belong to different seller
   * - 400: Empty orderItemIds array
   * - 400: Missing carrierName or trackingNumber
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
   * Retrieve a paginated list of shipments with filtering and search capabilities.
   *
   * This operation provides comprehensive shipment tracking visibility for sellers and customers. Sellers can view all shipments they've created to monitor their fulfillment operations. Customers can view shipments associated with their orders to track delivery status.
   *
   * Shipments represent physical packages containing one or more order items from the same seller. Each shipment includes carrier information and tracking numbers for logistics monitoring. The system supports filtering by order, seller, carrier name, and shipping date ranges.
   *
   * Security and access control ensure users only see shipments relevant to them. Sellers see their own shipments (via seller_id). Customers see shipments for orders they placed (via order_id through order relationship). Administrators have full visibility across all shipments.
   *
   * This endpoint supports cursor-based pagination for efficient browsing of large result sets. Results can be sorted by shipping date, creation date, or other relevant fields.
   *
   * @param connection
   * @param body Search criteria and pagination parameters for filtering shipments
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor seller
   * @x-autobe-specification Query the ecommerce_mall_shipments table with pagination and filtering.
   *
   * Filter parameters from request body:
   * - orderId: Filter shipments for a specific customer order (customers use this)
   * - sellerId: Filter shipments by seller (admins use this, or sellers implicitly)
   * - carrierName: Partial match on carrier name (e.g., 'FedEx', 'UPS')
   * - trackingNumber: Exact or partial match on tracking number
   * - shippedAtFrom/shippedAtTo: Date range filtering on shipped_at
   *
   * Authorization checks:
   * - If customer actor: automatically filter by orders belonging to authenticated customer
   * - If seller actor: automatically filter by seller_id matching authenticated seller
   * - If admin/superAdmin: no automatic filtering, respect provided filters
   *
   * Include related data:
   * - Join with ecommerce_mall_shipment_items to get included order items count
   * - Join with ecommerce_mall_orders for order_number (if accessible)
   * - Join with ecommerce_mall_shipment_deliveries to include delivery status
   *
   * Return IPageIEcommerceMallShipment.ISummary with:
   * - id, sellerId, orderId, carrierName, trackingNumber
   * - shippedAt, createdAt, updatedAt
   * - delivery status (if delivered), deliveredAt
   * - item count (number of order items in shipment)
   *
   * Use cursor-based pagination for efficient large dataset handling.
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
   * Retrieve detailed information for a specific shipment.
   *
   * This operation returns comprehensive details about a shipment, including tracking information (carrier name and tracking number), shipping timestamp, and the associated order items bundled in this shipment. Sellers use this endpoint to review their shipments, while customers use it to track package delivery status.
   *
   * The response includes the complete shipment entity with its associated order items through the shipment items junction table. Each order item in the shipment includes product details at the time of purchase through the preserved snapshots. Delivery confirmation information is also included when available.
   *
   * Authorization: Sellers can only view shipments they created. Customers can view shipments for their orders. Administrators can view any shipment.
   *
   * @param connection
   * @param shipmentId Unique identifier of the shipment to retrieve
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor seller
   * @x-autobe-specification Implementation Steps:
   *
   * 1. **Path Parameter Validation**
   *    - shipmentId must be a valid UUID string
   *    - Return 400 Bad Request if format is invalid
   *
   * 2. **Authentication Check**
   *    - Validate JWT token from Authorization header
   *    - Extract caller actor type (seller, customer, admin)
   *
   * 3. **Shipment Retrieval**
   *    - Query ecommerce_mall_shipments by id = shipmentId
   *    - Include related entities:
   *      * seller (ecommerce_mall_sellers)
   *      * order (ecommerce_mall_orders)
   *      * shipmentItems → orderItem (ecommerce_mall_order_items with product snapshots)
   *      * delivery (ecommerce_mall_shipment_deliveries if exists)
   *
   * 4. **Authorization Checks**
   *    - If actor is seller: verify shipment.seller_id matches caller's seller ID
   *    - If actor is customer: verify shipment.order.customer_id matches caller's customer ID
   *    - Admin/SuperAdmin: unrestricted access
   *    - Return 403 Forbidden if unauthorized
   *
   * 5. **Data Assembly**
   *    - Map DB fields to IEcommerceMallShipment structure
   *    - For each shipmentItem, load the orderItem with its productVariantSnapshot and productSnapshot
   *    - Include delivery record if exists
   *
   * 6. **Response Construction**
   *    - Return complete IEcommerceMallShipment JSON response
   *    - Status 200 OK
   *
   * Edge Cases:
   * - 404 Not Found: Shipment doesn't exist or has been soft-deleted
   * - 403 Forbidden: User attempting to view another seller's/customer's shipment
   * - 401 Unauthorized: Missing or invalid authentication token
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
}
