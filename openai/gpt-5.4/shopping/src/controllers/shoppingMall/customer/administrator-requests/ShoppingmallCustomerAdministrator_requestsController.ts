import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIShoppingMallAdministratorRequest } from "../../../../api/structures/IPageIShoppingMallAdministratorRequest";
import { IShoppingMallAdministratorRequest } from "../../../../api/structures/IShoppingMallAdministratorRequest";
import { CustomerAuth } from "../../../../decorators/CustomerAuth";
import { CustomerPayload } from "../../../../decorators/payload/CustomerPayload";
import { getShoppingMallCustomerAdministratorRequestsAdministratorRequestId } from "../../../../providers/getShoppingMallCustomerAdministratorRequestsAdministratorRequestId";
import { patchShoppingMallCustomerAdministratorRequests } from "../../../../providers/patchShoppingMallCustomerAdministratorRequests";
import { postShoppingMallCustomerAdministratorRequests } from "../../../../providers/postShoppingMallCustomerAdministratorRequests";

@Controller("/shoppingMall/customer/administrator-requests")
export class ShoppingmallCustomerAdministrator_requestsController {
  /**
   * Create a new administrator standing application for the authenticated customer or seller account.
   *
   * This operation creates a governance request in the shopping mall platform using the administrator request workflow stored in the shopping_mall_administrator_requests table. That table is defined as the request-level record for administrator standing applications submitted by existing platform users for governance elevation, and it stores the applicant type classification, the applicant-provided reason, and the current review outcome fields. At creation time, the request begins as a newly submitted review subject rather than an administrator identity, which reflects the domain rule that an AdministratorRequest is distinct from an AdministratorAccount.
   *
   * The operation is available only to an authenticated platform member who is acting as a customer or seller applicant. The applicant must already have an active account context, and the server must derive applicant ownership from that authenticated identity instead of trusting client-supplied ownership fields. This is important because the database schema normalizes concrete ownership into exactly one dedicated subtype table: shopping_mall_administrator_request_of_customers for customer-originated applications or shopping_mall_administrator_request_of_sellers for seller-originated applications. A successful submission therefore creates the main request record and links it to the correct applicant subtype record.
   *
   * From a business perspective, this endpoint starts the oversight workflow later handled by administrators and super administrators. The created request enters the review queue with a pending status, while review_note, rejection_reason, reviewed_at, approved_at, rejected_at, and reviewed_by_administrator_id remain unset until a governance review operation occurs. This preserves the clear business boundary described in the requirements: requesting authority is not the same as holding authority, and approval is what may later result in administrator standing.
   *
   * Clients should use this operation when a logged-in customer or seller wants to formally request administrator standing and provide the reason for that request. After creation, separate review operations are responsible for approval or rejection. Consumers should not expect this endpoint to grant administrator authority immediately, assign administrator grade, or perform any review decision. Its purpose is only to record the application and place it into the governed review lifecycle.
   *
   * @param connection
   * @param body Administrator request creation data
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor customer
     * @x-autobe-specification Validate that the caller is authenticated as
     *   either a customer or a seller member actor. Reject requests from
     *   unauthenticated callers and reject callers whose session does not
     *   correspond to a supported applicant actor type.
   *
   * Parse the request body as IShoppingMallAdministratorRequest.ICreate. Use only client-supplied creation fields that are appropriate for initial submission, primarily the application reason. Do not accept or persist server-controlled review fields from the client. The server must determine applicant_type from the authenticated session context, not from an arbitrary foreign key supplied by the caller.
   *
   * Within a single transaction, insert a new row into shopping_mall_administrator_requests with a new UUID, applicant_type set to either customer or seller based on the authenticated actor, status set to pending, reason set from the validated request body, review_note null, rejection_reason null, reviewed_by_administrator_id null, reviewed_at null, approved_at null, rejected_at null, and current timestamps for created_at and updated_at. Then insert exactly one dependent subtype row into the matching applicant table: shopping_mall_administrator_request_of_customers for customer applicants or shopping_mall_administrator_request_of_sellers for seller applicants. Set its foreign key to the new administrator request ID, set the applicant account foreign key from the authenticated session identity, and initialize created_at and updated_at timestamps.
   *
   * If either insert fails, roll back the transaction so that no orphaned request or applicant subtype row remains. Return the created administrator request resource. The returned resource should reflect the newly created pending workflow state and its applicant linkage as represented by the DTO layer.
   *
   * Implementation should ignore soft-deleted applicant subtype rows when enforcing any duplicate-submission policy, only if such a policy is defined elsewhere in the service layer. If no such explicit rule exists, creation may proceed normally. Error handling should distinguish authentication failure, unsupported actor type, invalid request body, and transaction failure. This operation must not create an AdministratorAccount, assign administrator grade, or write any governance decision fields because those belong to later review workflows.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedBody()
    body: IShoppingMallAdministratorRequest.ICreate,
  ): Promise<IShoppingMallAdministratorRequest> {
    try {
      return await postShoppingMallCustomerAdministratorRequests({
        customer,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a filtered and paginated list of administrator standing applications submitted by existing platform users.
   *
   * This operation provides governance-focused browsing over the administrator request workflow stored in the shopping_mall_administrator_requests table. Each record represents a single application for administrator standing, including the applicant type classification, current workflow status, applicant-provided reason, optional review note, optional rejection reason, and review decision timestamps such as reviewed_at, approved_at, and rejected_at. The endpoint is designed for queue-style oversight so authorized governance users can find pending requests efficiently and review the context needed before performing separate approval or rejection actions.
   *
   * The operation is especially important for super administrator oversight because administrator-role entry is part of the platform's chain of authority. The loaded requirements state that a super administrator can view pending requests submitted by users who want to become administrators, inspect the request reason, and decide the outcome. For that reason, this endpoint should be treated as a governance interface rather than a public browsing feature. The results may include applicant context resolved from the normalized subtype structures shopping_mall_administrator_request_of_customers and shopping_mall_administrator_request_of_sellers, while preserving the request table as the authoritative source of workflow state.
   *
   * From a data perspective, the response is centered on the administrator request record and its review lifecycle. Applicant ownership is normalized rather than embedded directly in the main request row, so implementations should resolve whether the applicant is a customer or seller by traversing the appropriate subtype relation. Reviewer identity, when present, is linked through shopping_mall_administrators. This structure ensures the endpoint reflects the database design accurately: the request retains reason and decision state, while applicant ownership remains separated into dedicated dependent tables.
   *
   * This operation should support list browsing expectations such as filtering, sorting, and pagination so governance users can manage growing request volumes. Typical usage includes narrowing by status, especially pending, filtering by applicant_type, searching by textual reason or review note, and ordering by creation or review timing. The endpoint does not itself approve or reject a request; instead, it provides the discovery and review surface that precedes dedicated decision operations. If a caller is not authorized for governance oversight, the system must deny access rather than exposing administrator-role application data.
   *
   * @param connection
   * @param body Administrator request search criteria and pagination
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor customer
     * @x-autobe-specification Implement this operation as a paginated search
     *   over shopping_mall_administrator_requests.
   *
   * Accept a JSON request body of type IShoppingMallAdministratorRequest.IRequest containing pagination, sorting, and filter criteria. At minimum, support filters that map directly to verified schema fields: status, applicantType, createdAt range, reviewedAt range, approvedAt range, rejectedAt range, and free-text search on reason, reviewNote, and rejectionReason. Because the schema defines trigram GIN indexes for reason, review_note, and rejection_reason, text search may be implemented efficiently with partial matching behavior appropriate to the persistence layer. Support sorting by created_at and, where useful, by reviewed_at or status.
   *
   * Base the primary query on shopping_mall_administrator_requests and exclude logically removed rows by default using deleted_at IS NULL unless an explicit privileged audit mode is defined elsewhere. Join shopping_mall_administrator_request_of_customers when applicant_type indicates customer and join shopping_mall_administrator_request_of_sellers when applicant_type indicates seller. When applicant display context is included in the summary DTO, resolve the linked customer or seller row from shopping_mall_customers or shopping_mall_sellers using the foreign keys in the subtype tables. If reviewer summary information is part of the DTO, left join shopping_mall_administrators through reviewed_by_administrator_id.
   *
   * Enforce authorization before executing the query. This endpoint is for governance oversight, with super administrators as the primary authorized actor based on the loaded requirements for administrator request oversight. If broader administrator access is permitted by application policy, it must still remain limited to authorized governance accounts only. Reject unauthenticated, customer, and seller callers.
   *
   * Return IPageIShoppingMallAdministratorRequest.ISummary with pagination metadata and summary rows. Each summary row should expose request identity, applicant type, current status, applicant reason, review outcome fields relevant to list display, and concise applicant or reviewer context if defined by the DTO. Do not mutate any request state in this operation. Handle nonexistent related subtype data defensively as a consistency error for internal monitoring, because a request is expected to correspond to one concrete applicant subtype. Apply stable sorting so pagination remains deterministic across repeated queries.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedBody()
    body: IShoppingMallAdministratorRequest.IRequest,
  ): Promise<IPageIShoppingMallAdministratorRequest.ISummary> {
    try {
      return await patchShoppingMallCustomerAdministratorRequests({
        customer,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve the detailed record of a single administrator role application.
   *
   * This operation returns the full AdministratorRequest resource identified by the supplied `administratorRequestId`. In the business domain, an administrator request is a formal application submitted by an existing platform user who wants to take on administrative responsibility. The request is distinct from the resulting AdministratorAccount itself: the request represents the application and review stage, while the administrator account represents the granted governance identity after approval. The returned resource is therefore the reviewable application record, not the administrator authority record.
   *
   * The response is intended for platform-governance use by a super administrator. The loaded requirements state that the super administrator is the highest administrative authority and has explicit oversight of pending administrator requests, including authority to review the applicant's reason and decide the outcome. For that reason, this endpoint should be authorized only for super-administrator sessions. It must not expose administrator-request details to customers, sellers, or ordinary administrators who do not control entry into the administrative chain of authority.
   *
   * The returned data should reflect the core business meaning of the administrator request as described in the requirements: it contains the applicant's submitted reason text explaining why the user seeks administrator status, and it carries the review decision as the outcome of super-administrator evaluation. Because AdministratorRequest is modeled separately from customer participation, seller participation, and AdministratorAccount itself, the response should preserve that separation clearly. The operation may also surface subtype-specific applicant context when the underlying request originates from a customer or seller applicant record, but the main resource remains the unified administrator request.
   *
   * This endpoint is commonly used before executing related governance actions that approve or reject an administrator applicant. Consumers typically retrieve the request details first in order to inspect the applicant's justification and current review state before performing a separate decision-making operation. If the target request does not exist, or if the caller is not authenticated as a super administrator, the operation must reject access and return an appropriate error without disclosing protected governance data.
   *
   * @param connection
   * @param administratorRequestId Identifier of the target administrator request
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor customer
     * @x-autobe-specification Load the administrator request by its primary
     *   identifier from the shopping_mall_administrator_requests table and
     *   return the fully mapped IShoppingMallAdministratorRequest DTO.
   *
   * Validate that the caller is authenticated with a super-administrator session before any resource data is disclosed. Ordinary administrators, sellers, customers, and unauthenticated callers must be denied. Authorization should be checked early to preserve governance data confidentiality.
   *
   * Query the base administrator request record using administratorRequestId. If the schema and repository structure support applicant subtype joins, additionally load the related customer-applicant or seller-applicant subtype record from shopping_mall_administrator_request_of_customers or shopping_mall_administrator_request_of_sellers so the response can include the origin context of the request. Keep the AdministratorRequest and AdministratorAccount concepts separate: do not infer that an approved request is itself an administrator account record.
   *
   * Map the persisted fields that represent the applicant's reason, review decision, review status, reviewer linkage, and created or updated timestamps according to the actual DTO schema. If no matching request exists, raise a not-found error. If the request exists but the caller lacks super-administrator authority, raise a forbidden error. This operation is read-only and must not mutate request state, create grade changes, or trigger promotion workflows.
   *
   * Implementation should avoid unnecessary writes or side effects. Use a single transaction only if required by the ORM for consistent relational loading; otherwise, a read query with eager loading of relevant applicant relations is sufficient.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":administratorRequestId")
  public async at(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedParam("administratorRequestId")
    administratorRequestId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallAdministratorRequest> {
    try {
      return await getShoppingMallCustomerAdministratorRequestsAdministratorRequestId(
        {
          customer,
          administratorRequestId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
