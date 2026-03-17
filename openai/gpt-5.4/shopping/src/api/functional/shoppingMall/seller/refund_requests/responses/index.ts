import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IShoppingMallRefundRequest } from "../../../../../structures/IShoppingMallRefundRequest";
import { IShoppingMallRefundRequestSnapshot } from "../../../../../structures/IShoppingMallRefundRequestSnapshot";

/**
 * Record a new review response for an existing refund request on a purchased order item.
 *
 * This operation is used when a seller or an administrator responds to a customer-submitted refund request that is already associated with a single record in the refund request workflow. The underlying live record is the `shopping_mall_refund_requests` table, which stores the current refund state, the customer-provided reason, the latest reviewer role, the latest review note, and the latest review timestamp. The related `shopping_mall_order_items` record provides the item-level commercial scope of the case, including the seller responsible for fulfillment and after-sales handling. Because an order item is defined as a distinct purchased line, refund handling through this endpoint is intentionally limited to that one purchased line and must not be broadened into an order-wide decision.
 *
 * This endpoint is available to seller and administrator actors only. A seller may respond only when the target refund request belongs to an order item whose responsible seller matches the authenticated seller, reflecting the approved seller access boundary that limits sellers to their own commercial records and their own refund responses. An administrator may also respond as part of platform oversight. The platform must reject attempts by sellers to answer refund requests belonging to another seller, and it must reject attempts to operate on refund requests that are not eligible for an additional response under the current workflow state.
 *
 * The business effect of this operation is twofold. First, it updates the current live refund request record by changing fields such as the current workflow `status`, `reviewer_role`, `review_note`, and `reviewed_at`. Second, it must create a new historical record in `shopping_mall_refund_request_snapshots` as part of the same business action so the decision trail remains preserved. The loaded requirements explicitly state that each seller or administrator response creates a separate refund history entry, that earlier history must remain visible during later review or dispute handling, and that later decisions must never overwrite or erase previously recorded refund history.
 *
 * Clients should use this endpoint after retrieving the relevant refund request and confirming that a response action is appropriate in the current workflow. The returned resource represents the updated live refund request state after the response has been recorded. Historical review of all prior decisions is a related concern and should be handled through refund-history viewing operations, not by overloading this endpoint with history retrieval responsibilities.
 *
 * If the target refund request does not exist, has been removed from active handling, is not visible to the actor, or is no longer eligible for response, the platform must reject the operation. If persistence of the live refund update or the corresponding snapshot creation fails, the platform must not leave the system in a partially updated state. The update and history creation must succeed or fail together so that the current refund state and its preserved decision trail remain consistent.
 *
 * @param props.connection
 * @param props.refundRequestId Target refund request ID
 * @param props.body Response decision details for the refund request
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification 1. Authenticate the caller and require either seller or administrator authority.
 * 2. Load the target `shopping_mall_refund_requests` record by `refundRequestId` where `deleted_at IS NULL`.
 * 3. If the refund request does not exist, return a not-found error.
 * 4. Join the related `shopping_mall_order_items` record using `shopping_mall_order_item_id` to determine item scope and responsible seller.
 * 5. If the caller is a seller, verify that the authenticated seller identity matches `shopping_mall_order_items.shopping_mall_seller_id`. Reject with a forbidden error when the refund request belongs to another seller.
 * 6. Validate that the refund request is in a workflow state that can accept a new response. Reject invalid state transitions, duplicate terminal responses, or any request that attempts to apply a response outside item-level refund scope.
 * 7. Validate the request body fields. The body should provide the target decision status and an optional or required review note according to downstream DTO rules. The service must derive `reviewer_role` from the authenticated actor type instead of trusting a client-supplied role value.
 * 8. Start a database transaction.
 * 9. Update the live `shopping_mall_refund_requests` row: set the new `status`, set `reviewer_role` to either `seller` or `administrator`, set `review_note`, set `reviewed_at` to the current timestamp, and update `updated_at`.
 * 10. Insert a new row into `shopping_mall_refund_request_snapshots` linked by `shopping_mall_refund_request_id = refundRequestId`. Populate `reviewer_actor_id` with the authenticated reviewer identifier. If snapshot payload expansion exists in downstream schema generation, ensure the snapshot captures the changed response state as required by business rules.
 * 11. Commit the transaction only if both the live refund request update and snapshot insert succeed. On any failure, roll back the transaction.
 * 12. Return the refreshed `shopping_mall_refund_requests` aggregate as the response payload.
 *
 * Implementation notes:
 * - Never modify or remove prior snapshot rows when recording a later response.
 * - Never allow this endpoint to affect other order items in the same order.
 * - Treat `deleted_at` on the live refund request as inactive for write access.
 * - Prefer explicit domain errors for: refund request not found, actor not authorized for this item, request already in a terminal state, and invalid response transition.
 * - Preserve audit consistency by using a single server-generated review timestamp for both the live state change timing and associated snapshot event timing if downstream schema supports it.
 * @path /shoppingMall/seller/refund-requests/:refundRequestId/responses
 * @accessor api.functional.shoppingMall.seller.refund_requests.responses.create
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
     * Target refund request ID
     */
    refundRequestId: string & tags.Format<"uuid">;

    /**
     * Response decision details for the refund request
     */
    body: IShoppingMallRefundRequestSnapshot.ICreate;
  };
  export type Body = IShoppingMallRefundRequestSnapshot.ICreate;
  export type Response = IShoppingMallRefundRequest;

  export const METADATA = {
    method: "POST",
    path: "/shoppingMall/seller/refund-requests/:refundRequestId/responses",
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
    `/shoppingMall/seller/refund-requests/${encodeURIComponent(props.refundRequestId ?? "null")}/responses`;
  export const random = (): IShoppingMallRefundRequest =>
    typia.random<IShoppingMallRefundRequest>();
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
