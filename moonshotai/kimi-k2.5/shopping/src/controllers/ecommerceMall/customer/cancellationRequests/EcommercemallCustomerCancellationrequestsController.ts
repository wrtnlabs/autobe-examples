import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia from "typia";

import { IEcommerceMallCancellationRequest } from "../../../../api/structures/IEcommerceMallCancellationRequest";
import { IPageIEcommerceMallCancellationRequest } from "../../../../api/structures/IPageIEcommerceMallCancellationRequest";
import { CustomerAuth } from "../../../../decorators/CustomerAuth";
import { CustomerPayload } from "../../../../decorators/payload/CustomerPayload";
import { getEcommerceMallCustomerCancellationRequestsCancellationRequestId } from "../../../../providers/getEcommerceMallCustomerCancellationRequestsCancellationRequestId";
import { patchEcommerceMallCustomerCancellationRequests } from "../../../../providers/patchEcommerceMallCustomerCancellationRequests";
import { postEcommerceMallCustomerCancellationRequests } from "../../../../providers/postEcommerceMallCustomerCancellationRequests";

@Controller("/ecommerceMall/customer/cancellationRequests")
export class EcommercemallCustomerCancellationrequestsController {
  /**
   * Create a new cancellation request for a paid order item that has not yet been shipped.
   *
   * This operation allows customers to formally request cancellation of an individual order item before it enters the shipping process. Cancellation requests operate at the item level, allowing customers to cancel specific items while allowing other items in the same order to continue processing normally.
   *
   * **Business Context**
   * Cancellation requests are only valid for order items in the 'paid' status. Once an item has been shipped, the cancellation mechanism is no longer applicable and this endpoint will reject the request. The customer must provide a text reason explaining why they want to cancel the item.
   *
   * Upon successful creation, the cancellation request is stored with status 'pending'. The system automatically assigns the seller of the order item as the responding party. The seller will then be able to view and respond to this request via their dashboard.
   *
   * **Validation Rules**
   * - The order item must exist and belong to the authenticated customer
   * - The order item must have status 'paid' (not shipped, delivered, cancelled, or refunded)
   * - The cancellation reason is mandatory and cannot be empty
   * - If there is already a pending cancellation request for this order item, the request will be rejected
   *
   * **Related Operations**
   * - GET /cancellationRequests/{cancellationRequestId} - Retrieve details of a specific cancellation request
   * - PATCH /cancellationRequests - List/search cancellation requests (customer view, seller view, or admin view with filtering)
   * - PUT /cancellationRequests/{cancellationRequestId} - Seller responds to the request (approve/reject)
   *
   * @param connection
   * @param body Cancellation request creation data containing the order item ID to cancel and the customer's reason for cancellation
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification Implementation: POST /cancellationRequests
   *
   * 1. **Authentication**: Verify customer JWT token from Authorization header
   *
   * 2. **Request Body Validation**:
   *    - Validate IEcommerceMallCancellationRequest.ICreate structure
   *    - Required fields: orderItemId (UUID), reason (string)
   *    - Reason must be non-empty string (min length 1)
   *
   * 3. **Business Logic**:
   *    - Fetch the order item by orderItemId from ecommerce_mall_order_items
   *    - Verify order_item.customer_id matches authenticated customer
   *    - Verify order_item.status equals 'paid' (rejected if shipped, delivered, cancelled, refunded)
   *    - Check no existing pending cancellation request exists for this order_item_id
   *    - Fetch the seller_id from the order item (seller who owns the product)
   *
   * 4. **Database Transaction**:
   *    - Generate UUID for new cancellation request
   *    - Insert into ecommerce_mall_cancellation_requests with:
   *      - id: generated UUID
   *      - order_item_id: from request
   *      - customer_id: authenticated customer
   *      - seller_id: from order item
   *      - reason: from request
   *      - status: 'pending'
   *      - created_at: current timestamp
   *      - updated_at: current timestamp
   *    - No snapshot created at this point (snapshots created on approval/rejection)
   *
   * 5. **Error Handling**:
   *    - 400: Missing or empty reason, invalid order_item_id format
   *    - 403: Order item does not belong to authenticated customer
   *    - 409: Order item not in 'paid' status, or pending cancellation request already exists
   *    - 404: Order item not found
   *
   * 6. **Response**:
   *    - Return complete IEcommerceMallCancellationRequest entity
   *    - Include all fields: id, orderItemId, customerId, sellerId, reason, status, responseReason, respondedAt, createdAt, updatedAt
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedBody()
    body: IEcommerceMallCancellationRequest.ICreate,
  ): Promise<IEcommerceMallCancellationRequest> {
    try {
      return await postEcommerceMallCustomerCancellationRequests({
        customer,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a paginated list of cancellation requests with filtering and sorting capabilities.
   *
   * This endpoint allows authorized users to search and browse cancellation requests based on their role. Customers can view requests they submitted, sellers can view requests for their order items, and administrators can view all requests on the platform.
   *
   * The response includes cancellation request summaries with essential information: order item details, current status (pending, approved, rejected), reason provided by the customer, and timestamps. Response includes snapshots showing the decision history for each request.
   *
   * Filtering supports status-based queries to find pending requests awaiting response, approved requests that resulted in inventory restoration, or rejected requests. Date range filtering allows finding requests by creation or response timeframes.
   *
   * Authorization is role-based: customers see only their own requests, sellers see requests for their order items, administrators see all requests. Unauthorized access to other users' requests is prohibited.
   *
   * @param connection
   * @param body Search criteria and pagination parameters for filtering cancellation requests by status, date ranges, and related entities
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification Query ecommerce_mall_cancellation_requests table with role-based filtering and pagination.
   *
   * Authorization logic:
   * - If customer: filter by customer_id matching authenticated customer
   * - If seller: filter by seller_id matching authenticated seller
   * - If admin/superAdmin: no additional ownership filter
   *
   * Supported filters in request body:
   * - status: 'pending' | 'approved' | 'rejected'
   * - customerId: UUID (admin only)
   * - sellerId: UUID (admin only)
   * - orderItemId: UUID
   * - createdAt range: from/to timestamps
   * - respondedAt range: from/to timestamps (for seller responses)
   *
   * Join relations:
   * - Join with ecommerce_mall_order_items for item details
   * - Join with ecommerce_mall_customers for customer info
   * - Join with ecommerce_mall_sellers for seller info
   * - Join with ecommerce_mall_cancellation_request_snapshots for history
   *
   * Pagination: cursor-based or offset-based with configurable page size (default 20, max 100).
   *
   * Sorting: by created_at (newest first default), by status, by responded_at.
   *
   * Return only non-deleted records (deleted_at is null).
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedBody()
    body: IEcommerceMallCancellationRequest.IRequest,
  ): Promise<IPageIEcommerceMallCancellationRequest.ISummary> {
    try {
      return await patchEcommerceMallCustomerCancellationRequests({
        customer,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single cancellation request by its unique identifier.
   *
   * This operation returns the complete details of a cancellation request, which represents a customer's formal petition to cancel a specific order item that has been paid for but not yet shipped. The cancellation request includes the customer's reason for cancellation, the current status (pending, approved, or rejected), and any seller response.
   *
   * **Authorization Rules:**
   * - Customers can access cancellation requests they submitted
   * - Sellers can access cancellation requests for order items belonging to their products
   * - Administrators and super administrators can access any cancellation request for oversight and dispute resolution
   *
   * **Related Data Included:**
   * The response includes nested information about the associated order item, the requesting customer, the responsible seller (if assigned), and the full history of snapshots capturing all state changes for audit purposes.
   *
   * **Business Context:**
   * Cancellation requests are only valid for order items in "paid" status. Once an item is shipped, the cancellation mechanism is no longer applicable. When a seller approves a cancellation request, the system automatically restores stock quantities for the affected product variant through an inventory record.
   *
   * @param connection
   * @param cancellationRequestId Unique identifier of the cancellation request (UUID format)
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification Implementation should:
   * 1. Extract cancellationRequestId from path parameters
   * 2. Verify actor authentication and authorization:
   *    - For customers: verify request belongs to authenticated customer via customer_id
   *    - For sellers: verify request is for seller's order item via seller_id
   *    - For admins: allow access to any request
   * 3. Query the ecommerce_mall_cancellation_requests table by primary key id
   * 4. Include relations: orderItem, customer, seller, snapshots
   * 5. Order snapshots by created_at descending for chronological history
   * 6. Return 404 if request not found or actor lacks permission
   * 7. Response includes complete entity with all fields: id, orderItemId, customerId, sellerId, reason, status, responseReason, respondedAt, createdAt, updatedAt, deletedAt
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":cancellationRequestId")
  public async at(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedParam("cancellationRequestId")
    cancellationRequestId: string,
  ): Promise<IEcommerceMallCancellationRequest> {
    try {
      return await getEcommerceMallCustomerCancellationRequestsCancellationRequestId(
        {
          customer,
          cancellationRequestId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
