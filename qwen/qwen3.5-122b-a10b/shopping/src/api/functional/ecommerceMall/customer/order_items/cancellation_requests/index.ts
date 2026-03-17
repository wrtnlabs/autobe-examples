import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IEcommerceMallOrderItemCancellationRequest } from "../../../../../structures/IEcommerceMallOrderItemCancellationRequest";
import { IPageIEcommerceMallOrderItemCancellationRequest } from "../../../../../structures/IPageIEcommerceMallOrderItemCancellationRequest";

/**
 * Create a cancellation request for an order item that has 'paid' status.
 *
 * This operation allows customers to request cancellation of order items that have not yet been shipped. The customer must provide a reason explaining why they want to cancel the order item. The system validates that the order item exists, belongs to the customer, and has 'paid' status (not shipped, delivered, cancelled, or refunded).
 *
 * Upon successful validation, the system creates a cancellation request record with 'pending' status and records the submission timestamp. The seller is notified of the pending cancellation request and can review the customer's reason before approving or rejecting it.
 *
 * **Eligibility Requirements:**
 *
 * - The order item must have status 'paid' (payment completed but not yet shipped)
 * - The order item must belong to the authenticated customer
 * - No existing cancellation request must exist for this order item
 * - The order item must not be in 'shipped', 'delivered', 'cancelled', or 'refunded' status
 *
 * **Business Workflow:**
 *
 * 1. Customer submits cancellation request with reason
 * 2. System validates order item eligibility
 * 3. Cancellation request is created with 'pending' status
 * 4. Seller receives notification of pending request
 * 5. Seller reviews and responds (approve or reject)
 * 6. If approved: order item status changes to 'cancelled' and stock is restored via inventory record
 * 7. If rejected: cancellation request status changes to 'rejected' and order item continues processing
 *
 * **Related Operations:**
 *
 * - `GET /order-items/{orderItemId}` - Retrieve order item details to verify eligibility before submitting cancellation request
 * - `PATCH /order-items/{orderItemId}/cancellation-requests/{requestId}` - Seller responds to pending cancellation request (approve or reject)
 * - `GET /order-items/{orderItemId}/cancellation-requests` - View cancellation request status for an order item
 *
 * @param props.connection
 * @param props.orderItemId Target order item's unique identifier (UUID format)
 * @param props.body Cancellation request creation information including customer-provided reason
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification Service layer implementation for creating order item cancellation requests:
 *
 * 1. **Authentication & Authorization:**
 *    - Extract customer ID from authenticated session
 *    - Verify customer owns the order item (join order_items with orders to check customer_id)
 *
 * 2. **Eligibility Validation:**
 *    - Query order_items table by orderItemId
 *    - Verify order item status is 'paid'
 *    - Check no existing cancellation request exists (query cancellation_requests where order_item_id = {orderItemId} and deleted_at IS NULL)
 *    - Verify order item is not in terminal states (shipped, delivered, cancelled, refunded)
 *
 * 3. **Create Cancellation Request:**
 *    - Generate UUID for cancellation request ID
 *    - Insert record into ecommerce_mall_order_item_cancellation_requests:
 *      - order_item_id: {orderItemId}
 *      - reason: from request body
 *      - status: 'pending'
 *      - requested_at: current server timestamp
 *    - Wrap in database transaction
 *
 * 4. **Concurrency Control:**
 *    - Acquire exclusive lock on order item during validation and creation
 *    - Prevent concurrent cancellation requests on same order item
 *    - Release lock after transaction commits
 *
 * 5. **Post-Creation Actions:**
 *    - Create snapshot of cancellation request state (optional, per requirements)
 *    - Trigger seller notification event (async job)
 *    - Return created cancellation request with all fields
 *
 * 6. **Error Handling:**
 *    - 404: Order item not found
 *    - 403: Order item does not belong to customer
 *    - 409: Cancellation request already exists for this order item
 *    - 422: Order item not eligible for cancellation (status is not 'paid')
 *    - 500: Database transaction failure
 *
 * 7. **Database Queries:**
 *    - SELECT * FROM ecommerce_mall_order_items WHERE id = {orderItemId} AND deleted_at IS NULL
 *    - SELECT COUNT(*) FROM ecommerce_mall_order_item_cancellation_requests WHERE order_item_id = {orderItemId} AND deleted_at IS NULL
 *    - INSERT INTO ecommerce_mall_order_item_cancellation_requests (id, order_item_id, reason, status, requested_at, created_at, updated_at) VALUES (...)
 * @path /ecommerceMall/customer/order-items/:orderItemId/cancellation-requests
 * @accessor api.functional.ecommerceMall.customer.order_items.cancellation_requests.create
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function create(
  connection: IConnection,
  props: create.Props,
): Promise<create.Response> {
  return true === connection.simulate
    ? create.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...create.METADATA,
          path: create.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace create {
  export type Props = {
    /**
     * Target order item's unique identifier (UUID format)
     */
    orderItemId: string & tags.Format<"uuid">;

    /**
     * Cancellation request creation information including customer-provided reason
     */
    body: IEcommerceMallOrderItemCancellationRequest.ICreate;
  };
  export type Body = IEcommerceMallOrderItemCancellationRequest.ICreate;
  export type Response = IEcommerceMallOrderItemCancellationRequest;

  export const METADATA = {
    method: "POST",
    path: "/ecommerceMall/customer/order-items/:orderItemId/cancellation-requests",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Omit<Props, "body">) =>
    `/ecommerceMall/customer/order-items/${encodeURIComponent(props.orderItemId ?? "null")}/cancellation-requests`;
  export const random = (): IEcommerceMallOrderItemCancellationRequest =>
    typia.random<IEcommerceMallOrderItemCancellationRequest>();
  export const simulate = (
    connection: IConnection,
    props: create.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: create.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("orderItemId")(() => typia.assert(props.orderItemId));
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Retrieve a filtered and paginated list of cancellation requests for a specific order item.
 *
 * This operation allows customers to view their cancellation request history for a particular order item, sellers to review pending and historical cancellation requests for their products' order items, and administrators to oversee all cancellation requests across the platform.
 *
 * Each cancellation request represents a customer's formal request to cancel an order item with 'paid' status before it has been shipped. The request includes the customer-provided reason, current workflow status (pending, approved, or rejected), and timestamps tracking the request lifecycle.
 *
 * **Security and Access Control:**
 * - Customers can only view cancellation requests for their own order items
 * - Sellers can view cancellation requests for order items belonging to products they sell
 * - Administrators have unrestricted access to all cancellation requests
 *
 * **Related Operations:**
 * - `POST /order-items/{orderItemId}/cancellation-requests` - Create a new cancellation request
 * - `GET /order-items/{orderItemId}/cancellation-requests/{cancellationRequestId}` - Retrieve detailed information about a specific cancellation request
 * - `PATCH /cancellation-requests/{cancellationRequestId}/approve` - Seller approval of a cancellation request (seller only)
 * - `PATCH /cancellation-requests/{cancellationRequestId}/reject` - Seller rejection of a cancellation request (seller only)
 *
 * @param props.connection
 * @param props.orderItemId Target order item's unique identifier (UUID format)
 * @param props.body Search criteria and pagination parameters for filtering cancellation requests
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification Query ecommerce_mall_order_item_cancellation_requests table filtered by order_item_id from path parameter.
 *
 * Validate order item ownership/access:
 * - For customers: verify order_item belongs to order owned by authenticated customer
 * - For sellers: verify order_item's product_variant belongs to seller's products
 * - For admins: skip ownership validation
 *
 * Apply search filters from request body:
 * - status: filter by cancellation request status (pending, approved, rejected)
 * - requested_at_from/requested_at_to: filter by request submission date range
 * - responded_at_from/responded_at_to: filter by response date range
 *
 * Implement cursor-based pagination:
 * - Use created_at and id as composite cursor for consistent ordering
 * - Support page_size (default 20, max 100)
 * - Return next_cursor for pagination continuation
 *
 * Return summary projection excluding sensitive fields:
 * - id, order_item_id, status, requested_at, responded_at, created_at
 * - Exclude reason field from summary (use detail endpoint for full details)
 *
 * Soft delete handling: exclude records with deleted_at set unless admin access.
 *
 * Concurrency: use optimistic locking with version tracking for any concurrent modifications.
 * @path /ecommerceMall/customer/order-items/:orderItemId/cancellation-requests
 * @accessor api.functional.ecommerceMall.customer.order_items.cancellation_requests.index
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function index(
  connection: IConnection,
  props: index.Props,
): Promise<index.Response> {
  return true === connection.simulate
    ? index.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...index.METADATA,
          path: index.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace index {
  export type Props = {
    /**
     * Target order item's unique identifier (UUID format)
     */
    orderItemId: string & tags.Format<"uuid">;

    /**
     * Search criteria and pagination parameters for filtering cancellation requests
     */
    body: IEcommerceMallOrderItemCancellationRequest.IRequest;
  };
  export type Body = IEcommerceMallOrderItemCancellationRequest.IRequest;
  export type Response =
    IPageIEcommerceMallOrderItemCancellationRequest.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/ecommerceMall/customer/order-items/:orderItemId/cancellation-requests",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Omit<Props, "body">) =>
    `/ecommerceMall/customer/order-items/${encodeURIComponent(props.orderItemId ?? "null")}/cancellation-requests`;
  export const random =
    (): IPageIEcommerceMallOrderItemCancellationRequest.ISummary =>
      typia.random<IPageIEcommerceMallOrderItemCancellationRequest.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: index.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: index.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("orderItemId")(() => typia.assert(props.orderItemId));
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Retrieve detailed information about a specific cancellation request for an order item from the `ecommerce_mall_order_item_cancellation_requests` table.
 *
 * This endpoint provides complete visibility into the cancellation request workflow, including the customer-provided reason for cancellation, current status (pending, approved, or rejected), and all relevant timestamps for audit purposes.
 *
 * **Access Control**:
 * - **Customers**: Can view cancellation requests for their own order items
 * - **Sellers**: Can view cancellation requests for order items belonging to their products
 * - **Administrators**: Have unrestricted access to view all cancellation requests
 *
 * **Cancellation Request Workflow**:
 * - When a customer submits a cancellation request for an order item with "paid" status, the system creates a request with "pending" status in the `ecommerce_mall_order_item_cancellation_requests` table
 * - Sellers review pending requests and respond by approving or rejecting
 * - Upon approval, the order item status changes to "cancelled" and stock is restored via inventory records
 * - Upon rejection, the order item continues processing with its "paid" status
 * - Each status change creates an immutable snapshot for dispute resolution
 *
 * **Related Operations**:
 * - `POST /order-items/{orderItemId}/cancellation-requests` - Create a new cancellation request (customers only)
 * - `PATCH /order-items/{orderItemId}/cancellation-requests/{requestId}` - Update cancellation request status (sellers only - approve/reject)
 * - `GET /order-items/{orderItemId}` - View the parent order item details
 * - `PATCH /order-items` - List order items with their cancellation request status
 *
 * @param props.connection
 * @param props.orderItemId Target order item's unique identifier (UUID)
 * @param props.requestId Target cancellation request's unique identifier (UUID)
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification Implement GET endpoint to retrieve a specific cancellation request by order item ID and request ID.
 *
 * **Service Layer Logic**:
 * 1. Validate both orderItemId and requestId are valid UUID format
 * 2. Query ecommerce_mall_order_item_cancellation_requests table by requestId
 * 3. Verify the cancellation request exists and belongs to the specified order_item_id
 * 4. Check authorization:
 *    - If customer: verify order_item belongs to their order (via order->customer relationship)
 *    - If seller: verify order_item's product_variant belongs to their shop
 *    - If admin: grant access
 * 5. Apply soft delete filter (exclude records where deleted_at is not null)
 * 6. Return cancellation request with all fields: id, order_item_id, reason, status, requested_at, responded_at, created_at, updated_at
 *
 * **Database Query**:
 * ```sql
 * SELECT id, order_item_id, reason, status, requested_at, responded_at, created_at, updated_at
 * FROM ecommerce_mall_order_item_cancellation_requests
 * WHERE id = :requestId
 *   AND order_item_id = :orderItemId
 *   AND deleted_at IS NULL
 * ```
 *
 * **Authorization Checks**:
 * - Customer: JOIN order_items -> orders -> customers, verify customer_id matches authenticated user
 * - Seller: JOIN order_items -> product_variants -> products -> sellers, verify seller_id matches authenticated user
 * - Admin: Skip authorization check
 *
 * **Error Handling**:
 * - 404: Cancellation request not found or doesn't belong to specified order item
 * - 403: Unauthorized access (customer viewing another customer's request, or seller viewing competitor's product requests)
 * - 400: Invalid UUID format for orderItemId or requestId
 *
 * **Concurrency**:
 * - No locking required for read operation
 * - Use optimistic concurrency with version tracking if needed for audit purposes
 * @path /ecommerceMall/customer/order-items/:orderItemId/cancellation-requests/:requestId
 * @accessor api.functional.ecommerceMall.customer.order_items.cancellation_requests.at
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function at(
  connection: IConnection,
  props: at.Props,
): Promise<at.Response> {
  return true === connection.simulate
    ? at.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...at.METADATA,
          path: at.path(props),
          status: null,
        },
      );
}
export namespace at {
  export type Props = {
    /**
     * Target order item's unique identifier (UUID)
     */
    orderItemId: string & tags.Format<"uuid">;

    /**
     * Target cancellation request's unique identifier (UUID)
     */
    requestId: string & tags.Format<"uuid">;
  };
  export type Response = IEcommerceMallOrderItemCancellationRequest;

  export const METADATA = {
    method: "GET",
    path: "/ecommerceMall/customer/order-items/:orderItemId/cancellation-requests/:requestId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/ecommerceMall/customer/order-items/${encodeURIComponent(props.orderItemId ?? "null")}/cancellation-requests/${encodeURIComponent(props.requestId ?? "null")}`;
  export const random = (): IEcommerceMallOrderItemCancellationRequest =>
    typia.random<IEcommerceMallOrderItemCancellationRequest>();
  export const simulate = (
    connection: IConnection,
    props: at.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: at.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("orderItemId")(() => typia.assert(props.orderItemId));
      assert.param("requestId")(() => typia.assert(props.requestId));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}
