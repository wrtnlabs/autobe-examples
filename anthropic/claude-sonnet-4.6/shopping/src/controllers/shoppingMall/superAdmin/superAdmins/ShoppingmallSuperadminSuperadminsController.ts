import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIShoppingMallSuperAdmin } from "../../../../api/structures/IPageIShoppingMallSuperAdmin";
import { IShoppingMallAdmin } from "../../../../api/structures/IShoppingMallAdmin";
import { IShoppingMallSuperAdmin } from "../../../../api/structures/IShoppingMallSuperAdmin";
import { SuperadminAuth } from "../../../../decorators/SuperadminAuth";
import { SuperadminPayload } from "../../../../decorators/payload/SuperadminPayload";
import { getShoppingMallSuperAdminSuperAdminsSuperAdminId } from "../../../../providers/getShoppingMallSuperAdminSuperAdminsSuperAdminId";
import { patchShoppingMallSuperAdminSuperAdmins } from "../../../../providers/patchShoppingMallSuperAdminSuperAdmins";
import { postShoppingMallSuperAdminSuperAdminsSuperAdminIdDemote } from "../../../../providers/postShoppingMallSuperAdminSuperAdminsSuperAdminIdDemote";

@Controller("/shoppingMall/superAdmin/superAdmins")
export class ShoppingmallSuperadminSuperadminsController {
  /**
   * Retrieve a filtered and paginated list of super administrator accounts on the shopping mall platform.
   *
   * This operation allows super administrators to search and browse all super administrator accounts registered on the platform. Super administrators represent the highest privilege tier, holding all regular administrator capabilities plus exclusive authority to approve or reject admin promotion requests, promote regular administrators to super administrator grade, and demote other super administrators to regular administrator grade.
   *
   * The underlying data is stored in the `shopping_mall_super_admins` table, which records each super admin's unique email, hashed authentication credentials, creation timestamp, last-update timestamp, and an optional soft-deletion timestamp. When the `deleted_at` field is non-null, the account is considered deactivated. This endpoint can optionally filter results to include or exclude deactivated accounts based on the provided search criteria.
   *
   * Search and filtering capabilities include: partial email address matching, filtering by account active/inactive status (based on the presence or absence of the `deleted_at` value), and filtering by creation date range. Results are returned in a paginated format with configurable page size and sort order (e.g., by `created_at` descending).
   *
   * Access to this endpoint is strictly restricted to super administrators only. Regular administrators cannot enumerate or view the super administrator roster. Any attempt by a non-super-admin actor to invoke this endpoint will be denied with an access-denied response. This restriction aligns with the platform's administrator hierarchy rules, where super admin identity and management is a privileged concern.
   *
   * Sensitive fields such as `password_hash` are never exposed in the response. The response summary type includes only the identity, email, and temporal metadata of each super admin account.
   *
   * @param connection
   * @param body Search criteria and pagination parameters for filtering super administrator accounts
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor superAdmin
     * @x-autobe-specification 1. Authenticate the requesting actor and verify
     *   they hold the super administrator role. Reject with 403 Forbidden if
     *   not a super admin.
   *
   * 2. Accept an IShoppingMallSuperAdmin.IRequest body containing:
   *    - `email`: optional string for partial/fuzzy email matching (case-insensitive ILIKE)
   *    - `isActive`: optional boolean — when true, filter to records where deleted_at IS NULL; when false, filter to records where deleted_at IS NOT NULL; when omitted, return all
   *    - `createdAtFrom`: optional ISO datetime string for lower bound on created_at
   *    - `createdAtTo`: optional ISO datetime string for upper bound on created_at
   *    - `page`: page number (1-based, default 1)
   *    - `limit`: page size (default 20, max 100)
   *    - `sort`: sort field (e.g., 'created_at', 'email'), default 'created_at'
   *    - `order`: sort direction ('asc' | 'desc'), default 'desc'
   *
   * 3. Query the `shopping_mall_super_admins` table applying all provided filters. Never return `password_hash` in the result.
   *
   * 4. Apply ORDER BY on the specified sort field and direction. Apply LIMIT and OFFSET based on page/limit for cursor-style pagination.
   *
   * 5. Return total count and paginated data as IPageIShoppingMallSuperAdmin.ISummary, where each summary includes: id, email, created_at, updated_at, deleted_at (nullable).
   *
   * 6. Edge cases:
   *    - If no records match the filters, return an empty data array with total = 0.
   *    - If `limit` exceeds the allowed maximum (100), clamp it or return a 400 error.
   *    - Ensure the query uses the `@@index([created_at])` index for efficiency when sorting by created_at.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @SuperadminAuth()
    superAdmin: SuperadminPayload,
    @TypedBody()
    body: IShoppingMallSuperAdmin.IRequest,
  ): Promise<IPageIShoppingMallSuperAdmin.ISummary> {
    try {
      return await patchShoppingMallSuperAdminSuperAdmins({
        superAdmin,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve detailed information about a specific super administrator account.
   *
   * This operation returns the full profile of a single super administrator identified by their unique UUID. Super administrators are the highest-privilege actors on the shopping mall platform, holding all regular administrator capabilities plus exclusive authority to review administrator promotion requests, promote or demote other administrators, and manage the admin hierarchy.
   *
   * The underlying data is stored in the `shopping_mall_super_admins` table, which records each super admin's unique email address used as their login identifier, account creation timestamp, last update timestamp, and a soft-deletion marker (`deleted_at`). When `deleted_at` is non-null, the account is considered deactivated, though the historical record is preserved. This endpoint will return the super admin record regardless of its active/deactivated state, allowing the caller to inspect the account status.
   *
   * Access to this endpoint is restricted exclusively to super administrators. Regular administrators, sellers, and customers do not have permission to retrieve super administrator profiles. This access control ensures that the admin management hierarchy is maintained securely and that sensitive account information is only visible to actors with the appropriate privilege level.
   *
   * The response does NOT include the `password_hash` field. Authentication credentials are never exposed through the API layer. The response includes account metadata such as the email, grade indicators, and lifecycle timestamps.
   *
   * This operation is typically used in the context of the super admin management interface, where a super administrator may inspect a peer account before performing a promotion or demotion action. Related operations include `PATCH /superAdmins` for listing all super administrators, and `PUT /admins/{adminId}/promote` or similar grade-change operations.
   *
   * @param connection
   * @param superAdminId The unique UUID of the target super administrator account to retrieve (global scope).
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor superAdmin
     * @x-autobe-specification 1. Authenticate the caller and verify they hold
     *   the super administrator role. Reject with 403 Forbidden if the caller
     *   is not a super administrator. 2. Validate that the `superAdminId` path
     *   parameter is a well-formed UUID. 3. Query the
     *   `shopping_mall_super_admins` table for a record matching the given UUID
     *   (`id = superAdminId`). 4. If no record is found, return 404 Not Found.
     *   5. Map the database record to the `IShoppingMallSuperAdmin` response
     *   DTO. Explicitly exclude the `password_hash` field — never expose it in
     *   the response. 6. Include the following fields in the response: `id`,
     *   `email`, `created_at`, `updated_at`, `deleted_at` (nullable). 7. Return
     *   the DTO with HTTP 200 OK.
   *
   * Edge cases:
   * - If `deleted_at` is non-null, the account is deactivated but the record is still returned; the caller can observe the deactivation status.
   * - No joining to subtype tables (shopping_mall_super_admin_of_customers / shopping_mall_super_admin_of_sellers) is required for this basic retrieval unless the response DTO includes origin context.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":superAdminId")
  public async at(
    @SuperadminAuth()
    superAdmin: SuperadminPayload,
    @TypedParam("superAdminId")
    superAdminId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallSuperAdmin> {
    try {
      return await getShoppingMallSuperAdminSuperAdminsSuperAdminId({
        superAdmin,
        superAdminId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Demote a super administrator to the regular administrator grade.
   *
   * This operation allows an authenticated super administrator to downgrade another super administrator's grade to that of a regular administrator. Upon successful demotion, the target account loses all super administrator exclusive privileges — including the ability to approve or reject admin promotion requests, to promote regular administrators, and to demote other super administrators — while retaining all standard platform governance capabilities (seller approval, category management, product oversight, order management, and customer/seller account management).
   *
   * Only super administrators are authorized to invoke this endpoint. A regular administrator attempting to call this operation will have their request rejected immediately, with no change applied to any account's grade. This constraint is enforced at the service layer and is aligned with the platform's administrator hierarchy rules.
   *
   * A super administrator cannot demote themselves. If the authenticated super administrator submits this request targeting their own account (i.e., the superAdminId matches the caller's own ID), the system will reject the action and preserve the caller's existing super administrator grade. This restriction ensures the platform always retains at least one active super administrator capable of governing administrator-level operations.
   *
   * If the target super administrator identified by superAdminId does not exist, or if the target is already a regular administrator (i.e., superAdminId does not match any record in the shopping_mall_super_admins table), the request will be rejected with an appropriate error. Similarly, attempting to demote an account that has been deactivated (deleted_at is non-null) is not permitted.
   *
   * Grade changes take effect immediately upon a successful response — no approval queue or secondary confirmation step is involved. The change is reflected in the returned administrator entity, which will represent the target account's updated state as a regular administrator.
   *
   * This endpoint is related to the super administrator promotion endpoint (POST /admins/{adminId}/promote), which performs the reverse operation of elevating a regular administrator to super administrator status. Together, these two endpoints are the sole mechanisms for administrator grade management on the platform.
   *
   * @param connection
   * @param superAdminId UUID of the target super administrator to be demoted to a regular administrator grade.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor superAdmin
     * @x-autobe-specification 1. Authentication & Authorization: - Authenticate
     *   the calling actor and confirm it is a super administrator (i.e., exists
     *   in shopping_mall_super_admins and has a non-null deleted_at = null). -
     *   If the caller is a regular administrator (exists only in
     *   shopping_mall_admins), reject with 403 Forbidden.
   *
   * 2. Self-demotion Guard:
   *    - Compare superAdminId with the authenticated super admin's own ID.
   *    - If they match, reject with 400 Bad Request indicating self-demotion is not permitted.
   *
   * 3. Target Validation:
   *    - Look up the record in shopping_mall_super_admins WHERE id = superAdminId AND deleted_at IS NULL.
   *    - If not found, reject with 404 Not Found.
   *
   * 4. Demotion Transaction:
   *    - Within a single database transaction:
   *      a. Remove (or deactivate) the super admin record for the target from shopping_mall_super_admins by setting deleted_at = NOW() or by deleting the row, depending on the system's model for grade tracking.
   *      b. Ensure the corresponding shopping_mall_admins record for the target exists and is active (deleted_at IS NULL). Update it as necessary to reflect that the account is now a regular admin.
   *      c. If the system tracks grade history via admin_request records, create an audit entry recording the grade change.
   *    - Commit the transaction.
   *
   * 5. Response Construction:
   *    - Fetch the target's updated shopping_mall_admins record (with email, actor_type, created_at, updated_at).
   *    - Return the entity as IShoppingMallAdmin representing the now-regular administrator.
   *
   * 6. Edge Cases:
   *    - If superAdminId is the same as the current caller's ID → reject (self-demotion guard).
   *    - If the target account's deleted_at is non-null (deactivated) → reject with 404 or 409.
   *    - If the target is already a regular administrator (not a super admin) → reject with 409 Conflict.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post(":superAdminId/demote")
  public async demote(
    @SuperadminAuth()
    superAdmin: SuperadminPayload,
    @TypedParam("superAdminId")
    superAdminId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallAdmin> {
    try {
      return await postShoppingMallSuperAdminSuperAdminsSuperAdminIdDemote({
        superAdmin,
        superAdminId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
