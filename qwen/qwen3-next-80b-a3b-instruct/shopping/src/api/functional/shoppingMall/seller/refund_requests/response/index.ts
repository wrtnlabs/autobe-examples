import { HttpError, IConnection } from "@nestia/fetcher";
import { NestiaSimulator } from "@nestia/fetcher/lib/NestiaSimulator";
import { PlainFetcher } from "@nestia/fetcher/lib/PlainFetcher";
import typia from "typia";

import { IShoppingMallRefundResponseSnapshot } from "../../../../../structures/IShoppingMallRefundResponseSnapshot";
import { IShoppingMallRequestResponse } from "../../../../../structures/IShoppingMallRequestResponse";

/**
 * Respond to a customer-initiated refund request for an order item.
 *
 * This operation allows a seller to approve or reject a refund request submitted by a customer for a specific order item. When a customer requests a refund for a delivered product, a refund request is created in the system with status 'pending'. The seller must respond to this request within 72 hours, or the system will automatically approve it. This endpoint enables the seller to provide a decision ('approve' or 'reject') along with a reason (minimum 10 characters, maximum 500 characters). The response is stored as an immutable record that cannot be modified or deleted, preserving the exact decision and reason as it was submitted.
 *
 * The refund request is linked to an order item, which contains the exact product state, variant configuration, seller profile, and price as they existed at time of purchase. This operation preserves this context by tying the seller's response to the specific refund request. Upon successful response, the refund request status is updated to match the seller's decision, and an immutable audit record is created in the system for audit purposes.
 *
 * This operation is only allowed for sellers who are the owners of the product associated with the refund request. The seller's response is final and cannot be changed after submission. If the seller rejects the request, the customer may not submit another refund request for the same order item. If the seller approves the request, the system will restore inventory to the product variant and process the financial refund according to the platform refund policy.
 *
 * The response reason must be provided by the seller and must be at least 10 characters in length, with a maximum of 500 characters. This ensures accountability and provides meaningful context for customers and administrators in case of disputes. The response timestamp is recorded precisely when the seller submits it, and this cannot be altered or falsified.
 *
 * This operation is governed by strict audit trail requirements: every response creation event is recorded in the system's immutable audit history, and administrators have access to all response histories for dispute resolution. These records are preserved indefinitely and are used as authoritative records for resolving commercial disputes, compliance audits, and fraud investigations.
 *
 * For security and access control: Only authenticated sellers who are the owners of the product associated with the refund request may call this endpoint. This endpoint does not allow customer-initiated responses or responses from non-owner sellers. Attempting to respond to a refund request owned by another seller will result in a 403 Forbidden response.
 *
 * This operation does not create or modify any order items, shipping records, or inventory records directly. These changes occur through separate business processes triggered by the response status change. The API operation is strictly limited to capturing the seller's decision and reason as an immutable audit record.
 *
 * This endpoint is designed to work in conjunction with the system's auto-approval feature: if no response is received within 72 hours of the refund request being created, the system will automatically approve the refund without requiring any manual intervention from the seller. Manual responses, however, override the automatic approval process and are recorded with their exact submission timestamp for audit completeness.
 *
 * @param props.connection
 * @param props.requestId The unique identifier of the refund request being responded to. This links to the shopping_mall_refund_requests table.
 * @param props.body Contains the seller's decision and reason for the refund request response.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification Find refund request by ID in shopping_mall_refund_requests table using requestId path parameter. Validate seller has ownership of the product linked to this refund request by joining with shopping_mall_order_items, shopping_mall_products, and shopping_mall_sellers. Validate seller is authenticated and matches seller_id on the refund request. Validate that the refund request status is currently 'pending'. Extract decision (must be 'approve' or 'reject') and reason (10-500 characters) from request body. Create new shopping_mall_refund_response_snapshots record with refund_request_id, seller_id, decision, reason, and current timestamp. Update the shopping_mall_refund_requests status field to match the decision provided. Return HTTP 201 Created with the created response snapshot. If refund request not found, return 404. If seller is unauthorized (not owner of product), return 403. If refund request is not 'pending', return 409 Conflict. If decision is not 'approve' or 'reject', return 400 Bad Request. If reason is below 10 or above 500 characters, return 400 Bad Request. Ensure all operations are in a single atomic transaction to prevent inconsistent states. All data in response snapshot must be immutable. Never allow deletion or modification of response snapshot after creation.
 * @path /shoppingMall/seller/refund-requests/:requestId/response
 * @accessor api.functional.shoppingMall.seller.refund_requests.response.approveRefund
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function approveRefund(
  connection: IConnection,
  props: approveRefund.Props,
): Promise<approveRefund.Response> {
  return true === connection.simulate
    ? approveRefund.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...approveRefund.METADATA,
          path: approveRefund.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace approveRefund {
  export type Props = {
    /**
     * The unique identifier of the refund request being responded to. This links to the shopping_mall_refund_requests table.
     */
    requestId: string;

    /**
     * Contains the seller's decision and reason for the refund request response.
     */
    body: IShoppingMallRequestResponse;
  };
  export type Body = IShoppingMallRequestResponse;
  export type Response = IShoppingMallRefundResponseSnapshot;

  export const METADATA = {
    method: "PUT",
    path: "/shoppingMall/seller/refund-requests/:requestId/response",
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
    `/shoppingMall/seller/refund-requests/${encodeURIComponent(props.requestId ?? "null")}/response`;
  export const random = (): IShoppingMallRefundResponseSnapshot =>
    typia.random<IShoppingMallRefundResponseSnapshot>();
  export const simulate = (
    connection: IConnection,
    props: approveRefund.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: approveRefund.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("requestId")(() => typia.assert(props.requestId));
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
