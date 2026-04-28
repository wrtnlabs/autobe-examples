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
   * Create a new cancellation request for one purchased order item.
   *
   * This operation lets an authenticated customer submit an active cancellation workflow record for a single purchased line item. The underlying data is stored in `shopping_mall_cancellation_requests`, which is described as active cancellation request records submitted by customers for individual order items. The request is tied to exactly one `shopping_mall_order_items` row through `shopping_mall_order_item_id`, and the customer must provide the `reason` text that explains why the item should be cancelled. This design follows the business requirement that cancellation is an item-level action rather than an order-level action.
   *
   * Access to this operation is restricted to authenticated customers because cancellation submission is defined as a customer-initiated self-service after-sales action. The service must resolve the signed-in customer identity and ensure that the referenced order item belongs to an order owned by that customer. The platform must reject attempts to submit cancellation requests without a valid customer session, for order items that do not belong to the requesting customer, or for items that are not eligible for cancellation under the current order-item lifecycle state.
   *
   * The operation reflects the normalized separation between transactional order data and after-sales workflow data. `shopping_mall_order_items` stores the purchased quantity, captured unit price, responsible seller, and current per-item lifecycle status, while `shopping_mall_orders` stores the top-level immutable commercial transaction record and business order code. The cancellation request record stores only the mutable workflow state needed for after-sales handling, including the current `status`, `reason`, reviewer routing metadata, and timestamps. Historical audit events are preserved separately in `shopping_mall_cancellation_request_snapshots`, so this creation endpoint is responsible for establishing the active parent request record that later review actions can track over time.
   *
   * The service must preserve the requirement that cancellation scope never expands from one item to an entire order. When clients display order details with multiple purchased items, they should invoke this operation separately for each eligible item the customer wants to cancel. If a client attempts to use one submission to affect multiple items or conceptually cancel the full order through this resource, the request must be rejected as a scope mismatch. If a cancellation request already exists for the selected order item, the service must also reject duplicate creation because the database schema allows at most one cancellation request per order item through the unique constraint on `shopping_mall_order_item_id`.
   *
   * This endpoint is commonly used after the customer has already retrieved order details and identified a specific eligible order item. A prior order-detail retrieval operation should therefore be used to locate the target item before calling this endpoint. After successful creation, subsequent retrieval operations for orders or cancellation requests should present the newly created request as part of the affected order item's cancellation history.
   *
   * @param connection
   * @param body Information required to submit a cancellation request for one order item
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor customer
     * @x-autobe-specification Implement a customer-authenticated creation flow
     *   for `shopping_mall_cancellation_requests`.
   *
   * 1. Resolve the authenticated customer identity from the request context. Reject when there is no active customer session.
   * 2. Validate the request body against `IShoppingMallCancellationRequest.ICreate`. Require a target order-item identifier and a non-empty reason string. Trim surrounding whitespace from the reason before persistence and reject when the effective reason is empty.
   * 3. Load the target `shopping_mall_order_items` row by its identifier, joining the parent `shopping_mall_orders` row to verify ownership through `shopping_mall_orders.shopping_mall_customer_id`.
   * 4. Reject if the order item does not exist, if its parent order does not belong to the authenticated customer, or if the item is not eligible for cancellation according to its current `shopping_mall_order_items.status` and domain policy.
   * 5. Check whether an active cancellation request already exists for the same `shopping_mall_order_item_id`. Because the schema has `@@unique([shopping_mall_order_item_id])`, treat any existing row as a duplicate submission attempt and reject with a conflict error.
   * 6. Insert a new `shopping_mall_cancellation_requests` row with a generated UUID, the validated `shopping_mall_order_item_id`, the authenticated customer's ID in `shopping_mall_customer_id`, the provided reason, an initial workflow `status` such as pending, null review metadata (`reviewed_by_type`, `reviewed_at`, `decision_note`), and current timestamps for `created_at` and `updated_at`. `deleted_at` must remain null on creation.
   * 7. Optionally create the initial `shopping_mall_cancellation_request_snapshots` row within the same transaction if the implementation standard requires an initial audit event at creation time; if snapshot creation is deferred to later workflow events, do not invent additional snapshot data.
   * 8. Commit the transaction and return the created cancellation request record.
   *
   * Error handling requirements:
   * - Return an authorization error for unauthenticated callers.
   * - Return a forbidden or not-found style error when the target order item is not owned by the authenticated customer, taking care not to leak another customer's order data.
   * - Return a validation error when the reason is missing or blank.
   * - Return a business-rule error when the order item is not eligible for cancellation.
   * - Return a conflict error when a cancellation request already exists for the order item.
   *
   * Implementation notes:
   * - Do not create or mutate records for unrelated order items in the same order.
   * - Do not perform whole-order cancellation logic in this operation.
   * - Do not accept client-supplied values for reviewer fields or server-managed timestamps.
   * - Keep the workflow item-scoped so later seller or administrator review actions operate on the single created request.
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
   * Retrieve a filtered and paginated list of active cancellation request records.
   *
   * This operation searches the live cancellation workflow data stored in shopping_mall_cancellation_requests, the table that holds the current mutable state of customer-submitted cancellation cases for individual order items. Each returned record represents one operational cancellation case linked to exactly one purchased line item through shopping_mall_order_items and one submitting customer through shopping_mall_customers. The response is intended for case browsing, review queues, customer self-service history, and other interfaces that need the present status of a cancellation request rather than a historical snapshot of prior changes.
   *
   * The endpoint reflects the business rule that cancellation is processed at the order-item level, not at the whole-order level. Consumers should therefore interpret every result as a request scoped to one specific order item, with the customer-provided reason, current request status, latest reviewer actor type, latest review timestamp, and optional decision note describing the most recent outcome. Historical versions of the case are not returned from this endpoint because the database design explicitly separates the current operational record from immutable snapshot evidence preserved in shopping_mall_cancellation_request_snapshots.
   *
   * Access to this operation must respect actor boundaries and data ownership. Authenticated customers may use it to browse only their own cancellation requests and monitor the progress of cases they submitted. Administrators may use it for oversight, queue review, and platform-level operational monitoring across customers. Implementations must not expose another customer's cancellation records to a customer caller, and they must apply actor-aware filtering before executing or finalizing the result set.
   *
   * Search criteria should support practical list browsing over the verified live-request fields, including status, reviewer actor type, creation or review time windows, order-item linkage, customer linkage when authorized, and text-oriented filtering on reason or decision_note as supported by the request DTO. Pagination and deterministic sorting are important because cancellation records are operational queue data and may be reviewed in chronological or status-based groupings. If a caller needs to inspect the full current details of one specific case or inspect historical change evidence, that should be performed with a dedicated detail or snapshot-oriented operation rather than this collection search endpoint.
   *
   * This endpoint is related to cancellation request creation flows that require a specific order item and a reason, and to downstream decision operations that approve or reject a case. The list returned here reflects the results of those workflows but does not itself create, approve, reject, or mutate a case. It only returns the current operational records that remain preserved for browsing and oversight.
   *
   * @param connection
   * @param body Search criteria, pagination, and sorting options for cancellation requests
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor customer
     * @x-autobe-specification Implement this operation as a paginated search
     *   over shopping_mall_cancellation_requests with joins or follow-up
     *   fetches as needed for ownership enforcement and summary enrichment.
   *
   * 1. Authenticate the caller and resolve the actor type. Reject unauthenticated access unless a broader platform policy explicitly allows none, which is not supported by the loaded requirements.
   * 2. Build a base query from shopping_mall_cancellation_requests excluding logically removed records when the service-layer policy treats deleted_at as hidden from normal browsing. Do not query the snapshot table for this endpoint because the endpoint represents live cancellation requests only.
   * 3. Apply actor scoping before pagination:
   *    - For customer callers, constrain shopping_mall_customer_id to the authenticated customer ID so only the caller's own requests are visible.
   *    - For administrator callers, allow broader visibility across customers.
   *    - Do not grant cross-customer visibility to ordinary customers.
   * 4. Apply request-body filters supported by IShoppingMallCancellationRequest.IRequest, such as status, reviewedByType, createdAt range, reviewedAt range, shoppingMallOrderItemId, shoppingMallCustomerId when the actor is authorized, and text search against reason and decision_note where DTO fields request such behavior.
   * 5. Support deterministic sorting. Default to created_at descending when the request does not provide an explicit sort, because cancellation queues are typically reviewed from newest to oldest or according to recent activity.
   * 6. Return a paginated summary payload typed as IPageIShoppingMallCancellationRequest.ISummary. The summary should be sourced from verified live-record columns such as id, shopping_mall_order_item_id, shopping_mall_customer_id, status, reason, reviewed_by_type, reviewed_at, decision_note, created_at, and updated_at, plus any safe derived summary fields defined by the DTO layer.
   * 7. Preserve item-level semantics in all service logic. Do not aggregate or reinterpret records as whole-order cancellation cases. If request filters attempt to broaden scope to an entire order through item-level semantics, keep filtering and presentation aligned to individual order-item requests only.
   * 8. Handle edge cases cleanly: unauthorized customer scope should be rejected or reduced to self-only results; filters referencing inaccessible customer IDs should not bypass ownership rules; empty results should return a valid empty page rather than an error.
   *
   * The operation is read-only and must not change request status, reviewer metadata, order-item state, or snapshot history. Any enrichment from related order item or customer data must remain consistent with the verified foreign-key relationships and must not assume unverified columns outside the loaded schema.
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
   * Retrieve the current active cancellation request for a specific cancellation case identifier.
   *
   * This operation returns the live item-level cancellation case stored in the shopping_mall_cancellation_requests record. The underlying record represents the current mutable state of a customer-submitted cancellation workflow for one purchased order item, including the customer-provided reason, the current status, the latest reviewer actor type, the latest review timestamp, and any latest decision note. As described by the domain, a cancellation request belongs to one order item and is never a whole-order action. The linked order item in shopping_mall_order_items carries the per-item lifecycle state, quantity, captured unit price, shipment assignment, and delivery timing context used by after-sales workflows.
   *
   * Access to this operation must be constrained by business ownership and platform governance rules. A customer may retrieve only a cancellation request that the customer submitted. Administrators may retrieve the record for oversight, dispute handling, and operational review. If seller access is implemented, the service must verify that the cancellation request belongs to an order item operationally owned by that seller before disclosing the record. Unauthorized callers or callers outside the ownership boundary must be denied without revealing protected case details.
   *
   * This endpoint exposes the active request record, not the immutable audit timeline. Historical change evidence is preserved separately in cancellation request snapshot records, so consumers should use the corresponding snapshot-oriented APIs when they need the sequence of prior decision states rather than the current case state. The operation is therefore appropriate for detail screens that show the present cancellation status, customer reason, and latest review outcome for one selected request.
   *
   * The business rules behind this resource are item-scoped. Requirements state that cancellation eligibility is evaluated per order item, that a customer cancellation request is accepted only for an eligible item in paid status at submission time, and that approval or rejection affects only the selected item without changing unrelated items in the same order. Although this read operation does not re-evaluate submission eligibility, the returned resource documents the result of that item-level workflow and should be interpreted in that per-item context.
   *
   * Implementations should treat logically removed active records carefully because the database schema includes deleted_at on the live cancellation request table. Requests for a nonexistent identifier, a logically removed record, or a record outside the caller's visibility boundary should fail with a not-found or forbidden outcome according to the service's security policy. Clients commonly reach this detail endpoint after discovering a request from a cancellation request list or from an order item detail view that surfaces after-sales actions and statuses.
   *
   * @param connection
   * @param cancellationRequestId Target cancellation request ID
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor customer
     * @x-autobe-specification Load one active cancellation request from
     *   shopping_mall_cancellation_requests by id where id equals the
     *   cancellationRequestId path parameter and deleted_at is null. Join or
     *   subsequently load the related shopping_mall_order_items row through
     *   shopping_mall_order_item_id so the service can enforce visibility and
     *   ownership checks based on the linked commercial context.
   *
   * Authorize the caller before returning the resource. For customer callers, require that shopping_mall_customer_id matches the authenticated customer account. For administrator callers, allow access according to administrator privileges. If seller access is supported in the service layer, verify through the related shopping_mall_order_items.shopping_mall_seller_id that the authenticated seller is the responsible seller for the linked order item before returning data. Deny access when the caller is unauthenticated or outside the ownership boundary.
   *
   * Return the current live cancellation request DTO as IShoppingMallCancellationRequest. Include the mutable case fields from the live table: id, order item reference, customer reference if the DTO exposes it, status, reason, reviewed_by_type, reviewed_at, decision_note, created_at, and updated_at. Do not source historical timeline entries from snapshot tables in this operation; snapshot history belongs to dedicated history retrieval logic.
   *
   * Handle edge cases explicitly. If no active record exists for the identifier, return a not-found error. If the identifier exists but the record is logically removed, treat it as unavailable to ordinary readers. If the linked order item cannot be resolved, treat the record as inconsistent and fail safely. This operation is read-only and must not mutate request status, order-item status, stock, or refund state.
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
