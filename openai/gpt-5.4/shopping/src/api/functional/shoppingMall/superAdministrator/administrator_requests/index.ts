import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IShoppingMallAdministratorRequest } from "../../../../structures/IShoppingMallAdministratorRequest";

/**
 * Update the review outcome of a specific administrator standing application.
 *
 * This operation allows a super administrator to review a single administrator request and persist the current governance decision for that request. The underlying shopping_mall_administrator_requests record represents an application submitted by an existing platform user who wants to obtain administrator standing. The table stores the applicant classification in applicant_type, the applicant-provided reason in reason, the current review workflow state in status, and the governance decision details in review_note, rejection_reason, reviewed_at, approved_at, and rejected_at. The request is identified by the unique primary key of the administrator request resource.
 *
 * From a security and authority perspective, this operation is reserved for the super administrator role. The requirements state that the super administrator can view pending administrator applications, review the request reason, and decide the outcome by approving or rejecting the application. This elevated authority is part of the internal administrator-grade hierarchy described for AdministratorAccount, where super administrator standing has higher governance authority than regular administrator standing. Because the endpoint changes governance status rather than commercial marketplace data, it is not available to customers, sellers, or ordinary administrators.
 *
 * The operation updates the live workflow state of the administrator request itself and does not alter the normalized applicant subtype ownership stored in shopping_mall_administrator_request_of_customers or shopping_mall_administrator_request_of_sellers. Those subtype tables preserve whether the applicant originated from a customer account or a seller account, while this endpoint focuses on review execution and the resulting decision metadata. When the review is approved, the system must persist the new request status and approval timestamps and must ensure the applicant becomes a regular administrator according to the business workflow. When the review is rejected, the system must persist the rejected status and rejection explanation so the governance outcome remains understandable in future oversight.
 *
 * Clients should call this endpoint only after obtaining the target request identifier from a relevant administrator-request listing or detail retrieval flow. The update must reject unknown request identifiers, must reject unauthorized actors, and must enforce workflow consistency for review fields so that the resulting request record remains aligned with the requested decision. The response returns the updated administrator request so governance tools can immediately reflect the new status and review information.
 *
 * @param props.connection
 * @param props.administratorRequestId Target administrator request ID
 * @param props.body Administrator request review update data
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor superAdministrator
 * @x-autobe-specification Load the shopping_mall_administrator_requests row by
 *   id using administratorRequestId and ensure deleted_at is null unless the
 *   platform explicitly supports reviewing logically deleted requests, which is
 *   not indicated by the current requirements. If no matching row exists, raise
 *   a not-found error.
 *
 * Authorize only the superAdministrator actor. Reject requests from customers, sellers, regular administrators, guests, banned governance accounts, or otherwise unauthorized sessions.
 *
 * Validate the incoming IShoppingMallAdministratorRequest.IUpdate payload as a governance review command rather than a generic full-record overwrite. Allow updates only to workflow decision fields that are consistent with the review process, especially status, reviewNote, and rejectionReason in DTO form, mapped to status, review_note, and rejection_reason in the database. Do not allow mutation of applicant ownership, applicant_type, original reason text, or subtype linkage rows.
 *
 * Before applying changes, verify that the target request is in a reviewable state. A previously finalized request should not be re-reviewed unless the business policy explicitly permits reopening, which is not established in the loaded requirements. For an approval decision, set status to approved, set reviewed_at and approved_at to the current timestamp, clear rejected_at and rejection_reason, and record reviewed_by_administrator_id from the authenticated super administrator's administrator identity. For a rejection decision, set status to rejected, set reviewed_at and rejected_at to the current timestamp, require a rejection reason when business validation demands an explicit explanation, clear approved_at, and set reviewed_by_administrator_id accordingly.
 *
 * When the decision is approval, execute the associated governance side effect in the same transaction: create or activate the applicant's administrator standing as a regular administrator according to the administrator-request workflow defined in requirements. Determine the applicant source from applicant_type and the existing subtype relation row. Do not alter unrelated customer or seller marketplace identity data beyond the administrator-standing grant.
 *
 * Persist the updated request row in a transaction that includes all workflow side effects. Return the refreshed detailed administrator request projection. Include robust error handling for missing request rows, unauthorized role usage, invalid workflow transitions, inconsistent applicant subtype state, and duplicate or conflicting authority-grant side effects.
 * @path /shoppingMall/superAdministrator/administrator-requests/:administratorRequestId
 * @accessor api.functional.shoppingMall.superAdministrator.administrator_requests.update
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
     * Target administrator request ID
     */
    administratorRequestId: string & tags.Format<"uuid">;

    /**
     * Administrator request review update data
     */
    body: IShoppingMallAdministratorRequest.IUpdate;
  };
  export type Body = IShoppingMallAdministratorRequest.IUpdate;
  export type Response = IShoppingMallAdministratorRequest;

  export const METADATA = {
    method: "PUT",
    path: "/shoppingMall/superAdministrator/administrator-requests/:administratorRequestId",
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
    `/shoppingMall/superAdministrator/administrator-requests/${encodeURIComponent(props.administratorRequestId ?? "null")}`;
  export const random = (): IShoppingMallAdministratorRequest =>
    typia.random<IShoppingMallAdministratorRequest>();
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
      assert.param("administratorRequestId")(() =>
        typia.assert(props.administratorRequestId),
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
