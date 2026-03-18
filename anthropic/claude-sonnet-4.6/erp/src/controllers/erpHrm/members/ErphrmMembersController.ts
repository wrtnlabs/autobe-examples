import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IErpHrmOrganizationMember } from "../../../api/structures/IErpHrmOrganizationMember";
import { IPageIErpHrmOrganizationMember } from "../../../api/structures/IPageIErpHrmOrganizationMember";
import { getErpHrmMembersMemberId } from "../../../providers/getErpHrmMembersMemberId";
import { patchErpHrmMembers } from "../../../providers/patchErpHrmMembers";

@Controller("/erpHrm/members")
export class ErphrmMembersController {
  /**
   * Retrieve a filtered and paginated list of organization members within the current organization context.
   *
   * This operation returns a paginated list of OrganizationMember records belonging to the authenticated member's currently selected organization. Each OrganizationMember (`erp_hrm_organization_members`) represents an organization-scoped identity that links a platform-level user account (`erp_hrm_members`) to a specific organization, along with their employment classification, status, role assignment, department placement, and position title.
   *
   * The caller must be an authenticated member with a valid organization session. All results are strictly isolated to the current organization — no data from other organizations is ever included, regardless of whether the authenticated user is a member of multiple organizations. Organization context is enforced on every operation, and any cross-organization access attempt is rejected.
   *
   * The request body accepts optional search and filter parameters including:
   * - **status**: Filter by member status (`'active'` or `'deactivated'`). Active members can initiate new work; deactivated members retain their history but cannot create new work entries.
   * - **employment_type**: Filter by engagement classification (`'full-time'`, `'part-time'`, `'contractor'`, `'intern'`).
   * - **department_id**: Filter members belonging to a specific department (`erp_hrm_departments`).
   * - **role_id**: Filter members assigned to a specific role (`erp_hrm_roles`).
   * - **keyword**: Free-text search matched against the **display name** of the linked user account (stored in the user's platform-level profile record). Returns only members whose display name contains the search term. When no keyword is provided, all members satisfying the other filters are returned.
   * - **pagination**: Control the page number and page size of the returned results. When not specified, a default page size is applied so the response remains bounded.
   * - **sort**: Control the sort order of the results (e.g., by `created_at`).
   *
   * When multiple filters are applied simultaneously, only members satisfying all active filter conditions are returned. When no filters or keyword are provided, the full paginated list of all organization members (including both active and deactivated) is returned.
   *
   * The response contains paginated summary records (`IErpHrmOrganizationMember.ISummary`) that include essential member identity information suitable for list displays — including the member's display name, employment type, department name, position title, status, and assigned role name.
   *
   * This endpoint is typically used as the starting point for HR managers or organization owners who need to browse, search, or filter the workforce within their organization. Once a specific member is identified, their full detail can be retrieved using the GET `/members/{memberId}` endpoint.
   *
   * @param connection
   * @param body Search criteria, filters, and pagination parameters for listing organization members.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification 1. Authenticate the requesting actor as a valid 'member' with an active organization session. Extract the organization_id from the session context.
   * 2. Parse and validate the request body (IErpHrmOrganizationMember.IRequest):
   *    - Validate pagination fields (page, limit) with sensible defaults (page=1, limit=20).
   *    - Validate sort fields against allowed column names.
   *    - Validate status filter against allowed enum values: 'active', 'deactivated'.
   *    - Validate employment_type filter against allowed enum values: 'full-time', 'part-time', 'contractor', 'intern'.
   *    - Validate department_id and role_id as optional UUID filters.
   * 3. Query erp_hrm_organization_members WHERE organization_id = session.organization_id AND deleted_at IS NULL.
   * 4. Apply optional filters:
   *    - WHERE status = request.status (if provided)
   *    - WHERE employment_type = request.employment_type (if provided)
   *    - WHERE department_id = request.department_id (if provided)
   *    - WHERE role_id = request.role_id (if provided)
   *    - WHERE position ILIKE '%keyword%' OR members.email ILIKE '%keyword%' (if keyword provided, using GIN trigram index on position)
   * 5. JOIN erp_hrm_members ON erp_hrm_organization_members.member_id = erp_hrm_members.id (for email and identity info).
   * 6. JOIN erp_hrm_roles ON erp_hrm_organization_members.role_id = erp_hrm_roles.id (for role name).
   * 7. LEFT JOIN erp_hrm_departments ON erp_hrm_organization_members.department_id = erp_hrm_departments.id (for department name).
   * 8. Apply sorting (default: created_at DESC).
   * 9. Apply pagination using OFFSET/LIMIT or cursor strategy and compute total record count for pagination metadata.
   * 10. Map results to IErpHrmOrganizationMember.ISummary shape including: id, status, employment_type, position, role (id, name, is_builtin), department (id, name, nullable), member (id, email), created_at, updated_at.
   * 11. Return paginated response object with pagination metadata and data array.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @TypedBody()
    body: IErpHrmOrganizationMember.IRequest,
  ): Promise<IPageIErpHrmOrganizationMember.ISummary> {
    try {
      return await patchErpHrmMembers({
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve the full detail of a single organization member record by its unique identifier.
   *
   * This operation returns complete information about an organization member, including their employment classification, operational status, position title, assigned role, and department placement. The response consolidates data from the underlying `erp_hrm_organization_members` table, which represents the per-organization identity of a platform-level user account, together with the linked `erp_hrm_members` global account (email), the assigned `erp_hrm_roles` record (role name and built-in flag), and the optional `erp_hrm_departments` record (department name and description).
   *
   * Access to this endpoint requires the caller to be an authenticated member of the organization and to hold the employee view permission (`employee:view`). Data isolation is strictly enforced: only members belonging to the caller's current active organization context can be retrieved. Any attempt to access a member record from a different organization is rejected regardless of shared user accounts.
   *
   * The returned record reflects the member's current state. If the member has been deactivated (`status: 'deactivated'`), their full detail is still visible to authorized viewers, enabling managers and owners to review historical employment information. If the member's department was previously deleted, the department field will be null.
   *
   * This endpoint is typically used in conjunction with `PATCH /members` (the employee list endpoint) to first browse a paginated list and then fetch full detail for a specific member. It is also used when navigating to a member profile page or when prefilling the member edit form prior to updating employment information via `PUT /members/{memberId}`.
   *
   * @param connection
   * @param memberId The unique UUID identifier of the target organization member record (erp_hrm_organization_members.id).
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification 1. Authenticate the caller as an active organization member with the `employee:view` permission.
   * 2. Extract the `memberId` path parameter (UUID).
   * 3. Query `erp_hrm_organization_members` WHERE `id = memberId` AND `organization_id = callerOrganizationId` AND `deleted_at IS NULL`.
   * 4. If no record found, return 404 Not Found.
   * 5. Join `erp_hrm_members` on `member_id` to retrieve `email` and `created_at` (global account info).
   * 6. Join `erp_hrm_roles` on `role_id` to retrieve `name` and `is_builtin`.
   * 7. Left join `erp_hrm_departments` on `department_id` (nullable) to retrieve `name` and `description`. If department was deleted (`deleted_at IS NOT NULL`), treat as null.
   * 8. Optionally include the most recent active `erp_hrm_employee_contracts` record (WHERE `organization_member_id = memberId` AND `is_active = true`) for contract summary.
   * 9. Compose and return the `IErpHrmOrganizationMember` response object with all joined fields.
   * 10. Do not expose `password_hash` from `erp_hrm_members` in any shape.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":memberId")
  public async at(
    @TypedParam("memberId")
    memberId: string & tags.Format<"uuid">,
  ): Promise<IErpHrmOrganizationMember> {
    try {
      return await getErpHrmMembersMemberId({
        memberId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
