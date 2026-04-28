import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IShoppingMallRefundRequest } from "../../../../structures/IShoppingMallRefundRequest";

export * as responses from "./responses/index";

/**
 * Update the current workflow state of an existing refund request for a single purchased order item.
 *
 * This operation manages the active record stored in `shopping_mall_refund_requests`, which is the current customer-submitted refund workflow for one specific `shopping_mall_order_items` record. The refund request stores the customer's original reason, the current status such as pending, approved, rejected, or withdrawn, the latest reviewer role, the latest review note, and the latest review timestamp. Because the underlying database model defines a refund request as belonging to exactly one order item and one customer, this endpoint updates the review state of that single dispute record rather than applying any action to an entire order.
 *
 * Access to this operation must be restricted to actors responsible for reviewing refund requests. The requirements state that, after submission, a refund request becomes visible to the customer and to the seller responsible for the order item so they can track its current state, and the schema explicitly models `reviewer_role` as the latest reviewer role such as seller or administrator. Therefore, the intended callers are the responsible seller for the underlying order item and platform administrators with oversight authority. The service must reject attempts to update a refund request by unrelated sellers, unauthenticated users, or customers trying to overwrite review outcomes.
 *
 * The operation is tightly connected to `shopping_mall_order_items` and indirectly to `shopping_mall_orders`. The order item table describes each purchased line item with seller responsibility, quantity, unit price, current lifecycle status, and the `delivered_at` timestamp used for refund eligibility calculations. The business rules also require refund processing at the order-item level only, not the whole order. For that reason, this endpoint must preserve the one-request-per-item scope and must never reinterpret the update as an order-wide refund action. The request updates the current active workflow record only; historical review trail details should remain preserved through related `shopping_mall_refund_request_snapshots` records.
 *
 * Clients typically call this endpoint after first obtaining the target refund request from a detail or list operation. The caller should already know the refund request identifier and the business context of the requested action. This endpoint does not create a new refund request and does not replace customer submission validation such as the delivered-item requirement, the seven-day submission window, or the mandatory reason text for initial submission. Instead, it progresses or amends the existing review state, records the latest reviewer metadata, and returns the updated refund request resource for immediate UI refresh and audit visibility.
 *
 * If the specified refund request does not exist, is not accessible to the acting reviewer, or the requested transition violates the business workflow, the service must reject the update. If the underlying order item does not belong to the seller attempting the review, the operation must be denied. If the request attempts to alter immutable ownership or submission context instead of the review state, the service must also reject the change. Successful processing updates the active refund-request record while keeping the single-item dispute boundary and historical traceability intact.
 *
 * @param props.connection
 * @param props.refundRequestId Target refund request ID
 * @param props.body Refund request review update data
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification 1. Authenticate the caller and require either a
 *   seller session or an administrator-level session. 2. Load the target
 *   `shopping_mall_refund_requests` row by `id = refundRequestId` with its
 *   related `orderItem` and parent `order` context. 3. Reject when the refund
 *   request is not found or has been hidden from active views by `deleted_at`
 *   if the service policy excludes deleted records from update targets. 4. For
 *   seller callers, verify that
 *   `shopping_mall_order_items.shopping_mall_seller_id` matches the
 *   authenticated seller account. Reject any cross-seller attempt. 5. For
 *   administrator callers, allow oversight update according to platform
 *   governance permissions. 6. Validate the request body against the
 *   `IShoppingMallRefundRequest.IUpdate` schema. Treat the operation as a
 *   workflow-state update only. Do not allow changes to immutable submission
 *   identity such as `shopping_mall_order_item_id`,
 *   `shopping_mall_customer_id`, or replacement of the original
 *   customer-submitted reason unless that DTO explicitly permits a governed
 *   correction and the business policy allows it. 7. Validate the requested
 *   status transition against the active refund workflow. At minimum, reject
 *   no-op or invalid transitions that contradict the current state or attempt
 *   to apply order-wide refund semantics through a single-item request. 8. When
 *   the update represents a review action, write `reviewer_role` according to
 *   the acting authority (`seller` or `administrator`), persist `review_note`
 *   from the request when provided, and set `reviewed_at` to the current
 *   timestamp. 9. Update the parent refund request row fields that are allowed
 *   by the workflow, always refresh `updated_at`, and keep the record linked to
 *   the same order item and customer. 10. Create or delegate creation of a
 *   related `shopping_mall_refund_request_snapshots` history record so the
 *   review event remains auditable. Preserve child-specific reviewer audit
 *   context such as `reviewer_actor_id`. 11. If the new status implies an
 *   approved refund outcome, invoke downstream order-item and financial
 *   business logic in the appropriate service layer rather than embedding
 *   unrelated payment logic directly in the controller. Any resulting
 *   order-item lifecycle adjustment must remain scoped only to the referenced
 *   order item. 12. Return the freshly updated refund request resource.
 *
 * Edge cases:
 * - Reject update when the refund request is already in a terminal state and the requested transition is not permitted by policy.
 * - Reject seller review when the seller is not the responsible seller for the disputed order item.
 * - Reject attempts to reinterpret one refund request as covering multiple order items or an entire order.
 * - Ensure concurrent updates are handled safely, preferably with transactional write logic and current-state verification before commit.
 * @path /shoppingMall/seller/refund-requests/:refundRequestId
 * @accessor api.functional.shoppingMall.seller.refund_requests.update
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function update(
  connection: IConnection,
  props: update.Props,
): Promise<update.Response> {
  return true === connection.simulate
    ? update.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...update.METADATA,
          path: update.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace update {
  export type Props = {
    /**
     * Target refund request ID
     */
    refundRequestId: string & tags.Format<"uuid">;

    /**
     * Refund request review update data
     */
    body: IShoppingMallRefundRequest.IUpdate;
  };
  export type Body = IShoppingMallRefundRequest.IUpdate;
  export type Response = IShoppingMallRefundRequest;

  export const METADATA = {
    method: "PUT",
    path: "/shoppingMall/seller/refund-requests/:refundRequestId",
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
    `/shoppingMall/seller/refund-requests/${encodeURIComponent(props.refundRequestId ?? "null")}`;
  export const random = (): IShoppingMallRefundRequest =>
    typia.random<IShoppingMallRefundRequest>();
  export const simulate = (
    connection: IConnection,
    props: update.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: update.path(props),
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
