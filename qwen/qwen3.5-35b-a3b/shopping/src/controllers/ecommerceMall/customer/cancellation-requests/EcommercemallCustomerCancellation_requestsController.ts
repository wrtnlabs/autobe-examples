import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IEcommerceMallCancellationRequest } from "../../../../api/structures/IEcommerceMallCancellationRequest";
import { IPageIEcommerceMallCancellationRequest } from "../../../../api/structures/IPageIEcommerceMallCancellationRequest";
import { CustomerAuth } from "../../../../decorators/CustomerAuth";
import { CustomerPayload } from "../../../../decorators/payload/CustomerPayload";
import { getEcommerceMallCustomerCancellationRequestsCancellationRequestId } from "../../../../providers/getEcommerceMallCustomerCancellationRequestsCancellationRequestId";
import { patchEcommerceMallCustomerCancellationRequests } from "../../../../providers/patchEcommerceMallCustomerCancellationRequests";
import { postEcommerceMallCustomerCancellationRequests } from "../../../../providers/postEcommerceMallCustomerCancellationRequests";

@Controller("/ecommerceMall/customer/cancellation-requests")
export class EcommercemallCustomerCancellation_requestsController {
  /**
   * Create a new cancellation request for an order item that has been paid but not yet shipped.
   *
   * This operation allows customers to request cancellation of specific order items within their orders. Customers can cancel individual items without cancelling the entire order, providing flexibility for selective order modifications.
   *
   * The cancellation request workflow proceeds as follows:
   * 1. Customer submits request with order item reference and cancellation reason
   * 2. System validates the order item has paid status and has not been shipped
   * 3. Request is created with pending status and seller reference
   * 4. Seller receives notification and can approve or reject the request
   * 5. Upon seller approval, the order item is cancelled and inventory is restored
   * 6. Upon seller rejection, the order item continues normal processing
   *
   * Customers cannot modify or withdraw a cancellation request after submission. The request remains in its assigned status (pending, approved, or rejected) until the seller responds.
   *
   * Related operations:
   * - GET /cancellation-requests/{requestId}: Retrieve specific cancellation request details
   * - PATCH /cancellation-requests: List and search customer's cancellation requests
   * - GET /orders/{orderId}/items/{itemId}/cancellation-requests: Retrieve all cancellation requests for an order item
   *
   * @param connection
   * @param body Cancellation request creation data. Includes the order item to cancel and the reason for cancellation.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification Service layer implementation for creating cancellation requests:
   *
   * 1. Authentication: Extract customer_id from JWT token authentication middleware
   *
   * 2. Request body validation:
   *    - Validate order_item_id is provided and is a valid UUID
   *    - Validate reason is provided, non-empty, and does not exceed 1000 characters
   *    - Validate order_item_id references existing order item
   *
   * 3. Pre-creation checks:
   *    - Query order item by order_item_id
   *    - Verify order item's parent order status indicates paid
   *    - Verify order item has not been shipped (check shipment status or order status)
   *    - Verify order item has no existing active cancellation request (pending or approved status)
   *    - Verify order item's seller_id is captured for seller notification
   *    - Verify order item is not already cancelled or refunded
   *
   * 4. Business rule enforcement:
   *    - Reject if order item status is not 'paid' with error message 'Item cannot be cancelled because it is not in paid status'
   *    - Reject if order item has been shipped with error message 'Item cannot be cancelled because it has already been shipped'
   *    - Reject if order item has no status or status is cancelled, refunded, or delivered with error message 'Item cannot be cancelled because it is no longer eligible for cancellation'
   *    - Reject if customer_id does not match order item's customer_id with error message 'Cancellation request denied: Customer does not own this order item'
   *
   * 5. Data creation:
   *    - Generate UUID for new cancellation request id
   *    - Create record with order_item_id, customer_id, seller_id (from order item), status='pending', reason
   *    - Set created_at and updated_at to current UTC timestamp
   *    - Do not set deleted_at (active record)
   *    - Do not set seller_response (still pending)
   *
   * 6. Transaction handling:
   *    - Begin database transaction
   *    - Validate all pre-conditions
   *    - Insert new cancellation request
   *    - Commit transaction
   *    - If validation fails, rollback transaction and return 400 error
   *
   * 7. Response formatting:
   *    - Return 201 Created with full cancellation request object including id, order_item_id, customer_id, seller_id, status='pending', reason, seller_response=null, created_at, updated_at
   *
   * 8. Error responses:
   *    - 400 Bad Request: Validation errors (invalid UUID, missing fields, reason too long, item not in eligible status, item already shipped, item already cancelled/refunded, customer mismatch)
   *    - 404 Not Found: Order item does not exist
   *    - 409 Conflict: Cancellation request already exists for this order item
   *    - 401 Unauthorized: No authentication provided
   *    - 403 Forbidden: Token represents different customer than order item owner
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
   * Retrieve a filtered and paginated list of cancellation requests with advanced search capabilities.
   *
   * This operation provides comprehensive list retrieval for cancellation requests with support for filtering by status (pending, approved, rejected), date ranges, and order item association. The response includes paginated results with summary information optimized for list displays, including order item details, status, creation date, and cancellation reason.
   *
   * Results can be sorted by creation date, status, or customer name. Pagination limits the number of cancellation requests displayed per page while maintaining navigation controls for browsing through larger result sets.
   *
   * Cancellation requests are created when customers want to cancel order items before shipment. Each request includes the customer's reason and awaits seller approval or rejection. The seller's response is stored when they approve or reject the request.
   *
   * @param connection
   * @param body Search criteria and pagination parameters for cancellation requests
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification Query ecommerce_mall_cancellation_requests table with pagination and filtering.
   *
   * Filtering Logic:
   * - Apply status filter if provided (pending, approved, rejected)
   * - Apply customer_id filter when authenticated customer requests their own data (only their own requests)
   * - Apply seller_id filter when authenticated seller requests data (requests for their products)
   * - Apply admin bypass for admin actors to see all requests
   * - Filter by date range (created_at between from and to) if provided
   * - Filter by order_item_id if provided
   *
   * Sorting Logic:
   * - Default sort by created_at descending (newest first)
   * - Support sorting by status, customer_name, created_at
   *
   * Pagination Logic:
   * - Implement cursor-based or offset-based pagination
   * - Default page size: 20, maximum: 100
   * - Return total count for pagination metadata
   *
   * Access Control:
   * - Customer actor: filter by customer_id = authenticated user id
   * - Seller actor: join with order_items to find requests for seller's products, filter by seller_id
   * - Admin actor: no customer/seller filtering
   * - Guest: 401 Unauthorized
   *
   * Business Rules:
   * - Only return non-deleted records (deleted_at IS NULL)
   * - Include related customer and order item summary data
   * - Denormalize customer display name and product name for list display
   *
   * Performance:
   * - Use indexes on customer_id, seller_id, status, created_at
   * - Avoid N+1 queries by eager loading related customer and order item data
   * - Consider materialized views for high-volume cancellation request listings
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
   * Retrieve a specific cancellation request by its unique identifier.
   *
   * This operation returns the complete details of a cancellation request including the customer who submitted it, the seller responsible for responding, and the order item targeted for cancellation. The response includes the current status (pending, approved, or rejected), the customer's cancellation reason, and if the request has been processed, the seller's response.
   *
   * Only the customer who created the request or the seller who must respond to it can access this cancellation request. Attempting to retrieve a cancellation request without proper authorization will result in an access denied error.
   *
   * The cancellation request entity includes immutable audit information with creation and update timestamps. If the request has been soft-deleted, it will not be returned in this retrieval operation.
   *
   * @param connection
   * @param cancellationRequestId The unique identifier of the cancellation request to retrieve
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification Query the ecommerce_mall_cancellation_requests table for the record matching the provided cancellationRequestId UUID.
   *
   * 1. Validate that the cancellationRequestId is a valid UUID format
   * 2. Execute SELECT query filtering by id = cancellationRequestId AND deleted_at IS NULL
   * 3. Join with ecommerce_mall_customers to include customer information
   * 4. Join with ecommerce_mall_sellers to include seller information
   * 5. Join with ecommerce_mall_order_items to include order item information
   * 6. If record not found, return 404 Not Found
   * 7. Verify authorization: confirm the requesting user is either the customer who created the request, the seller responsible for responding, or has admin privileges
   * 8. Return the complete cancellation request object with all fields populated
   *
   * Authorization logic:
   * - Customer actors: Only retrieve cancellation requests where customer_id matches the authenticated user's ID
   * - Seller actors: Only retrieve cancellation requests where seller_id matches the authenticated user's ID
   * - Admin actors: Can retrieve any cancellation request
   *
   * Error handling:
   * - 404: Cancellation request not found or has been deleted
   * - 403: Unauthorized access attempt
   * - 400: Invalid UUID format for cancellationRequestId
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":cancellationRequestId")
  public async at(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedParam("cancellationRequestId")
    cancellationRequestId: string & tags.Format<"uuid">,
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
