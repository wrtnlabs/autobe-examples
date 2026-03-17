import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIShoppingMallCancellationRequest } from "../../../../api/structures/IPageIShoppingMallCancellationRequest";
import { IShoppingMallCancellationRequest } from "../../../../api/structures/IShoppingMallCancellationRequest";
import { SuperadminAuth } from "../../../../decorators/SuperadminAuth";
import { SuperadminPayload } from "../../../../decorators/payload/SuperadminPayload";
import { getShoppingMallSuperAdminAdminRequestsRequestId } from "../../../../providers/getShoppingMallSuperAdminAdminRequestsRequestId";
import { patchShoppingMallSuperAdminAdminRequests } from "../../../../providers/patchShoppingMallSuperAdminAdminRequests";
import { putShoppingMallSuperAdminAdminRequestsRequestId } from "../../../../providers/putShoppingMallSuperAdminAdminRequestsRequestId";

@Controller("/shoppingMall/superAdmin/adminRequests")
export class ShoppingmallSuperadminAdminrequestsController {
  /**
   * Retrieve a filtered and paginated list of administrator promotion requests submitted by customers and sellers.
   *
   * This operation provides super administrators with a comprehensive view of all AdminRequest records on the platform. An AdminRequest is a formal application submitted by any registered platform user — whether a customer or a seller — who wishes to join the administrator team. Each request carries the applicant's identity, their written reason for wanting to become an administrator, the current status of the request (pending, approved, or rejected), and the exact submission timestamp.
   *
   * Access to this endpoint is restricted exclusively to super administrators. Regular administrators do not have authority to view or act on AdminRequests, as this restriction is enforced at the business rule level: only super administrators are authorized to approve or reject admin promotion applications.
   *
   * The operation supports advanced filtering to help super administrators manage the review queue effectively. Filters include: status (narrow to pending applications awaiting review, approved applications, or rejected applications), applicant type (filter to requests from customers only, or sellers only), and submission date range (view requests submitted within a specific time window). Pagination and sorting capabilities allow super administrators to process large volumes of requests systematically.
   *
   * The response returns a paginated list of AdminRequest summaries, each containing the applicant's identity information (type and display name), the submitted reason text, the current status, and the submission timestamp. Super administrators can use the returned identifiers to navigate to individual request detail views and subsequently approve or reject pending requests.
   *
   * Related operations: Once a pending request is identified through this listing, the super administrator can act on it via the dedicated approve or reject endpoints. The AdminRequest record is immutable after submission — no modification to the reason text or other fields is permitted, and requests cannot be withdrawn. All submitted requests are permanently preserved regardless of their status.
   *
   * @param connection
   * @param body Search criteria and pagination parameters for filtering the list of admin promotion requests
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor superAdmin
   * @x-autobe-specification 1. Authentication and authorization:
   *    - Verify the caller is an authenticated super administrator (check shopping_mall_super_admin_sessions).
   *    - If not a super admin, return 403 Forbidden.
   *
   * 2. Query construction:
   *    - Primary table: infer AdminRequest data from the admin promotion records. Join shopping_mall_admins with shopping_mall_admin_of_customers and shopping_mall_admin_of_sellers to determine the origin and type of each admin promotion request.
   *    - Apply status filter if provided: filter by the request status field (pending/approved/rejected).
   *    - Apply applicant type filter if provided: filter by whether the applicant is a customer or seller.
   *    - Apply date range filters if provided: filter submission timestamps using the from/to datetime parameters.
   *    - Apply keyword search on reason text if provided (use trigram index or LIKE for partial matching).
   *
   * 3. Pagination:
   *    - Apply cursor-based or offset-based pagination based on the IRequest pagination parameters.
   *    - Default sort: submission timestamp descending (most recent first).
   *    - Support sorting by status, applicant type, and submission date.
   *
   * 4. Response construction:
   *    - Return a paginated result set (IPageIShoppingMallAdminRequest.ISummary) with:
   *      - pagination metadata (total count, current page, page size)
   *      - data array of AdminRequest summaries, each with: id, applicant info (type + name/email), reason text, status, created_at.
   *
   * 5. Edge cases:
   *    - Empty result set is valid; return pagination object with empty data array.
   *    - If no filter is provided, return all admin requests with default sorting.
   *    - Ensure deleted admin accounts are still included in historical records if their request was already processed.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @SuperadminAuth()
    superAdmin: SuperadminPayload,
    @TypedBody()
    body: IShoppingMallCancellationRequest.IRequest,
  ): Promise<IPageIShoppingMallCancellationRequest.ISummary> {
    try {
      return await patchShoppingMallSuperAdminAdminRequests({
        superAdmin,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve the detailed information of a specific admin request by its unique identifier.
   *
   * An AdminRequest is a formal application submitted by any registered platform user — either a customer or a seller — who wishes to join the administrator team. Each request carries the applicant identity, the reason text explaining why they want to become an administrator, the current status (pending, approved, or rejected), the submission timestamp, and, once reviewed, the reviewing super administrator's identity and the decision timestamp.
   *
   * Access to this endpoint is role-sensitive. Super administrators may retrieve any admin request regardless of its current status. Customers and sellers may only retrieve their own submitted admin request; attempts to access another user's request will be denied. Regular administrators have no access to this workflow at all and will receive an authorization error when calling this endpoint.
   *
   * The AdminRequest status progresses from 'pending' (immediately upon submission) to either 'approved' or 'rejected' once a super administrator acts on the request. Approved requests result in the applicant being granted regular administrator status; rejected requests leave the applicant's existing role unchanged. Once a decision has been made the request record is immutable — only the status field transitions during the review lifecycle, providing a permanent and transparent audit trail of every administrator appointment on the platform.
   *
   * This endpoint depends on a prior submission operation: `POST /adminRequests` must have been called to create the request before this endpoint can return meaningful data. Super administrators can also use `PATCH /adminRequests` to list all pending admin requests before drilling into a specific one via this endpoint.
   *
   * @param connection
   * @param requestId The unique UUID identifier of the target admin request.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor superAdmin
   * @x-autobe-specification 1. Extract the `requestId` path parameter as a UUID string.
   * 2. Authenticate the calling actor and determine their role:
   *    - If the actor is a super administrator (shopping_mall_super_admins): allow access to any admin request.
   *    - If the actor is a customer or seller: allow access ONLY if the admin request's requester foreign key matches the calling user's own id. Otherwise return HTTP 403.
   *    - If the actor is a regular administrator (shopping_mall_admins): return HTTP 403 unconditionally, as regular admins have no access to this workflow.
   *    - If the actor is unauthenticated (guest): return HTTP 401.
   * 3. Query the admin requests table using `requestId` as the primary key.
   * 4. If no record is found, return HTTP 404.
   * 5. Join with the requester identity (customer or seller via actor_type discriminator) to include requester details in the response.
   * 6. Join with the reviewer (shopping_mall_super_admins) if a review has been recorded (reviewer_id is non-null) to include reviewer details.
   * 7. Compose and return the full `IShoppingMallAdminRequest` DTO including: id, requester info, reason_text, status, submitted_at, reviewer info (nullable), reviewed_at (nullable).
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":requestId")
  public async at(
    @SuperadminAuth()
    superAdmin: SuperadminPayload,
    @TypedParam("requestId")
    requestId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallCancellationRequest> {
    try {
      return await getShoppingMallSuperAdminAdminRequestsRequestId({
        superAdmin,
        requestId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Review a pending administrator promotion request and record an approval or rejection decision.
   *
   * This endpoint is exclusively accessible to super administrators. Regular administrators are not permitted to review administrator promotion requests — any such attempt will be denied by the system with an access-denied response.
   *
   * An AdminRequest is a formal application submitted by any registered platform user (either a customer or seller) who wishes to be promoted to the administrator role. Upon submission, the request enters the 'pending' state and awaits a super administrator's decision. This endpoint enables a super administrator to take action on a pending request, transitioning its status to either 'approved' or 'rejected'.
   *
   * When the decision is 'approved', the applicant's platform role is elevated to regular administrator. They gain access to all administrator governance functions including category management, seller oversight, and order management. When the decision is 'rejected', the applicant's existing role and permissions remain unchanged, and the request is permanently closed.
   *
   * The review decision is final for each submitted AdminRequest. Once a request has been approved or rejected, its status cannot be reverted. The AdminRequest record itself is immutable with respect to user-submitted content — the reason text provided by the applicant cannot be altered by any party.
   *
   * This operation corresponds to the `shopping_mall_admins` and `shopping_mall_super_admins` database entities. The super admin's decision is recorded by updating the AdminRequest's status field and creating the associated snapshot record in the platform's audit trail. Timestamps are updated to reflect the moment of the decision.
   *
   * Related operations: Use `PATCH /adminRequests` to retrieve a paginated list of all admin requests filterable by status, applicant type, or date range. Use `GET /adminRequests/{requestId}` to retrieve the full details of a specific AdminRequest including its current status and reason text.
   *
   * @param connection
   * @param requestId The unique identifier (UUID) of the AdminRequest to be reviewed.
   * @param body The super administrator's review decision for the AdminRequest, specifying whether the request is approved or rejected.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor superAdmin
   * @x-autobe-specification 1. Authenticate the caller and verify they hold a valid super administrator session (shopping_mall_super_admins). If the caller is a regular admin (shopping_mall_admins), return 403 Forbidden.
   * 2. Look up the AdminRequest record by `requestId` (UUID). Return 404 Not Found if no record exists with that ID.
   * 3. Verify that the AdminRequest's current status is 'pending'. If the request is already 'approved' or 'rejected', return 422 Unprocessable Entity with an appropriate error message indicating the request has already been reviewed.
   * 4. Validate the request body: the `status` field must be either 'approved' or 'rejected'. Reject any other value with 400 Bad Request.
   * 5. Begin a database transaction:
   *    a. Update the AdminRequest's `status` field to the provided value ('approved' or 'rejected').
   *    b. Update the AdminRequest's `updated_at` timestamp to the current UTC time.
   *    c. If the new status is 'approved':
   *       - Retrieve the applicant's account details (customer or seller) from their respective table.
   *       - Create a new record in `shopping_mall_admins` with `actor_type` set to 'customer' or 'seller' as appropriate, inheriting the applicant's email address, assigning a temporary or system-generated password hash (or trigger a password-set flow), and setting `created_at` and `updated_at` to now.
   *       - Create the corresponding subtype linkage record in `shopping_mall_admin_of_customers` or `shopping_mall_admin_of_sellers`.
   * 6. Commit the transaction.
   * 7. Return the updated AdminRequest record with all fields reflecting the new state.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":requestId")
  public async review(
    @SuperadminAuth()
    superAdmin: SuperadminPayload,
    @TypedParam("requestId")
    requestId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallCancellationRequest.IReview,
  ): Promise<IShoppingMallCancellationRequest> {
    try {
      return await putShoppingMallSuperAdminAdminRequestsRequestId({
        superAdmin,
        requestId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
