import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IPageIShoppingMallRefundRequestSnapshot } from "../../../../../structures/IPageIShoppingMallRefundRequestSnapshot";
import { IShoppingMallRefundRequestSnapshot } from "../../../../../structures/IShoppingMallRefundRequestSnapshot";

/**
 * Retrieve the preserved snapshot history for a single refund request.
 *
 * This operation exposes the audit trail stored for a refund request so that relevant parties can review how the case evolved over time. According to the refund history requirements, the platform must preserve the full refund request snapshot trail, keep it available after the live refund request reaches a final state, and present the trail in change order for dispute resolution and historical reference. The returned data therefore represents the child audit records of the active refund workflow record in `shopping_mall_refund_requests`, using the parent-child relationship defined by `shopping_mall_refund_request_snapshots.shopping_mall_refund_request_id`.
 *
 * The underlying parent refund request contains the active business state for one disputed order item, including the customer-provided reason, current status, latest reviewer role, latest review note, and latest reviewed timestamp. Snapshot records exist to preserve immutable historical review context alongside that parent workflow. Because the snapshot table is described as a child audit table attached to a refund request, this endpoint is intentionally nested under the parent refund request path rather than exposed as a top-level mutable resource. Consumers should use this operation when they need to inspect the sequence of preserved review events surrounding a refund case instead of relying only on the current live refund request row.
 *
 * Access to this operation should be limited to relevant parties involved in refund handling and dispute review. That includes the customer who owns the refund request, the seller operationally responsible for the underlying order item through the associated order item and seller relationship, and administrators who oversee after-sales workflows. Implementations must verify that the requested refund record exists, that it is not hidden from active access by business rules, and that the caller is entitled to inspect the history for that specific case.
 *
 * The response should present snapshots in chronological change order so reviewers can understand when each recorded refund change happened, what changed, and how earlier preserved states differ from the current request state. Even if the live refund request has been approved, rejected, withdrawn, or otherwise finalized, this operation must continue to make previously preserved snapshots available because the requirements explicitly treat them as an immutable audit trail for later dispute handling. No behavior in this operation may allow alteration or removal of snapshot history.
 *
 * This operation is typically used together with the parent refund request detail view. Clients may first retrieve the current refund request to understand its present status, then call this history endpoint to inspect the decision progression and preserved reviewer actions that led to the current outcome.
 *
 * @param props.connection
 * @param props.refundRequestId Target refund request ID
 * @param props.body History browsing criteria and pagination options
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification Validate the `refundRequestId` path parameter as a
 *   UUID and load the parent record from `shopping_mall_refund_requests` by
 *   `id`.
 *
 * Authorize access before returning history. Allow the request when the caller is the customer identified by `shopping_mall_customer_id` on the parent refund request, the seller responsible for the related order item obtained through `shopping_mall_order_items.shopping_mall_seller_id`, or an administrator actor with platform oversight. Reject access when the caller is unrelated to the refund case.
 *
 * Query `shopping_mall_refund_request_snapshots` filtered by `shopping_mall_refund_request_id = refundRequestId`. Join the parent `shopping_mall_refund_requests` record as needed to derive comparison metadata required by the DTO layer, including the active refund status, reviewer role, review note, reviewed timestamp, and customer reason. If the DTO for summaries includes change comparison fields, construct them from preserved snapshot context and the relevant parent/request history representation supplied by the domain model.
 *
 * Return the snapshot trail in chronological order suitable for audit review. Support paging, ordering, and optional history-view filters from `IShoppingMallRefundRequestSnapshot.IRequest`, but preserve a deterministic default order that reflects progression of recorded changes.
 *
 * Do not create, update, or delete any snapshot rows in this operation. Snapshot creation belongs to seller or administrator refund-response workflows and must occur in the same business action that records a refund response. This endpoint is strictly read-only over immutable historical records.
 *
 * If the parent refund request does not exist, return a not-found error. If the caller lacks authority for the specific refund request, return a forbidden error. If no snapshots exist yet for an otherwise valid refund request, return an empty paginated result rather than fabricating history. Exclude records that are not linked to the specified parent refund request.
 * @path /shoppingMall/customer/refund-requests/:refundRequestId/snapshots
 * @accessor api.functional.shoppingMall.customer.refund_requests.snapshots.index
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
     * Target refund request ID
     */
    refundRequestId: string & tags.Format<"uuid">;

    /**
     * History browsing criteria and pagination options
     */
    body: IShoppingMallRefundRequestSnapshot.IRequest;
  };
  export type Body = IShoppingMallRefundRequestSnapshot.IRequest;
  export type Response = IPageIShoppingMallRefundRequestSnapshot.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/customer/refund-requests/:refundRequestId/snapshots",
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
    `/shoppingMall/customer/refund-requests/${encodeURIComponent(props.refundRequestId ?? "null")}/snapshots`;
  export const random = (): IPageIShoppingMallRefundRequestSnapshot.ISummary =>
    typia.random<IPageIShoppingMallRefundRequestSnapshot.ISummary>();
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
      assert.param("refundRequestId")(() =>
        typia.assert(props.refundRequestId),
      );
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
 * Retrieve one preserved refund request snapshot from the history of a specific refund request.
 *
 * This operation returns a single immutable historical snapshot record that belongs to the specified refund request. In the shopping mall domain, refund request snapshots exist to preserve refund-decision history over time rather than to replace the live refund request. The parent refund request is the active workflow record for one purchased order item and stores the customer's reason, the current status, the latest reviewer role, the latest review note, and the latest review timing. By contrast, the snapshot record is a preserved child audit record attached to that parent request, created as part of a seller or administrator response so that historical review remains possible even after the live request changes again.
 *
 * Access to this operation must be restricted to relevant parties only. That includes the customer who owns the refund request, sellers or administrators who are legitimately involved in reviewing the disputed order-item context, and administrative oversight roles that are allowed to inspect platform records. The operation must not expose refund history across unrelated users, because refund requests are tied to a specific customer and a specific purchased order item. The parent-child route structure is therefore part of the access boundary as well as part of the resource identity.
 *
 * This endpoint is closely aligned with the requirement that refund request snapshots remain preserved, immutable, and available for dispute resolution and historical reference. The snapshot trail must remain viewable after the live refund request reaches a final state, and the history must be reviewable in change order. When this specific snapshot is retrieved, clients can inspect the preserved review event represented by that historical child record, including when it was recorded and which reviewing actor was preserved as child-specific audit context. Because the snapshot table intentionally avoids duplicating parent business fields, consumers may use the parent refund-request history endpoints together with this detail endpoint to understand the full progression of reason, status, reviewer role, review note, and review timing across the life of the request.
 *
 * This operation depends on the parent refund request existing and the target snapshot actually belonging to that parent. Clients would typically use the refund-request snapshot history listing operation first to browse the chronological history of a refund request and then call this detail endpoint to inspect one preserved snapshot in more depth. If either the refund request does not exist, the snapshot does not exist, or the snapshot is not associated with the provided refund request, the request must fail rather than returning unrelated history. This behavior protects the audit trail from accidental or unauthorized cross-request access.
 *
 * @param props.connection
 * @param props.refundRequestId Target refund request ID that owns this snapshot
 * @param props.snapshotId Target refund request snapshot ID within the specified refund request
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification Load the parent record from
 *   shopping_mall_refund_requests by id = refundRequestId first, and enforce
 *   authorization based on the caller's role and ownership of the underlying
 *   refund request and order-item context. Customers may read only their own
 *   refund-request history. Sellers may read snapshot history only when they
 *   are operationally responsible for the associated order item through the
 *   surrounding order and fulfillment relationships. Administrators may read
 *   for oversight purposes.
 *
 * After parent authorization succeeds, load the child snapshot from shopping_mall_refund_request_snapshots where id = snapshotId and shopping_mall_refund_request_id = refundRequestId. Never resolve the snapshot by snapshotId alone for the final result, because the nested route requires containment validation. If no matching parent-child pair exists, return a not-found error.
 *
 * Build the response as a detailed refund request snapshot resource. Map snapshot-specific fields directly from shopping_mall_refund_request_snapshots, especially id, shopping_mall_refund_request_id, and reviewer_actor_id. When the DTO requires business context such as the preserved refund-request state, obtain it through the parent refund request relationship or the broader snapshot-history projection used by the service layer, because the child table intentionally does not duplicate the parent's reason, status, reviewer_role, review_note, reviewed_at, created_at, updated_at, or deleted_at fields. The service implementation may use a dedicated read model or join-based query that combines child audit context with the historical projection expected by the DTO.
 *
 * Treat the snapshot as immutable. This endpoint must never mutate shopping_mall_refund_request_snapshots or the parent shopping_mall_refund_requests row. It is a pure read operation for audit-trail inspection. Preserve chronological integrity and avoid synthesizing fake history entries when related data is missing.
 *
 * Error handling must include: refund request not found; snapshot not found under the specified refund request; caller not authorized to inspect the parent request's history; and inaccessible associated records needed to determine ownership or review scope. When the live refund request has reached a final state or has been hidden from active views, already-preserved snapshots must remain retrievable to authorized parties for dispute review according to the preservation requirements.
 * @path /shoppingMall/customer/refund-requests/:refundRequestId/snapshots/:snapshotId
 * @accessor api.functional.shoppingMall.customer.refund_requests.snapshots.at
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
     * Target refund request ID that owns this snapshot
     */
    refundRequestId: string & tags.Format<"uuid">;

    /**
     * Target refund request snapshot ID within the specified refund request
     */
    snapshotId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallRefundRequestSnapshot;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/customer/refund-requests/:refundRequestId/snapshots/:snapshotId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/customer/refund-requests/${encodeURIComponent(props.refundRequestId ?? "null")}/snapshots/${encodeURIComponent(props.snapshotId ?? "null")}`;
  export const random = (): IShoppingMallRefundRequestSnapshot =>
    typia.random<IShoppingMallRefundRequestSnapshot>();
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
      assert.param("snapshotId")(() => typia.assert(props.snapshotId));
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
