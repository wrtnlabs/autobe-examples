import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IPageIShoppingMallRefundRequest } from "../../../../structures/IPageIShoppingMallRefundRequest";
import { IShoppingMallRefundRequest } from "../../../../structures/IShoppingMallRefundRequest";

export * as snapshots from "./snapshots/index";

/**
 * Create a new refund request for a single delivered order item.
 *
 * This operation allows an authenticated customer to open an active after-sales refund case for one specific purchased line item. In the underlying data model, `shopping_mall_refund_requests` represents the current customer-submitted refund workflow record for an individual order item, while `shopping_mall_order_items` represents the purchased line itself, including the captured quantity, unit price, lifecycle status, responsible seller, and the `delivered_at` timestamp used for refund eligibility calculations. The operation is intentionally item-scoped: it does not apply a refund to an entire order, and it must be used separately for each eligible order item.
 *
 * The endpoint is restricted to the customer actor. The authenticated customer may submit a refund request only for an order item that belongs to that customer through the related order context, has already reached the delivered stage, and remains within the allowed 7-day submission window after delivery. The customer must provide a textual reason explaining why the refund is being requested. The submitted refund request becomes visible to both the customer and the seller responsible for that order item so that the case can proceed through later review and decision workflows.
 *
 * When the request is accepted, the service creates a new active record in `shopping_mall_refund_requests` linked to the selected `shopping_mall_order_items.id` and the authenticated customer. The initial workflow state should reflect that the case is newly submitted and awaiting review. Reviewer-specific fields such as `reviewer_role`, `review_note`, and `reviewed_at` are not supplied during creation because they belong to later review actions by a seller or administrator. Historical progression of the case is handled separately from the live record through refund request snapshot history.
 *
 * Validation is centered on the business rules for item-level after-sales processing. The selected order item must exist, must belong to the requesting customer, must have been delivered, and must not already have another active refund request because the database enforces a unique active refund record per order item through the unique constraint on `shopping_mall_order_item_id`. If the item is outside the eligibility window, is not owned by the requester, is not delivered, or already has an active refund request, the operation must reject the submission.
 *
 * This operation is typically used after the customer has already retrieved order or order-item details and identified a delivered line that is still within the refund window. After creation, related read operations for refund requests or order details should be used to monitor the current decision status and any later reviewer note. The operation preserves the platform rule that refund handling is performed per order item, leaving other items in the same order unaffected unless separate actions are submitted for them.
 *
 * @param props.connection
 * @param props.body Refund request creation data
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification Authenticate the caller as a customer and derive the
 *   customer identity from the session context.
 *
 * Validate the request body fields defined by `IShoppingMallRefundRequest.ICreate`, at minimum ensuring that the target order item identifier is present and that the refund reason text is provided in a non-empty form acceptable to domain validation rules.
 *
 * Load the target `shopping_mall_order_items` record by its primary key and join through the related order to verify that the order item belongs to the authenticated customer. Reject the request if the order item does not exist, is not accessible to the authenticated customer, or has been administratively removed from active use in a way that should block after-sales submission.
 *
 * Check refund eligibility using actual order-item state from `shopping_mall_order_items`. The item must already be delivered, which means `delivered_at` must be populated and the current item `status` must represent a delivered state suitable for refund submission. Calculate the submission deadline as 7 days after `delivered_at` using the service's canonical time source, and reject the request if the current time is beyond that window.
 *
 * Check whether an active refund request already exists for the same order item by querying `shopping_mall_refund_requests` on `shopping_mall_order_item_id`. Because the schema defines `@@unique([shopping_mall_order_item_id])`, insertion must be blocked when a record already exists for that item. Return a business conflict error rather than relying only on database constraint failure.
 *
 * Create the `shopping_mall_refund_requests` record in a transaction with the following server-controlled values: `id` as a new UUID, `shopping_mall_order_item_id` from the validated request, `shopping_mall_customer_id` from authentication context, `reason` from the request body, initial `status` set to the pending submission state defined by the domain, `reviewer_role` null, `review_note` null, `reviewed_at` null, `created_at` set to now, `updated_at` set to now, and `deleted_at` null.
 *
 * Return the created refund request resource as `IShoppingMallRefundRequest`. The response should expose the newly created active case, including identifiers, current status, customer-provided reason, and timestamps.
 *
 * Error handling must cover: unauthenticated caller, non-customer caller, missing or invalid request fields, target order item not found, target order item not owned by the caller, order item not delivered, refund window expired, request scope mismatch where the caller attempts to refund an order rather than a single order item, and duplicate active refund request for the same order item.
 * @path /shoppingMall/customer/refund-requests
 * @accessor api.functional.shoppingMall.customer.refund_requests.create
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
          path: create.path(),
          status: null,
        },
        props.body,
      );
}
export namespace create {
  export type Props = {
    /**
     * Refund request creation data
     */
    body: IShoppingMallRefundRequest.ICreate;
  };
  export type Body = IShoppingMallRefundRequest.ICreate;
  export type Response = IShoppingMallRefundRequest;

  export const METADATA = {
    method: "POST",
    path: "/shoppingMall/customer/refund-requests",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/customer/refund-requests";
  export const random = (): IShoppingMallRefundRequest =>
    typia.random<IShoppingMallRefundRequest>();
  export const simulate = (
    connection: IConnection,
    props: create.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: create.path(),
      contentType: "application/json",
    });
    try {
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
 * Retrieve a filtered and paginated list of active refund request records.
 *
 * This operation provides collection-level access to RefundRequest data stored in shopping_mall_refund_requests, the table that represents current customer-submitted refund workflows for individual order items. A refund request is an item-level after-sales case, not an order-level case, and each record is tied to one specific shopping_mall_order_items row through shopping_mall_refund_request_id's parent relation field shopping_mall_order_item_id. The returned list is intended for tracking live disputes, reviewing current decision states, and locating requests by operational context such as refund workflow status, order timing, or review timing.
 *
 * Authorization is scope-sensitive. Customers use this endpoint to browse only the refund requests they personally submitted. Sellers use it to browse only refund requests connected to order items for which they are the responsible seller, reflecting the order-item ownership boundary recorded in shopping_mall_order_items.shopping_mall_seller_id. Administrators and super administrators may browse refund requests for oversight and dispute handling across the marketplace. The operation must never expose unrelated users' refund matters outside the caller's permitted scope.
 *
 * The underlying data model separates the live refund case from its preserved audit trail. shopping_mall_refund_requests stores the current business state including the customer-provided reason, current status, latest reviewer role, latest review note, and latest reviewed_at timestamp. Historical progression is preserved independently in shopping_mall_refund_request_snapshots, which are created when seller responses change the refund state and remain available after finalization for dispute review. Accordingly, this endpoint is for browsing current refund cases; consumers that need the preserved change trail should call a dedicated snapshot-history endpoint after identifying the target refund request from this list.
 *
 * Filtering should reflect the item-level refund rules defined in the requirements. Refund requests originate only from delivered order items, must be submitted within seven days after delivery, and apply only to the selected order item without affecting sibling items in the same order. This endpoint therefore supports practical browsing scenarios such as locating pending requests awaiting response, listing recently reviewed requests, finding requests by overall order code through the related shopping_mall_orders record, and narrowing results by the related order item status or delivery timing. Sorting and pagination are required so large oversight views remain stable and usable.
 *
 * Expected behavior is read-only. This endpoint does not submit refund requests, approve them, reject them, or mutate snapshot history. It returns paginated summaries of the active records that match the caller's allowed scope and filter conditions. If filters reference records outside the caller's scope, the implementation must simply exclude them from results rather than broadening visibility. If no refund requests match the criteria, the operation should return an empty page structure rather than an error.
 *
 * @param props.connection
 * @param props.body Refund request search criteria and pagination options
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification Accept an IShoppingMallRefundRequest.IRequest body
 *   containing pagination, sorting, and filter criteria for browsing current
 *   refund request records.
 *
 * Build the primary query from shopping_mall_refund_requests as the root table. Join shopping_mall_order_items on shopping_mall_refund_requests.shopping_mall_order_item_id = shopping_mall_order_items.id, and join shopping_mall_orders on shopping_mall_order_items.shopping_mall_order_id = shopping_mall_orders.id when order-level lookup or sorting is requested. Select summary-oriented fields from the refund request row and any minimal related identifiers or display attributes required by IShoppingMallRefundRequest.ISummary.
 *
 * Apply authorization scoping before user-supplied filters. For a customer actor, constrain shopping_mall_refund_requests.shopping_mall_customer_id to the authenticated customer ID. For a seller actor, constrain shopping_mall_order_items.shopping_mall_seller_id to the authenticated seller ID. For administrator and superAdministrator actors, allow broader marketplace visibility subject to any general moderation policies. Reject anonymous access.
 *
 * Support filters grounded in loaded schema fields and directly related records, including refund request status, reviewer_role, created_at range, reviewed_at range, shopping_mall_customer_id when permitted for administrative oversight, shopping_mall_order_item_id, related shopping_mall_orders.code, related shopping_mall_order_items.status, and related shopping_mall_order_items.delivered_at range. Do not assume nonexistent columns. If the request DTO includes text search, implement it against practical textual fields that exist, such as refund_requests.reason, review_note, and order code through the joined order.
 *
 * Apply stable sorting with an allowlist such as created_at, updated_at, reviewed_at, and status, plus a deterministic secondary sort by id to avoid page drift. Implement pagination using the platform's standard page request/response convention for IPageIShoppingMallRefundRequest.ISummary.
 *
 * Exclude logically removed records from normal browsing by filtering shopping_mall_refund_requests.deleted_at IS NULL, and also exclude joined order items or orders that are administratively removed from normal user-facing results when policy requires by checking their deleted_at columns. Keep role-specific behavior explicit: administrative oversight may still require visibility into historically retained records according to platform policy, but customer and seller list views should remain focused on active accessible data.
 *
 * Return a paginated result object containing refund request summaries only. Do not create, modify, approve, reject, or snapshot any record in this operation. Error handling should cover unauthorized actor access, malformed pagination or sorting input, and invalid filter combinations, while a valid query with no matches must return an empty page.
 * @path /shoppingMall/customer/refund-requests
 * @accessor api.functional.shoppingMall.customer.refund_requests.index
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
          path: index.path(),
          status: null,
        },
        props.body,
      );
}
export namespace index {
  export type Props = {
    /**
     * Refund request search criteria and pagination options
     */
    body: IShoppingMallRefundRequest.IRequest;
  };
  export type Body = IShoppingMallRefundRequest.IRequest;
  export type Response = IPageIShoppingMallRefundRequest.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/customer/refund-requests",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/customer/refund-requests";
  export const random = (): IPageIShoppingMallRefundRequest.ISummary =>
    typia.random<IPageIShoppingMallRefundRequest.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: index.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: index.path(),
      contentType: "application/json",
    });
    try {
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
 * Retrieve the detailed current state of a single refund request for one purchased order item.
 *
 * This operation returns the active refund workflow record stored in `shopping_mall_refund_requests`, which the database defines as the current customer-submitted refund request for an individual order item. The returned resource represents an item-level after-sales case, not an order-wide dispute. That scope is important because the requirements explicitly state that refund handling is processed at the order item level, and that one affected item must not implicitly change the outcome of other items in the same order. The refund request includes the customer-provided reason, the current workflow status, the latest reviewer role, the latest review note, and the timestamps that describe when the request was submitted and last reviewed.
 *
 * Access to this operation is restricted by ownership and oversight boundaries. The submitting customer may read the refund request for the customer's own purchased item so the customer can track the current state after submission. The responsible seller may read the refund request only when the disputed order item belongs to that seller, which aligns with the rule that sellers can respond only to refund requests for their own purchased items. Administrators and super administrators may read the record for marketplace oversight and dispute monitoring. Requests for unrelated refund requests must be rejected even when the identifier exists.
 *
 * The operation is closely related to the underlying transactional models `shopping_mall_order_items` and `shopping_mall_orders`. The associated order item stores the purchased quantity, captured unit price, seller responsibility, shipment linkage, item lifecycle status, and delivery timestamp used for refund eligibility calculations. The parent order stores the broader commercial transaction context such as the customer ownership, order code, total price, and overall order status. Even though this endpoint returns the refund request as the primary resource, implementations should validate that the record remains tied to a real order item and should use the related item and order data to enforce access control and business-state consistency.
 *
 * This endpoint is typically used after the refund request has been created through the refund submission flow. The submission flow requires the selected order item to have reached the delivered state, requires a text reason, and allows submission only within seven days after delivery. After creation, this detail endpoint allows the involved parties to inspect the live state of the case, including whether it is pending, approved, rejected, or withdrawn. If a seller or administrator later records a decision, the latest reviewer information and review timestamps surfaced from `reviewer_role`, `review_note`, and `reviewed_at` allow clients to present that decision transparently.
 *
 * If the refund request identifier does not exist, if the record has been hidden from active views, or if the caller is outside the permitted ownership or oversight scope, the operation must fail without exposing protected commercial data. The endpoint should return only the current refund request resource and should not silently broaden its scope into order-level refund history or unrelated snapshot history. Historical child audit records are preserved separately in `shopping_mall_refund_request_snapshots`, whose schema is explicitly described as child audit history for the parent refund request, so those records should be handled through separate retrieval logic when historical review trails are needed.
 *
 * @param props.connection
 * @param props.refundRequestId Target refund request ID
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification Load the target row from
 *   `shopping_mall_refund_requests` by `id = :refundRequestId` and exclude
 *   records that should not be visible in active views, such as rows with
 *   `deleted_at` set when the service policy treats them as hidden. Join or
 *   separately fetch the related `shopping_mall_order_items` row using
 *   `shopping_mall_order_item_id`, and the related `shopping_mall_orders` row
 *   through `shopping_mall_order_items.shopping_mall_order_id`, because access
 *   control and business context depend on those relations.
 *
 * Authorize by actor type. For `customer`, require `shopping_mall_refund_requests.shopping_mall_customer_id` to match the authenticated customer account. For `seller`, require `shopping_mall_order_items.shopping_mall_seller_id` to match the authenticated seller account. For `administrator` and `superAdministrator`, allow access for oversight without ownership matching. Reject all other actor contexts. If the refund request exists but the caller does not satisfy the ownership or oversight rule, return a not-found or forbidden outcome according to the platform's security policy without leaking resource existence.
 *
 * Return the current refund request detail as `IShoppingMallRefundRequest`. Map the resource from verified columns: `id`, `shopping_mall_order_item_id`, `shopping_mall_customer_id`, `reason`, `status`, `reviewer_role`, `review_note`, `reviewed_at`, `created_at`, and `updated_at`. Do not mutate any business state in this operation. Do not create or append refund request snapshots here. Snapshot history in `shopping_mall_refund_request_snapshots` is read-adjacent context only and should remain outside this operation unless the response DTO already composes it explicitly in downstream schema generation.
 *
 * Validate the path parameter as a UUID before querying. If no matching active refund request exists, return the standard not-found error. If related order item data is missing because of referential inconsistency, treat it as a server-side integrity failure rather than fabricating partial business data. Keep the operation read-only and item-scoped; never aggregate other order items from the same order into this response. The implementation should preserve the domain rule that refund cases are attached to one specific purchased item and must not be interpreted as an order-wide refund action.
 * @path /shoppingMall/customer/refund-requests/:refundRequestId
 * @accessor api.functional.shoppingMall.customer.refund_requests.at
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
     * Target refund request ID
     */
    refundRequestId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallRefundRequest;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/customer/refund-requests/:refundRequestId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/customer/refund-requests/${encodeURIComponent(props.refundRequestId ?? "null")}`;
  export const random = (): IShoppingMallRefundRequest =>
    typia.random<IShoppingMallRefundRequest>();
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
      assert.param("refundRequestId")(() =>
        typia.assert(props.refundRequestId),
      );
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
