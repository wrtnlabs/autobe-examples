import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIShoppingMallCancellationRequest } from "../../../../api/structures/IPageIShoppingMallCancellationRequest";
import { IShoppingMallCancellationRequest } from "../../../../api/structures/IShoppingMallCancellationRequest";
import { CustomerAuth } from "../../../../decorators/CustomerAuth";
import { CustomerPayload } from "../../../../decorators/payload/CustomerPayload";
import { getShoppingMallCustomerCancellationRequestsCancellationRequestId } from "../../../../providers/getShoppingMallCustomerCancellationRequestsCancellationRequestId";
import { patchShoppingMallCustomerCancellationRequests } from "../../../../providers/patchShoppingMallCustomerCancellationRequests";
import { postShoppingMallCustomerCancellationRequests } from "../../../../providers/postShoppingMallCustomerCancellationRequests";

@Controller("/shoppingMall/customer/cancellation-requests")
export class ShoppingmallCustomerCancellation_requestsController {
  /**
   * Creates a new cancellation request for an order item that has not yet been shipped.
   *
   * Customers can request cancellation for individual order items that are in 'paid' status. Each cancellation request requires a reason explaining why the customer wants to cancel the item. The request is submitted to the seller who owns the order item for approval or rejection. Once submitted, the cancellation request enters a 'pending' status until the seller responds.
   *
   * Cancellation requests can only be created for order items with 'paid' status. Items that have already been shipped, delivered, cancelled, or refunded cannot be cancelled through this process. The system validates the order item's status and ownership before creating the request. If a cancellation request for the same item already exists (pending, approved, or rejected), the system prevents duplicate requests.
   *
   * When a seller approves a cancellation request, the order item status changes to 'cancelled' and inventory is restored. If rejected, the item continues normal processing. The system automatically creates an immutable snapshot of the cancellation request when the seller responds, preserving the decision and timing for dispute resolution.
   *
   * @param connection
   * @param body Cancellation request details including the order item to cancel and the customer's reason for requesting cancellation.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor customer
     * @x-autobe-specification Implementation steps for creating a cancellation
     *   request:
   *
   * 1. **Authentication & Authorization**: Verify the request is from an authenticated customer. Extract customer ID from the session.
   *
   * 2. **Input Validation**:
   *    - Validate orderItemId is a valid UUID format
   *    - Validate reason is a non-empty string (trim whitespace, reject if empty after trim)
   *    - Ensure reason meets minimum length requirements (e.g., at least 10 characters)
   *
   * 3. **Order Item Lookup**: Query shopping_mall_order_items table for the order item by ID:
   *    - Verify the order item exists and is not soft-deleted
   *    - Verify the order item's order belongs to the authenticated customer (join with shopping_mall_orders to check shopping_mall_customer_id)
   *    - Verify the order item status is 'paid' (not 'shipped', 'delivered', 'cancelled', or 'refunded')
   *
   * 4. **Duplicate Request Check**: Query shopping_mall_cancellation_requests to ensure no existing cancellation request exists for this order item:
   *    - Check for any request with the same shopping_mall_order_item_id that is not soft-deleted
   *    - If a request exists (regardless of status: pending, approved, or rejected), reject with appropriate error message
   *
   * 5. **Create Cancellation Request**: Insert new record into shopping_mall_cancellation_requests:
   *    - id: Generate new UUID
   *    - shopping_mall_customer_id: Set to authenticated customer's ID
   *    - shopping_mall_order_item_id: Set to the validated order item ID
   *    - status: Set to 'pending'
   *    - reason: Set to the trimmed reason text from request
   *    - response_reason: Set to NULL (will be populated when seller responds)
   *    - created_at: Set to current timestamp
   *    - updated_at: Set to current timestamp
   *    - deleted_at: Set to NULL
   *
   * 6. **Response**: Return the created cancellation request object with all fields except sensitive data.
   *
   * 7. **Error Handling**:
   *    - 401 Unauthorized: If customer is not authenticated
   *    - 400 Bad Request: If reason is missing, empty, or too short
   *    - 400 Bad Request: If orderItemId is invalid UUID format
   *    - 404 Not Found: If order item does not exist
   *    - 403 Forbidden: If order item does not belong to the authenticated customer
   *    - 409 Conflict: If order item status is not 'paid' (provide specific status in error)
   *    - 409 Conflict: If a cancellation request already exists for this order item
   *
   * 8. **Transaction Management**: Wrap the creation in a database transaction to ensure data consistency. Rollback on any validation failure.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedBody()
    body: IShoppingMallCancellationRequest.ICreate,
  ): Promise<IShoppingMallCancellationRequest> {
    try {
      return await postShoppingMallCustomerCancellationRequests({
        customer,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Search and list cancellation requests with filtering and pagination support.
   *
   * This endpoint allows users to retrieve cancellation requests based on various criteria including status, date range, and user context. Customers can view their own cancellation requests, sellers can view requests for their order items, and administrators can view all requests on the platform.
   *
   * Cancellation requests represent customer requests to cancel individual order items that are in paid status (not yet shipped). Each request includes a reason from the customer and is processed by the seller who owns the order item. Requests have three possible statuses: pending (awaiting seller response), approved (seller approved, item will be cancelled), or rejected (seller rejected the request).
   *
   * @param connection
   * @param body Search criteria including status filter, date range, pagination parameters, and sorting options for cancellation requests.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor customer
     * @x-autobe-specification Query shopping_mall_cancellation_requests table
     *   with pagination and filtering support.
   *
   * Apply filters based on request body:
   * - status: Filter by cancellation status (pending, approved, rejected)
   * - customerId: Filter by specific customer (for customer viewing their own requests)
   * - sellerId: Filter by specific seller (for seller viewing requests for their items)
   * - orderId: Filter by specific order
   * - createdAt range: Filter by creation date range
   *
   * Authorization:
   * - Customers can only view their own cancellation requests (filter by authenticated customer_id)
   * - Sellers can only view cancellation requests for their order items (join with shopping_mall_order_items to filter by seller_id)
   * - Administrators can view all cancellation requests without restrictions
   *
   * Join with shopping_mall_order_items to include order item information (order_number, product_variant_id, status, quantity, price)
   * Join with shopping_mall_customers to include customer information (email, display_name)
   *
   * Return cursor-based pagination for large result sets.
   * Sort by created_at descending by default (newest first).
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedBody()
    body: IShoppingMallCancellationRequest.IRequest,
  ): Promise<IPageIShoppingMallCancellationRequest.ISummary> {
    try {
      return await patchShoppingMallCustomerCancellationRequests({
        customer,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieves a single cancellation request by its unique identifier.
   *
   * This endpoint returns complete details of a cancellation request including the customer's reason, current status (pending, approved, or rejected), seller's response if provided, and all associated snapshots tracking status changes. The response includes the related customer information, order item details, and chronological snapshots of the request lifecycle.
   *
   * Customers can use this to check the status of their cancellation requests. Sellers can view requests for their order items to process approvals or rejections. The operation enforces authorization so users can only access requests they own or are responsible for.
   *
   * @param connection
   * @param cancellationRequestId Unique identifier of the cancellation request to retrieve (global scope).
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor customer
     * @x-autobe-specification Query the shopping_mall_cancellation_requests
     *   table for the record matching the provided cancellationRequestId.
   *
   * Join with shopping_mall_customers to include customer details (email, display name, account status).
   *
   * Join with shopping_mall_order_items to include order item details (order reference, product variant, quantity, price, current status).
   *
   * Join with shopping_mall_cancellation_request_snapshots to include all snapshots for this request, ordered by created_at ascending.
   *
   * Validate authorization:
   * - If caller is customer: verify shopping_mall_customer_id matches caller's ID
   * - If caller is seller: verify the order item's shopping_mall_seller_id matches caller's ID
   * - If caller is administrator: allow access to any request
   *
   * Return 404 if the cancellation request does not exist or has been soft deleted (deleted_at is not null).
   *
   * Return 403 if the caller is not authorized to view this request.
   *
   * Include all fields: id, shopping_mall_customer_id, shopping_mall_order_item_id, status, reason, response_reason, created_at, updated_at.
   *
   * Include nested customer object with id, email, display_name, account_status.
   *
   * Include nested orderItem object with id, shopping_mall_order_id, shopping_mall_product_variant_id, quantity, price, status.
   *
   * Include snapshots array with id, status_before, status_after, seller_response, created_at.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":cancellationRequestId")
  public async at(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedParam("cancellationRequestId")
    cancellationRequestId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallCancellationRequest> {
    try {
      return await getShoppingMallCustomerCancellationRequestsCancellationRequestId(
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
