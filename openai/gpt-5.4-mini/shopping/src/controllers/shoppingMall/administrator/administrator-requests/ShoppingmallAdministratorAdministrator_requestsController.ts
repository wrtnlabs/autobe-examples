import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIShoppingMallAdministratorRequest } from "../../../../api/structures/IPageIShoppingMallAdministratorRequest";
import { IShoppingMallAdministratorRequest } from "../../../../api/structures/IShoppingMallAdministratorRequest";
import { AdministratorAuth } from "../../../../decorators/AdministratorAuth";
import { AdministratorPayload } from "../../../../decorators/payload/AdministratorPayload";
import { getShoppingMallAdministratorAdministratorRequestsAdministratorRequestId } from "../../../../providers/getShoppingMallAdministratorAdministratorRequestsAdministratorRequestId";
import { patchShoppingMallAdministratorAdministratorRequests } from "../../../../providers/patchShoppingMallAdministratorAdministratorRequests";

@Controller("/shoppingMall/administrator/administrator-requests")
export class ShoppingmallAdministratorAdministrator_requestsController {
  /**
   * Retrieve a paginated list of administrator application requests for governance review and administrative oversight.
   *
   * This operation returns the current-state records stored in the administrator request domain, where each request represents a customer or seller applying for administrative responsibility on the platform. The request record keeps the applicant’s reason, current approval status, and any rejection reason as the canonical workflow state, while the applicant identity itself is maintained through the normalized applicant link tables for customer-originated and seller-originated applications.
   *
   * Super administrators use this endpoint to open and manage the pending review queue described by the administrator request workflow. The list is intended for operational review, so it supports filtering by request status, applicant type, applicant account identifier, reason text, and submission date range, along with standard pagination and sorting. The review history associated with each request is preserved separately in the administrator request review table and can be referenced during decision-making when a request has already been processed.
   *
   * Only administrator actors should have access to this endpoint. Regular administrators may be allowed to inspect request history depending on authorization policy, but the primary business purpose is the super administrator review flow. Requests that are already approved or rejected remain visible as historical records, while pending requests remain actionable. The endpoint must not create, modify, or resolve requests; it only exposes searchable governance data for review queues and audit-oriented administration.
   *
   * @param connection
   * @param body Search criteria, pagination, and sorting options for administrator requests.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor administrator
   * @x-autobe-specification Implement a read-only search endpoint over shopping_mall_administrator_requests with pagination.
   *
   * Query the administrator request table as the root dataset and left-join or separately resolve applicant ownership through shopping_mall_administrator_request_applicant_customers and shopping_mall_administrator_request_applicant_sellers. Because the main request table stores the current request state and reason, the search should filter primarily on status, reason text, rejected_reason text, created_at ranges, and applicant type. For applicant identity filters, resolve through the normalized applicant tables and then join to shopping_mall_customers or shopping_mall_sellers as needed.
   *
   * Support paginated result delivery with stable ordering, defaulting to newest requests first by created_at descending, then id descending as a deterministic tie-breaker. Return only summary fields necessary for queue review: request id, reason, status, rejected reason when present, timestamps, applicant type, and applicant account reference/display data. Do not hydrate full review history in the list response; that should be loaded through a dedicated detail or review-history endpoint if present.
   *
   * Apply authorization checks before querying: only administrator roles may access the endpoint, and super administrators are the expected consumers for pending review queues. If role-based policy is configured more narrowly, enforce it here rather than in the client. Reject malformed pagination inputs, invalid status values, and filters that reference non-existent applicant types. If a request has no applicant link in either subtype table, exclude it from the list only if the data is invalid; otherwise expose it as a data integrity issue to be investigated separately.
   *
   * Use indexed fields for performance: status + created_at on the request table, applicant foreign-key indexes on the subtype tables, and text search on reason/rejected_reason only when the query requires it. The operation must not mutate approval state, create review records, or change the request lifecycle. It is strictly a list/search view for the governance workflow.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @AdministratorAuth()
    administrator: AdministratorPayload,
    @TypedBody()
    body: IShoppingMallAdministratorRequest.IRequest,
  ): Promise<IPageIShoppingMallAdministratorRequest.ISummary> {
    try {
      return await patchShoppingMallAdministratorAdministratorRequests({
        administrator,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single administrator application request for governance review.
   *
   * An administrator request is the platform record that captures a customer or seller’s application to take on administrative responsibility. This endpoint returns the full request record so a super administrator can inspect the applicant’s justification, current approval status, and other request details before making a review decision.
   *
   * The response is based on the administrator application request stored in the shopping_mall_administrator_requests table. The request exists as a governance record rather than an administrator identity itself, and it preserves the reason submitted by the applicant as well as the request’s state in the review workflow. Because administrator requests are part of the platform’s oversight history, this endpoint is read-only and is intended for administrative review interfaces and audit-support tools.
   *
   * Only authorized governance actors should access this operation, with super administrators being the primary audience because they are the role responsible for reviewing pending administrator applications. The endpoint must validate that the requested identifier refers to an existing administrator request and return a not-found response when the record does not exist. It should not modify approval state, applicant role, or review history; those changes belong to the dedicated review/decision operations.
   *
   * This detail view is commonly used together with the administrator request list endpoint that surfaces pending applications. The list operation identifies which requests need attention, and this endpoint provides the full record for the selected request so the reviewer can inspect the applicant’s reason and status in context.
   *
   * @param connection
   * @param administratorRequestId Target administrator request ID.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor administrator
   * @x-autobe-specification Load a single row from shopping_mall_administrator_requests by administratorRequestId.
   * Validate the path identifier as a UUID and fetch the record by primary key or equivalent unique identifier.
   * If the request does not exist, return 404.
   * Do not join or mutate any review tables in this operation; this is a pure retrieval endpoint.
   * Return the full administrator request entity as defined by the API schema, including the applicant reason and current approval status fields that exist on the table.
   * Authorization should require an administrative governance role, with super administrator access as the primary allowed actor because request review is a super-admin responsibility.
   * If the implementation also supports broader oversight roles, ensure they still cannot alter the record through this endpoint.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":administratorRequestId")
  public async at(
    @AdministratorAuth()
    administrator: AdministratorPayload,
    @TypedParam("administratorRequestId")
    administratorRequestId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallAdministratorRequest> {
    try {
      return await getShoppingMallAdministratorAdministratorRequestsAdministratorRequestId(
        {
          administrator,
          administratorRequestId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
