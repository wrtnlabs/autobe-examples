import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIShoppingMallRefundRequest } from "../../../../api/structures/IPageIShoppingMallRefundRequest";
import { IShoppingMallRefundRequest } from "../../../../api/structures/IShoppingMallRefundRequest";
import { MemberAuth } from "../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../decorators/payload/MemberPayload";
import { deleteShoppingMallMemberRefundRequestsRefundRequestId } from "../../../../providers/deleteShoppingMallMemberRefundRequestsRefundRequestId";
import { getShoppingMallMemberRefundRequestsRefundRequestId } from "../../../../providers/getShoppingMallMemberRefundRequestsRefundRequestId";
import { patchShoppingMallMemberRefundRequests } from "../../../../providers/patchShoppingMallMemberRefundRequests";
import { postShoppingMallMemberRefundRequests } from "../../../../providers/postShoppingMallMemberRefundRequests";
import { putShoppingMallMemberRefundRequestsRefundRequestId } from "../../../../providers/putShoppingMallMemberRefundRequestsRefundRequestId";

@Controller("/shoppingMall/member/refund-requests")
export class ShoppingmallMemberRefund_requestsController {
  /**
   * Create a new refund request for a specific delivered order item.
   *
   * This operation allows a customer to initiate a refund workflow by submitting a required reason for exactly one order item. The backend creates a new record in the refund requests table and links it to the referenced order item.
   *
   * Before creating the record, the service validates that the referenced order item is eligible for refunds based on its current delivery-related state and the allowed window after delivery. If the order item is not in an eligible state, or if the reason is missing/invalid, the creation is rejected.
   *
   * Authorization is restricted to authenticated members (customers) who own the target order item. Requests that target an order item outside the caller’s ownership are rejected.
   *
   * When the seller later processes the refund request in the dedicated seller-approval/rejection operations, the system will record an immutable snapshot of the refund request’s state transition for dispute resolution, and (when approved) apply the downstream order-item and inventory updates. Those side effects are not performed by this creation operation.
   *
   * This operation should be used with the customer’s order item browsing/listing operations to select a delivered `orderItemId`, and with the refund request detail/status retrieval operations to monitor the seller decision.
   *
   *
   * @param connection
   * @param body Creation payload to initiate a refund request for one delivered order item, including the required customer reason.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implementation steps:
   *
   * 1. Parse request body (IShoppingMallRefundRequest.ICreate) to obtain:
   *    - shopping_mall_order_item_id (as orderItemId in DTO)
   *    - customer_reason (as customerReason in DTO)
   *
   * 2. Authorization:
   *    - Resolve the caller’s customer identity from authenticated session context.
   *    - Fetch `shopping_mall_order_items` by id.
   *    - Verify the order item belongs to an order owned by the caller.
   *    - If not owned, reject.
   *
   * 3. Eligibility validation (must match functional rules):
   *    - Check `shopping_mall_order_items.line_item_status` corresponds to delivered state.
   *    - Determine delivery completion timing from order-item/fulfillment data available in the order item or related entities (use joins as needed based on existing schema); compute whether current time is within the allowed time window after delivery.
   *    - If not eligible, reject.
   *
   * 4. Required reason:
   *    - Validate customerReason is non-empty.
   *
   * 5. Create refund request record:
   *    - Insert into `shopping_mall_refund_requests`:
   *      - shopping_mall_order_item_id
   *      - customer_reason
   *      - status = initial pending value (use the allowed workflow value defined by the project’s business rules/enums in downstream code)
   *      - created_at/updated_at set by server
   *      - deleted_at left null
   *
   * 6. Return created resource:
   *    - Reload the created `shopping_mall_refund_requests` row and map to IShoppingMallRefundRequest.
   *
   * Transactions/consistency:
   * - Wrap the creation and any associated reads in a transaction scope if the service framework requires it for consistent reads.
   *
   * Edge cases:
   * - If the referenced order item is soft-deleted (deleted_at set), treat as not found/unauthorized per product policy for active views.
   * - Ensure that creation is for a single order item only; do not accept multi-item references.
   *
   * No inventory restoration or order item status transition is performed here; that happens when seller decision operations update order item status to refunded and create inventory history entries.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IShoppingMallRefundRequest.ICreate,
  ): Promise<IShoppingMallRefundRequest> {
    try {
      return await postShoppingMallMemberRefundRequests({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a filtered, paginated list of refund request records.
   *
   * This operation reads from `shopping_mall_refund_requests`, which represent customer-initiated refund workflows tied to a specific `shopping_mall_order_items` record. Each refund request includes the customer’s reason, the current request status, and optional seller-provided commentary/decision metadata as supported by the underlying table.
   *
   * Authorization and visibility must be enforced based on the caller actor (member/customer context, seller context, or admin). Only records that the caller is permitted to view should be included; the query must also exclude any records that are not intended for active browsing as defined by the database/table’s actual lifecycle fields.
   *
   * The endpoint is read-only: it must not change refund request status, seller commentary/decision data, or any fulfillment/order state. Inventory restoration and order-item status transitions occur in dedicated approval/decision workflows and must not be triggered by this list/search endpoint.
   *
   * Related operations include:
   * - The refund request creation endpoint(s) for customers.
   * - Seller/admin refund decision workflows for approving or rejecting requests.
   *
   * Those decision workflows apply business rules and may trigger order-item status updates and inventory restoration consistency. This operation only supports listing/searching and returns a paginated list summary optimized for UI consumption.
   *
   * @param connection
   * @param body Search criteria, pagination, and sorting options for refund requests.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implementation guidance for a list/search
     *   endpoint on refund requests.
   *
   * 1) Resolve caller and visibility
   * - Determine actor context (member/customer, seller, admin) in the service layer.
   * - Build a base visibility constraint for shopping_mall_refund_requests:
   *   - Exclude rows where shopping_mall_refund_requests.deleted_at is not null.
   *   - Restrict rows by joining shopping_mall_order_items to shopping_mall_orders when needed:
   *     - Customer members can only see refund requests whose shopping_mall_order_items belong to orders with shopping_mall_orders.shopping_customer_id equal to the caller member id.
   *     - Seller visibility must be constrained to order items that the seller is involved with (enforce via existing order-item/seller linkage available from the schema layer).
   *     - Admin can view records according to admin governance.
   *
   * 2) Parse search criteria
   * - Read pagination/sorting/filter fields from IShoppingMallRefundRequest.IRequest.
   * - Convert request criteria into query predicates applied to shopping_mall_refund_requests and (when applicable) shopping_mall_order_items / shopping_mall_orders.
   * - Validate filter values (e.g., status values) according to the DTO validation rules.
   *
   * 3) Pagination and sorting
   * - Apply limit/offset (or cursor) and sorting derived from the request DTO.
   * - Ensure deterministic ordering by including a stable secondary sort (e.g., created_at) when sorting keys alone could be ambiguous.
   *
   * 4) Query and mapping
   * - Query shopping_mall_refund_requests with joins required for visibility.
   * - Select only columns required for the response summary.
   * - Map each record to IPageIShoppingMallRefundRequest.ISummary data items.
   *
   * 5) Error handling
   * - On invalid request criteria: return 400 with details from DTO validation.
   * - On denied visibility: return 403 (or 404 where the platform prefers not to reveal existence).
   * - Do not mutate any data.
   *
   * 6) Invariants
   * - Must not perform refund approvals/rejections.
   * - Must not restore inventory or update order item statuses.
   * - Must not create snapshots; this operation only reads.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IShoppingMallRefundRequest.IRequest,
  ): Promise<IPageIShoppingMallRefundRequest.ISummary> {
    try {
      return await patchShoppingMallMemberRefundRequests({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve the details of a single refund request by its unique identifier.
   *
   * This endpoint is intended for dispute resolution and workflow transparency around customer-initiated refund requests for order items. A refund request record represents the customer’s refund reason and the seller’s workflow decision (including seller comments and decision timestamp). The underlying model links each refund request to exactly one order item, ensuring refund decisions and status transitions remain item-scoped.
   *
   * Security and access boundaries: the refund request must be viewable only to parties allowed to handle that order item’s dispute context (the customer who owns the order, the seller who owns the purchased item for that order item, and administrators for oversight/dispute resolution). Requests from unauthorized actors should be rejected with an appropriate authorization error.
   *
   * Data relationships: the returned refund request entity is linked to a single order item (via the order item id), and that order item is the unit whose workflow status is transitioned to “refunded” when the refund is approved. The refund request detail response should therefore include the refund request’s own fields (customer_reason, status, seller_comment, decisioned_at, timestamps) as persisted.
   *
   * Validation and error handling: if the refund request id does not exist or is not accessible to the caller, the system should return a not-found/forbidden-style error consistent with the platform’s API error policy. The endpoint does not perform any business transitions; it only reads persisted state.
   *
   * Related operations: callers may also use list or workflow endpoints to find refund requests (grouped by order item) or to observe status-based eligibility rules. This operation is read-only and complements those workflow operations by returning the authoritative stored record for the provided refundRequestId.
   *
   * @param connection
   * @param refundRequestId Target refund request identifier.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implement a read-only lookup of a single
     *   shopping_mall_refund_requests row by id.
   *
   * Steps:
   * 1) Extract refundRequestId from path.
   * 2) Authorize caller:
   *    - Load the refund request row with its orderItem relation (shopping_mall_order_items) to determine ownership context.
   *    - Determine whether caller is allowed to view this refund request (customer owning the order, seller owning the order item via seller snapshot context, or admin).
   * 3) Query:
   *    - Select from shopping_mall_refund_requests where id = refundRequestId and deleted_at is not set (active view policy).
   *    - Join to shopping_mall_order_items only for authorization context; do not modify any data.
   * 4) If no record is found or caller is not allowed, return the appropriate error.
   * 5) Map the refund request fields into the response DTO IShoppingMallRefundRequest (including status, customer_reason, seller_comment, decisioned_at, created_at, updated_at; plus any id fields required by DTO).
   *
   * Edge cases:
   * - If the refund request exists but the caller is not authorized, deny without leaking sensitive data.
   * - If the record is marked deleted_at, treat as unavailable in the active view and return not-found.
   *
   * No transactions are required because this operation only reads state.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":refundRequestId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("refundRequestId")
    refundRequestId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallRefundRequest> {
    try {
      return await getShoppingMallMemberRefundRequestsRefundRequestId({
        member,
        refundRequestId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update the refund request decision and advance the customer→seller refund workflow for a single order item.
   *
   * This operation targets exactly one refund request identified by `refundRequestId`. In the underlying domain, a refund request is tied to a specific order item and contains the customer-provided refund reason as well as the current decision status. When the seller submits an approve/reject decision, the system must treat that decision as the authoritative outcome for the refund request.
   *
   * The operation is responsible for validating that the referenced refund request exists and is accessible for decisioning, validating the requested transition according to the refund workflow rules, and enforcing that the caller is allowed to apply the decision for the associated order item (the order item’s seller is the only permitted decision maker). If validation fails or the transition is rejected by business rules, the system must not record any misleading state changes.
   *
   * On approval, the operation must apply the workflow transition and ensure the inventory restoration behavior is consistent with the restored/returned quantity semantics for the referenced order item quantity. On rejection (or when the refund outcome is not allowed per eligibility rules), the operation must update the refund request decision status accordingly, and it must not apply inventory restoration.
   *
   * For dispute resolution and auditability, the system must create immutable preserved snapshots capturing the before-and-after state when a seller decision is applied to a refund request. Snapshots must be created only after the successful decision update, and snapshots must remain viewable for relevant parties. Snapshots must not be created as a side effect of failed validation or rejected transitions.
   *
   * This endpoint is typically used after locating the correct refund request (for example via refund-request listing or refund-request detail retrieval in your API), and it works in tandem with order-item status review endpoints so the UI can reflect the effect of approve/reject decisions.
   *
   * @param connection
   * @param refundRequestId Target refund request identifier.
   * @param body Seller decision update payload for the refund request (approve/reject plus any seller decision fields required by the refund workflow).
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification 1) Validate input - Load
     *   shopping_mall_refund_requests by id = refundRequestId where deleted_at
     *   is null (or treated as active per existing system convention). - Verify
     *   caller authorization for modifying refund decision fields.
   *
   * 2) Load required context
   * - Load the associated shopping_mall_order_items row via shopping_mall_refund_requests.shopping_mall_order_item_id.
   * - Determine current order item workflow status derived from shopping_mall_order_items.line_item_status (and related fulfillment/shipment linkage via shopping_mall_order_items.shopping_mall_shipment_id if needed by the domain rules).
   *
   * 3) Apply workflow update with allowed transitions
   * - Compute proposed new status from request (status).
   * - Validate status transition is compatible with current refund request status and the order item refund eligibility rules (refund requests are allowed only for eligible delivered order items as specified by domain error scenario requirements).
   * - Validate required fields for the proposed transition:
   *   - customer_reason must remain present (do not allow blank overwrite if DTO requires it; if IUpdate includes it, validate non-empty).
   *   - seller_comment must be present if the workflow requires it for approval/rejection.
   *   - decisioned_at must be set appropriately when status moves out of pending; if DTO provides decisioned_at, validate it is consistent (not null when required).
   *
   * 4) Persist in a transaction
   * - Begin DB transaction.
   * - Update shopping_mall_refund_requests:
   *   - status
   *   - seller_comment
   *   - decisioned_at
   *   - updated_at (and updated_at auto behavior)
   * - Update shopping_mall_order_items.line_item_status if the refund approval/rejection workflow requires transitioning the order item to the corresponding terminal workflow state.
   * - If status becomes approved:
   *   - Restore stock by inserting inventory history records for the referenced product variant quantity and sign (positive quantity changes) consistent with cancellation/refund stock restoration rule.
   *   - Ensure inventory consistency; if unable to apply coherently, rollback and return an error.
   *
   * 5) Snapshot handling
   * - Only after successful transaction commit, create necessary snapshots capturing the before-and-after state of the refund decision (and any order item status transition) following the snapshot integrity rule: no snapshot on validation failure.
   *
   * 6) Response mapping
   * - Return updated refund request record mapped to IShoppingMallRefundRequest.
   *
   * Edge cases
   * - Nonexistent refundRequestId: return 404.
   * - Refund already removed/invalidated by deleted_at: return 404 or 410 per system convention.
   * - Illegal transitions or ineligible order item state: return 400/409 per system convention with no state changes.
   * - Concurrency: apply optimistic or transaction locking strategy if available; otherwise validate current status again right before update.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":refundRequestId")
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("refundRequestId")
    refundRequestId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallRefundRequest.IUpdate,
  ): Promise<IShoppingMallRefundRequest> {
    try {
      return await putShoppingMallMemberRefundRequestsRefundRequestId({
        member,
        refundRequestId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently removes a specific refund request identified by `refundRequestId`.
   *
   * This operation targets the customer-initiated refund workflow record stored in `shopping_mall_refund_requests`. A refund request is associated with a specific purchased `OrderItem` (via the refund request’s foreign key to `shopping_mall_order_items`) and participates in a seller approval workflow. When the authenticated actor is not permitted to manage the targeted refund request, the operation must be rejected.
   *
   * Authorization and scope are required: only the member allowed to manage that refund request (and administrators when applicable by governance rules) can call this endpoint for the given `refundRequestId`. If the refund request does not exist, the operation must return a not-found error.
   *
   * Before removing the record, the service must enforce refund workflow business rules based on the current refund request `status` (and any related order-item state constraints). If removal is not eligible for the current workflow state, the service must reject the operation and leave existing data unchanged.
   *
   * Because the platform uses immutable snapshots to preserve dispute/history context for request state transitions, the implementation must ensure that deleting the refund request does not break referential integrity with existing snapshot records and snapshot-parties records. The exact deletion eligibility and consistency handling must follow the system’s refund request snapshot design.
   *
   * This operation is intended to be used together with read endpoints for refund request details so clients can determine whether deletion is allowed under the current workflow state before calling this deletion endpoint.
   *
   * @param connection
   * @param refundRequestId Target refund request identifier to remove permanently.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implementation steps (service-layer): 1) Parse
     *   `refundRequestId` (UUID) from path. 2) Authorization: verify caller is
     *   allowed to remove this refund request. - Determine the refund request
     *   owner scope by loading `shopping_mall_refund_requests` joined to
     *   `shopping_mall_order_items` and `shopping_mall_orders`. - Compare
     *   `shopping_mall_orders.shopping_customer_id` with the authenticated
     *   member’s id, or allow admin actor per governance rules. 3) Load refund
     *   request row by `id = refundRequestId`. - If not found: return 404. 4)
     *   Business rule check: if deletion is blocked for the current refund
     *   request `status` (or if related order-item workflow constraints require
     *   approval), reject with a domain-specific 409/422 error; do not delete
     *   the row. - The exact status transition/deletion eligibility logic must
     *   follow the refund request rules from the business requirements. 5)
     *   Deletion: execute a permanent removal of the refund request row from
     *   `shopping_mall_refund_requests`. - Use a transaction. - Ensure
     *   foreign-key cascade behavior is consistent with the schema (order item
     *   reference is onDelete: Cascade at relation level). 6)
     *   Snapshot/consistency: if snapshots are used for dispute resolution
     *   timelines, ensure snapshot references remain valid. If the system
     *   mandates snapshot preservation, do not delete snapshot metadata; only
     *   remove the refund request record. 7) Return success with no body.
   *
   * Database queries:
   * - Primary lookup: `shopping_mall_refund_requests` by `id`.
   * - Scope determination: join `shopping_mall_order_items` -> `shopping_mall_orders` to get `shopping_mall_orders.shopping_customer_id`.
   *
   * Edge cases:
   * - Already removed refund request => 404.
   * - Caller attempts to delete another customer’s refund request => 403.
   * - Deletion blocked due to refund workflow constraints => 409/422.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":refundRequestId")
  public async erase(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("refundRequestId")
    refundRequestId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteShoppingMallMemberRefundRequestsRefundRequestId({
        member,
        refundRequestId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
