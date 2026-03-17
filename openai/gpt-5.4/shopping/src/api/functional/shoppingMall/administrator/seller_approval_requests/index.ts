import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IShoppingMallSellerApprovalRequest } from "../../../../structures/IShoppingMallSellerApprovalRequest";

/**
 * Update the review outcome of a specific seller approval request.
 *
 * This operation is used when an administrator performs the review decision step for a seller approval case. A seller approval request is the governance record that represents a seller’s submission for permission to sell on the platform, and it is intentionally separate from the seller account itself. The operation updates that existing review case by recording the administrator’s decision on the identified request. In business terms, this is the point where a pending request is examined and moved to its decided outcome so that the platform can determine whether the seller gains active selling eligibility.
 *
 * The underlying resource corresponds to the seller approval request concept described in the requirements as an administrator-reviewed submission with an outcome of pending, approved, or rejected. The request may also include rejection information that explains why selling eligibility was not granted. This means the update is not merely a technical state change: it is the authoritative governance action that determines whether the seller remains unable to sell, becomes approved to begin selling, or is rejected with a visible reason that can later be shown back to the seller.
 *
 * Access to this operation is restricted to elevated governance actors. Regular administrators are explicitly allowed to perform seller approval oversight, including reviewing seller accounts that require administrative approval before they can sell, and super administrators inherit broader governance authority. Sellers do not use this endpoint to change their own approval outcomes. The endpoint therefore represents an internal review action performed by platform governance personnel rather than a self-service seller profile update.
 *
 * From a data perspective, the operation targets the current seller approval request record and updates the decision-related fields associated with the review outcome. The response returns the latest detailed seller approval request state after the update so the caller can confirm the persisted decision, including whether the request is now approved or rejected and whether a rejection reason is present. This behavior aligns with the requirement that the system keep the administrative review outcome on the seller approval request so it can be shown back to the seller.
 *
 * This operation is typically used after an administrator has already identified a pending request from the seller approval request listing and opened the individual case for review. In that workflow, the list retrieval endpoint for seller approval requests is used first to find requests awaiting review, and this endpoint is then used to record the final review decision for one specific case. If the identified resource does not exist, is not eligible for review, or the caller lacks administrative authority, the operation must reject the request instead of mutating governance data.
 *
 * @param props.connection
 * @param props.sellerApprovalRequestId Identifier of the seller approval request to update
 * @param props.body Updated review decision for the seller approval request
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor administrator
 * @x-autobe-specification Load the target seller approval request by sellerApprovalRequestId.
 *
 * Authorize only administrator or superAdministrator actors. Reject requests from sellers, customers, guests, or other unauthenticated callers. For regular administrators, allow the action because seller approval oversight is explicitly within administrator authority boundaries.
 *
 * Validate that the target seller approval request exists and retrieve its current review state together with the linked seller account context needed to apply post-decision effects. If the resource is not found, fail the operation.
 *
 * Accept an IShoppingMallSellerApprovalRequest.IUpdate payload that represents the administrator review decision. Validate that the requested outcome is a supported decision value for review completion. Enforce the business rule that a rejection path must persist rejection information when the decision is rejection, while approval must not rely on a rejection explanation as its primary outcome data.
 *
 * Before applying the update, verify that the request is currently pending. If the request has already been decided, reject the update to preserve a single authoritative review result for that review cycle.
 *
 * Execute the decision update in a transaction. Update the seller approval request from pending to approved or rejected, store any rejection reason when applicable, and persist review metadata fields defined by the schema. When the decision is approved, also update the linked seller account or related eligibility state so the seller becomes recognized as allowed to begin selling. When the decision is rejected, keep the seller in a non-approved state and preserve the rejection explanation on the request for later seller visibility.
 *
 * Return the fully updated seller approval request entity after commit. The returned representation should reflect the final persisted state exactly as stored, including current outcome and rejection information.
 *
 * Error handling: reject when the caller lacks governance authority, when the target request does not exist, when the request is no longer pending, when the requested transition is invalid, or when rejection-specific required data is missing for a rejection decision.
 * @path /shoppingMall/administrator/seller-approval-requests/:sellerApprovalRequestId
 * @accessor api.functional.shoppingMall.administrator.seller_approval_requests.update
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
     * Identifier of the seller approval request to update
     */
    sellerApprovalRequestId: string & tags.Format<"uuid">;

    /**
     * Updated review decision for the seller approval request
     */
    body: IShoppingMallSellerApprovalRequest.IUpdate;
  };
  export type Body = IShoppingMallSellerApprovalRequest.IUpdate;
  export type Response = IShoppingMallSellerApprovalRequest;

  export const METADATA = {
    method: "PUT",
    path: "/shoppingMall/administrator/seller-approval-requests/:sellerApprovalRequestId",
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
    `/shoppingMall/administrator/seller-approval-requests/${encodeURIComponent(props.sellerApprovalRequestId ?? "null")}`;
  export const random = (): IShoppingMallSellerApprovalRequest =>
    typia.random<IShoppingMallSellerApprovalRequest>();
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
      assert.param("sellerApprovalRequestId")(() =>
        typia.assert(props.sellerApprovalRequestId),
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
