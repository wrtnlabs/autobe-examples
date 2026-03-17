import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IPageIShoppingMallSellerApprovalRequest } from "../../../../structures/IPageIShoppingMallSellerApprovalRequest";
import { IShoppingMallSellerApprovalRequest } from "../../../../structures/IShoppingMallSellerApprovalRequest";

/**
 * Create a new seller approval request for the authenticated seller account.
 *
 * This operation opens a new governance review case in the seller approval workflow described by the SellerApprovalRequest concept. A seller approval request is the administrator-reviewed submission that determines whether a registered seller account may gain marketplace selling eligibility. It is distinct from the seller account itself: the seller account represents the registered identity, while the seller approval request represents the specific approval case being examined for permission to sell. When this endpoint succeeds, the platform creates a new request record associated with the authenticated seller and initializes that review case in the pending state.
 *
 * This endpoint is intended for the seller actor only. It is used when a seller completes registration for selling access, and it may also be used later after a rejection to begin a new review cycle. The seller must not gain active selling authority merely by calling this endpoint. The workflow requirements state that newly created requests are presented as awaiting administrative review rather than granting immediate selling rights, and that a rejected seller may submit a new seller approval request for another review cycle. The system therefore uses this API to capture the submission while preserving the separation between account existence and approval to sell.
 *
 * At the data level, this operation creates a new record in the seller approval request domain represented by the shopping_mall_seller_approval_requests entity and links it to the submitting seller account. The resulting record functions as the current reviewable application context for administrative oversight. Its decision outcome begins as pending, and later review operations may move it to approved or rejected and optionally attach a rejection reason that explains why selling eligibility was not granted. That rejection explanation belongs to the review case, not to the seller's public profile.
 *
 * This operation is commonly followed by administrative list and detail review operations for pending seller approval requests. Sellers may also use later detail retrieval operations to track whether the request is still pending or has been decided. Error handling should reject attempts from unauthenticated users, non-seller actors, or sellers who are not currently eligible to start a new review cycle under the governing business rules. The response returns the created seller approval request so the client can immediately display the newly opened case and its initial pending review state.
 *
 * @param props.connection
 * @param props.body Seller approval request submission data
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification Authenticate the caller and require the seller actor. Resolve the submitting seller account from the authenticated session context instead of accepting seller identity from the client payload.
 *
 * Validate whether the seller is allowed to open a new seller approval review cycle under the business rules. Creation is valid for initial selling-access registration and for re-registration after a prior rejected outcome. If the current seller state or most recent approval workflow state makes a new submission invalid, reject the request with an appropriate business error.
 *
 * Create a new shopping_mall_seller_approval_requests record in a transaction. Set its association to the authenticated seller account, initialize the decision state to pending, and persist any seller-supplied submission fields defined by the create DTO. Do not allow the client to set administrator review outcome fields such as approved or rejected status directly during creation. Do not allow the client to write administrator-generated rejection information at this stage.
 *
 * Preserve historical review cycles by inserting a new request record rather than overwriting prior rejected requests. After persistence, return the newly created seller approval request resource. The response should include enough information for the seller to track the current review case and confirm that selling authority has not yet been granted.
 *
 * Implementation should enforce authorization failures for non-seller actors, reject unauthenticated access, and surface business-rule violations for invalid resubmission timing or duplicate active review attempts if such conditions are defined by the domain service. Logging should record creation of the new seller approval review case for governance traceability.
 * @path /shoppingMall/seller/seller-approval-requests
 * @accessor api.functional.shoppingMall.seller.seller_approval_requests.create
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
          path: create.path(),
          status: null,
        },
        props.body,
      );
}
export namespace create {
  export type Props = {
    /**
     * Seller approval request submission data
     */
    body: IShoppingMallSellerApprovalRequest.ICreate;
  };
  export type Body = IShoppingMallSellerApprovalRequest.ICreate;
  export type Response = IShoppingMallSellerApprovalRequest;

  export const METADATA = {
    method: "POST",
    path: "/shoppingMall/seller/seller-approval-requests",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/seller/seller-approval-requests";
  export const random = (): IShoppingMallSellerApprovalRequest =>
    typia.random<IShoppingMallSellerApprovalRequest>();
  export const simulate = (
    connection: IConnection,
    props: create.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: create.path(),
      contentType: "application/json",
    });
    try {
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
 * Retrieve a filtered and paginated list of seller approval request cases for marketplace governance review.
 *
 * This operation exposes the review queue and historical approval cases stored in the shopping_mall_seller_approval_requests table, which is defined as the record of each seller account approval application submitted for marketplace selling eligibility. Each returned item represents a distinct governance case rather than the seller account itself. In line with the business requirements, newly submitted requests begin in the pending state, remain available for administrative review, and may later move to approved or rejected with the review outcome preserved for later inspection. The list is intended to help governance actors monitor requests awaiting action as well as review already-decided cases over time.
 *
 * Access to this operation is intended for administrator-grade actors responsible for marketplace oversight. The functional requirements explicitly state that administrators shall be able to view the list of seller approval requests awaiting review. Super administrators may also use the operation because they hold platform-wide governance authority beyond ordinary administrator permissions. The operation is not a seller-facing global list endpoint; a seller's ability to observe the outcome of their own request is a narrower self-status concern and should be handled through self-scoped operations rather than exposure of the full administrative review collection.
 *
 * The response is grounded in the approval request schema and its relationships. Each record belongs to a seller account through shopping_mall_seller_id and may later reference a reviewing administrator through shopping_mall_administrator_id once the request is no longer pending. The request also carries the workflow status, the optional seller-provided reason explaining the submission context, and timestamps such as created_at, updated_at, and reviewed_at. Because the table is indexed by status and creation time, and also provides trigram search support on the reason field, this endpoint is suitable for operational list browsing with filtering by review state and text-based review-queue inspection.
 *
 * Clients should use this operation before opening an individual seller approval request detail endpoint for case-by-case review. A typical administrative workflow is to first query this collection for pending requests, narrow the list by status, creation period, or assigned reviewer, and then navigate to a specific request to inspect its full review context or record an approval decision through a dedicated decision endpoint. This separation keeps collection browsing efficient while reserving state-changing approval and rejection behavior for single-resource operations.
 *
 * The operation returns only active list data for browsing and review management. Implementations should exclude records hidden from active workflows when appropriate, especially entries marked by deleted_at, and should apply stable pagination and deterministic sorting so administrators can work through queues without missing or duplicating cases between pages. Invalid filters, unauthorized access, or references to nonexistent related actors should be handled as standard validation or authorization failures by the service layer.
 *
 * @param props.connection
 * @param props.body Search filters and pagination options for seller approval requests
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification Implement a seller approval request search service over shopping_mall_seller_approval_requests.
 *
 * Accept an IShoppingMallSellerApprovalRequest.IRequest body containing pagination, sorting, and optional filter fields relevant to the loaded schema. Support filtering by status, shoppingMallSellerApprovalRequest id, seller id (shopping_mall_seller_id), reviewer id (shopping_mall_administrator_id), created_at range, reviewed_at range, and text search against reason. Do not assume fields that are not present in the schema. If the common request DTO framework supports generic search, map only valid searchable columns from this table and permitted joined identifiers.
 *
 * Build the main query from shopping_mall_seller_approval_requests and exclude logically hidden rows where deleted_at is not null unless the shared list request contract explicitly provides an administrative inclusion flag. Join shopping_mall_sellers when seller-level summary data is needed for DTO projection, and left join shopping_mall_administrators when reviewer summary data is needed because shopping_mall_administrator_id is nullable for pending requests. Preserve pending rows with no reviewer by using left-join semantics.
 *
 * Default sorting should prioritize operational review usefulness, such as pending requests first and then newest created_at descending, if the shared query framework allows business defaults; otherwise use created_at descending as the stable default. Allow explicit sorting only on safe indexed or operationally meaningful fields such as created_at, reviewed_at, and status. Apply deterministic secondary ordering by id to keep pagination stable.
 *
 * Enforce authorization so only administrator and superAdministrator actors may execute the global list query. Reject customer and seller actors. The service does not mutate workflow state and must not update seller approval status, seller account records, or review timestamps.
 *
 * Validate filter values against the seller approval workflow semantics from the requirements: accepted status values must correspond to the domain states used by the request record, namely pending, approved, and rejected. If the request provides an impossible date range or malformed identifiers, return validation failure. If joined actor references are requested but do not exist, treat them as nonmatching filters rather than causing unintended data leakage.
 *
 * Return a paginated IPageIShoppingMallSellerApprovalRequest.ISummary result containing list-oriented approval request information suitable for administrative queue browsing. Keep summary projection focused on request case fields and lightweight related identity references needed for list display. Detailed inspection and decision recording belong to separate single-resource operations.
 * @path /shoppingMall/seller/seller-approval-requests
 * @accessor api.functional.shoppingMall.seller.seller_approval_requests.index
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
          path: index.path(),
          status: null,
        },
        props.body,
      );
}
export namespace index {
  export type Props = {
    /**
     * Search filters and pagination options for seller approval requests
     */
    body: IShoppingMallSellerApprovalRequest.IRequest;
  };
  export type Body = IShoppingMallSellerApprovalRequest.IRequest;
  export type Response = IPageIShoppingMallSellerApprovalRequest.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/seller/seller-approval-requests",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/seller/seller-approval-requests";
  export const random = (): IPageIShoppingMallSellerApprovalRequest.ISummary =>
    typia.random<IPageIShoppingMallSellerApprovalRequest.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: index.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: index.path(),
      contentType: "application/json",
    });
    try {
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
 * Retrieve the current details of a single seller approval request.
 *
 * This operation returns the governance record that represents a seller approval case for marketplace selling eligibility. In the domain model, a seller approval request is separate from the seller account itself: the seller account identifies the registered seller, while the approval request captures the specific submission being examined for permission to sell. The returned resource therefore documents the current review case, including its decision outcome such as pending, approved, or rejected, and any rejection information that belongs to the review result rather than to the seller’s public shop identity.
 *
 * This endpoint supports two requirement-driven workflows. First, administrators use it when they open an individual pending seller approval request and review its current state before making a decision. Second, the submitting seller uses it to track whether the request is still awaiting review or has already been decided. When the request has been rejected, the response is expected to expose the rejection reason so the seller can understand why selling authority was not granted and, if permitted by the broader workflow, prepare a later re-submission as a separate review cycle.
 *
 * Access to this resource is restricted because seller approval requests are governance records, not public storefront data. Administrators may retrieve any request that they are authorized to oversee as part of seller approval review. Sellers may retrieve only their own seller approval request records for status tracking. Other marketplace users must not be allowed to inspect another seller’s approval case, because the request contains internal review context and outcome information tied to selling eligibility.
 *
 * At the persistence layer, this operation reads from the primary seller approval request entity represented by the shopping_mall_seller_approval_requests table, which stores seller account approval applications submitted for marketplace selling eligibility. The operation should resolve the requested record by its identifier, verify that the caller is either an authorized administrator or the owning seller, and then return the current approval case as a detailed resource. This endpoint is commonly used together with the list operation that presents pending seller approval requests to administrators; an administrator may first browse the review queue and then call this detail endpoint to inspect one specific case before executing a separate review-decision API.
 *
 * If the identifier does not match any existing seller approval request, the operation should fail with a not-found error. If the caller is authenticated but does not have permission to inspect the targeted request, the operation should fail with a forbidden error. The endpoint is read-only and does not change the review state, seller authority, or any related marketplace records.
 *
 * @param props.connection
 * @param props.sellerApprovalRequestId Target seller approval request identifier
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification Implement a read-only detail query for the seller approval request aggregate rooted at shopping_mall_seller_approval_requests.
 *
 * 1. Resolve the record by sellerApprovalRequestId.
 * 2. If no record exists, return a not-found error.
 * 3. Determine the authenticated actor.
 * 4. If the actor is an administrator or super administrator, allow access according to administrative governance permissions.
 * 5. If the actor is a seller, verify that the request belongs to that seller account before returning the record. If ownership does not match, return a forbidden error.
 * 6. Reject access for customers and any other unauthorized actors.
 *
 * The returned DTO should represent the current approval case, including the present review outcome and rejection reason when the outcome is rejected. The implementation should treat this entity as distinct from seller profile data and should not expose unrelated internal records beyond what belongs in the seller approval request detail representation.
 *
 * No state transition occurs in this operation. Do not update request status, seller approval standing, or audit fields during retrieval. Keep the operation side-effect free.
 *
 * This endpoint is intended to support administrator review and seller status tracking. It may be used after an administrator obtains a queue of pending requests from a separate list endpoint, or by a seller checking the current outcome of their submission. Error handling must clearly distinguish not-found from forbidden cases so callers can react appropriately.
 * @path /shoppingMall/seller/seller-approval-requests/:sellerApprovalRequestId
 * @accessor api.functional.shoppingMall.seller.seller_approval_requests.at
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
     * Target seller approval request identifier
     */
    sellerApprovalRequestId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallSellerApprovalRequest;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/seller/seller-approval-requests/:sellerApprovalRequestId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/seller/seller-approval-requests/${encodeURIComponent(props.sellerApprovalRequestId ?? "null")}`;
  export const random = (): IShoppingMallSellerApprovalRequest =>
    typia.random<IShoppingMallSellerApprovalRequest>();
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
      assert.param("sellerApprovalRequestId")(() =>
        typia.assert(props.sellerApprovalRequestId),
      );
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
