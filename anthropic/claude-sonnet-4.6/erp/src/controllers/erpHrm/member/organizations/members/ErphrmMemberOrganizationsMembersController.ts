import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IErpHrmOrganizationMember } from "../../../../../api/structures/IErpHrmOrganizationMember";
import { IPageIErpHrmOrganizationMember } from "../../../../../api/structures/IPageIErpHrmOrganizationMember";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { deleteErpHrmMemberOrganizationsOrganizationIdMembers } from "../../../../../providers/deleteErpHrmMemberOrganizationsOrganizationIdMembers";
import { patchErpHrmMemberOrganizationsOrganizationIdMembers } from "../../../../../providers/patchErpHrmMemberOrganizationsOrganizationIdMembers";
import { postErpHrmMemberOrganizationsOrganizationIdMembers } from "../../../../../providers/postErpHrmMemberOrganizationsOrganizationIdMembers";
import { putErpHrmMemberOrganizationsOrganizationIdMembers } from "../../../../../providers/putErpHrmMemberOrganizationsOrganizationIdMembers";

@Controller("/erpHrm/member/organizations/:organizationId/members")
export class ErphrmMemberOrganizationsMembersController {
  /**
   * Add a new member to the specified organization by creating an organizational identity record.
   *
   * This operation creates an `erp_hrm_organization_members` record that links an existing platform-level user account (`erp_hrm_members`) to the target organization (`erp_hrm_organizations`). Each organization member record represents the per-organization persona through which all work within that organization is performed, including project assignments, time logging, timesheet submissions, and task management.
   *
   * Only authenticated members who hold a role with organization management permission within the target organization may perform this action. The platform-level user being added must already have a registered account on the platform. Attempting to add a user who is already a member of the specified organization will result in a conflict error, as the `@@unique([organization_id, member_id])` constraint in the database enforces one membership record per user per organization.
   *
   * The request body must specify the platform user to add (`member_id`), the role to assign (`role_id`), and the employment classification (`employment_type`). The employment type must be one of the allowed values: `full-time`, `part-time`, `contractor`, or `intern`, as defined by the `employment_type` column of `erp_hrm_organization_members`. The assigned role must belong to the same organization; cross-organization role references are rejected.
   *
   * The newly created member is immediately given an `active` status, allowing them to participate in all activities permitted by their assigned role. The optional `department_id` field places the member within an existing department of the organization; if provided, the department must belong to the same organization. The optional `position` field is a free-text descriptor of the member's functional title (e.g., "Senior Engineer") and does not affect permissions.
   *
   * Upon successful creation, the full organizational member record is returned, including all resolved relationship fields such as the assigned role and department details. This operation is strictly scoped to the organization identified by `organizationId`; data from other organizations is never accessible or affected.
   *
   * To list all current members of an organization, use `PATCH /organizations/{organizationId}/members`. To view the details of a specific member, use `GET /organizations/{organizationId}/members/{memberId}`.
   *
   * @param connection
   * @param organizationId The unique identifier (UUID) of the organization to which the new member will be added.
   * @param body Creation details for the new organization member, including the platform user to add, their role, employment classification, and optional department and position.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification 1. Authenticate the requesting member and verify
     *   they are an active member of the organization identified by
     *   `organizationId` with organization management permission. 2. Validate
     *   that the organization identified by `organizationId` exists in
     *   `erp_hrm_organizations` and has a null `deleted_at`. 3. Validate the
     *   request body: - `member_id`: must reference an existing
     *   `erp_hrm_members` record with null `deleted_at`. - `role_id`: must
     *   reference an existing `erp_hrm_roles` record where
     *   `erp_hrm_organization_id` matches `organizationId`. -
     *   `employment_type`: must be one of 'full-time', 'part-time',
     *   'contractor', 'intern'. - `department_id` (optional): if provided, must
     *   reference an existing `erp_hrm_departments` record scoped to the same
     *   `organizationId` with null `deleted_at`. - `position` (optional):
     *   free-text string. 4. Check uniqueness: query
     *   `erp_hrm_organization_members` for an existing record with matching
     *   `organization_id` and `member_id`. If found and `deleted_at` is null,
     *   return a 409 Conflict. If found but `deleted_at` is set (previously
     *   removed), reactivate or create a new record per business policy. 5.
     *   Insert a new `erp_hrm_organization_members` row with: - `id`: generate
     *   new UUID. - `organization_id`: from path. - `member_id`: from request
     *   body. - `role_id`: from request body. - `department_id`: from request
     *   body (or null). - `employment_type`: from request body. - `status`: set
     *   to 'active'. - `position`: from request body (or null). - `created_at`,
     *   `updated_at`: current timestamp. - `deleted_at`: null. 6. Fetch the
     *   newly created record with joined relations (member email/profile, role
     *   name, department name) and return as `IErpHrmOrganizationMember`. 7.
     *   Emit any relevant real-time events (e.g., member added event) to
     *   connected clients scoped to the organization.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmOrganizationMember.ICreate,
  ): Promise<IErpHrmOrganizationMember> {
    try {
      return await postErpHrmMemberOrganizationsOrganizationIdMembers({
        member,
        organizationId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update the currently authenticated member's organizational profile within the specified organization.
   *
   * This operation allows an authenticated member to modify their own organizational member record as it exists within the given organization. The `organizationId` path parameter identifies the target organization scope, and the update is applied to the caller's own `erp_hrm_organization_members` record linked to that organization.
   *
   * The updatable fields include the member's descriptive position title (a free-text field such as 'Senior Engineer' or 'Project Coordinator'), department assignment (referencing an `erp_hrm_departments` record within the same organization), and employment classification type (one of: 'full-time', 'part-time', 'contractor', 'intern'). Changes to the member's assigned role or operational status require elevated permissions (Manager or Owner role) and are validated at the service layer before being applied.
   *
   * All data is strictly scoped to the organization identified by `organizationId`. The system enforces multi-tenancy isolation on every operation, ensuring that members of one organization cannot view or modify records belonging to another. Attempting to update a record outside the caller's current organization context will be rejected.
   *
   * Upon successful update, the operation returns the complete updated `erp_hrm_organization_members` record, including all fields such as employment type, status, position, role reference, department reference, and relevant timestamps. Clients may use the returned record to synchronize local state without requiring a subsequent GET call.
   *
   * This endpoint is typically used after the member's profile has been viewed, to apply changes such as updating a job title, switching departments, or reclassifying employment type. The `GET /organizations/{organizationId}/members/{memberId}` endpoint can be used to retrieve a member's current details before submitting updates.
   *
   * @param connection
   * @param organizationId The UUID of the organization within which the authenticated member's profile is to be updated.
   * @param body Fields to update on the authenticated member's organizational profile, including position title, department assignment, employment type, role, and status.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification 1. Authenticate the calling member via their
     *   session token and resolve their platform-level member ID. 2. Look up
     *   the `erp_hrm_organization_members` record matching (organization_id =
     *   organizationId path param, member_id = authenticated member's ID). If
     *   not found or deleted_at is set, return 404. 3. Validate the request
     *   body fields: - `position`: optional string, free-text, no length
     *   restriction beyond reasonable limits. - `department_id`: if provided,
     *   verify that an `erp_hrm_departments` record with this ID exists within
     *   the same organization and is not soft-deleted (deleted_at IS NULL).
     *   Return 404 if the department does not exist or does not belong to this
     *   organization. - `employment_type`: if provided, validate it is one of
     *   'full-time', 'part-time', 'contractor', 'intern'. - `role_id`: if
     *   provided, verify the caller has Manager or Owner role (permission
     *   check). Verify the target role exists within the organization. If the
     *   caller lacks permission, return 403. - `status`: if provided, verify
     *   the caller has Manager or Owner role. Validate it is one of 'active',
     *   'deactivated'. If the caller lacks permission, return 403. 4. Execute
     *   an UPDATE on `erp_hrm_organization_members` setting the changed fields
     *   and updating `updated_at` to the current timestamp. 5. Return the full
     *   updated organization member record, joining with related role and
     *   department data for the response DTO. 6. Edge cases: - If
     *   `department_id` is set to null explicitly, clear the department
     *   association. - A member cannot deactivate themselves if they are the
     *   organization's only owner. - Organization data isolation must be
     *   enforced: organizationId in the path must match the member's session
     *   organization context.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put()
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmOrganizationMember.IUpdate,
  ): Promise<IErpHrmOrganizationMember> {
    try {
      return await putErpHrmMemberOrganizationsOrganizationIdMembers({
        member,
        organizationId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a filtered and paginated list of organization members (employees) within a specific organization.
   *
   * This operation returns the complete list of organization members belonging to the given organization, supporting rich filtering and search capabilities. Users who hold the employee view permission may access this endpoint. The list is paginated to support large organizations with many members, and all filtering options can be applied individually or in combination.
   *
   * The following filtering options are supported:
   * - **By department**: Show only members assigned to a specific department, identified by the department's UUID (`erp_hrm_departments.id`). Members with no department assignment will be excluded when this filter is active; omit the filter to include all members regardless of department.
   * - **By employment type**: Show only members of a specific employment classification. Allowed values correspond to the `employment_type` field of `erp_hrm_organization_members`: `full-time`, `part-time`, `contractor`, `intern`.
   * - **By status**: Show only active members (`active`), only deactivated members (`deactivated`), or all members regardless of status. Corresponds to the `status` field of `erp_hrm_organization_members`.
   * - **By name / email search**: Perform a partial-match search against the email address of the linked `erp_hrm_members` account. Only members whose email contains the search term are returned.
   *
   * When no filters or search terms are applied, the full paginated list of all organization members for the organization is returned. Each summary entry includes the member's email address (from `erp_hrm_members`), employment type, department name (from `erp_hrm_departments`, nullable), optional position title (`erp_hrm_organization_members.position`), current operational status, and assigned role name (from `erp_hrm_roles`).
   *
   * All data returned is strictly scoped to the organization identified by `organizationId`. Members from other organizations are never included in the response, enforcing the platform's multi-tenancy isolation policy enforced at the `erp_hrm_organization_members.organization_id` level. A request using a session not scoped to the target organization will be rejected.
   *
   * When filters or search terms yield no matching members, the system returns an empty result set with valid pagination metadata rather than an error. This is expected and normal behavior.
   *
   * This operation is useful for HR managers browsing employee rosters, filtering employees by team or employment type, and for building employee selection UI components used in task assignment, timesheet review, and department management workflows.
   *
   * Related operations:
   * - `GET /erpHrm/member/organizations/{organizationId}/members/{memberId}` retrieves the full detail of a single member record including current role assignment, employment details, and contract summary.
   *
   * @param connection
   * @param organizationId The UUID of the organization whose member list is being browsed. Scopes all results to this organization exclusively.
   * @param body Search criteria, filters, and pagination parameters for browsing the organization member list.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification 1. Authenticate the requesting member and verify
     *   their session is scoped to the organization identified by
     *   `organizationId`. Reject if not. 2. Verify the requesting member has
     *   the employee view permission within the organization. Reject with 403
     *   if not. 3. Query `erp_hrm_organization_members` WHERE `organization_id
     *   = organizationId` AND `deleted_at IS NULL`. 4. Apply filters from the
     *   request body: - If `departmentId` is provided, add WHERE `department_id
     *   = departmentId`. - If `employmentType` is provided, add WHERE
     *   `employment_type = employmentType`. - If `status` is provided, add
     *   WHERE `status = status`. - If `query` (name search) is provided, JOIN
     *   `erp_hrm_members` ON `member_id` and apply WHERE
     *   `erp_hrm_members.display_name ILIKE '%query%'` (or use GIN trigram
     *   index on name for performance). 5. JOIN `erp_hrm_members` to get
     *   display name and avatar. 6. JOIN `erp_hrm_roles` to get the assigned
     *   role name. 7. LEFT JOIN `erp_hrm_departments` to get department name
     *   (nullable). 8. Apply pagination: use `page` and `limit` from the
     *   request body to compute OFFSET and LIMIT. Return total count for
     *   pagination metadata. 9. Sort by `created_at` descending by default,
     *   unless a sort field is specified. 10. Return paginated result as
     *   `IPageIErpHrmOrganizationMember.ISummary` with `pagination` metadata
     *   and `data` array of member summaries. 11. Edge cases: if
     *   `organizationId` does not exist or is deleted, return 404. If no
     *   members match the filters, return an empty data array with valid
     *   pagination metadata.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmOrganizationMember.IRequest,
  ): Promise<IPageIErpHrmOrganizationMember.ISummary> {
    try {
      return await patchErpHrmMemberOrganizationsOrganizationIdMembers({
        member,
        organizationId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Remove the currently authenticated member from the specified organization (leave organization).
   *
   * This operation allows an authenticated member to withdraw their membership from a given organization. It targets the caller's own organization member record within the organization identified by `organizationId`, effectively revoking their active participation and access within that organization's context.
   *
   * The underlying data model is `erp_hrm_organization_members`, which stores the per-organization identity record that links a platform-level user account (`erp_hrm_members`) to a specific organization (`erp_hrm_organizations`). When this record is deactivated, the member loses their organizational context, role assignment, and active participation rights within that organization. Historical records associated with the departing member (timelogs, timesheets, task assignments, etc.) are preserved for auditing and reporting purposes within the organization.
   *
   * A sole owner restriction applies: if the authenticated member is the only member assigned the Owner role in this organization, the system will reject the leave request. Before leaving, the sole owner must either transfer the Owner role to another active member of the organization, or permanently delete the organization entirely. This safeguard ensures that organizations always have at least one owner to maintain administrative continuity. If the member is an owner but NOT the sole owner (i.e., other members also hold the Owner role), the leave request proceeds without restriction.
   *
   * The operation is atomic: either the membership is fully deactivated or it is preserved in its prior state with no partial changes. Upon successful removal, the system emits a real-time event to connected clients reflecting the membership change, and the removed member's organization context list is updated to exclude the departed organization.
   *
   * This operation is only available to authenticated members (`member` actor). The member must currently be an active member of the specified organization. Attempting to leave an organization the caller does not belong to results in a not-found or authorization error.
   *
   * Related operations:
   * - `PUT /organizations/{organizationId}/members/{memberId}/role` — Transfer the Owner role to another member before leaving, if the caller is the sole owner.
   * - `DELETE /organizations/{organizationId}` — Delete the organization entirely if there are no other members to transfer ownership to.
   *
   * @param connection
   * @param organizationId The UUID of the target organization from which the authenticated member wishes to leave.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification 1. Authenticate the caller and resolve their
     *   platform-level member ID from the session token. 2. Look up the
     *   erp_hrm_organization_members record where organization_id =
     *   organizationId AND member_id = caller's member ID AND deleted_at IS
     *   NULL. Return 404 if not found. 3. Enforce sole-owner restriction: a.
     *   Load the organization's owner_member_id from erp_hrm_organizations. b.
     *   Determine if the caller is an owner-role member: check the
     *   erp_hrm_roles table for the role assigned to this member and whether it
     *   is the built-in Owner role. c. Count how many active organization
     *   members with the Owner role exist in this organization. d. If the
     *   caller is the sole owner (count == 1), return a 422/409 business error
     *   indicating that sole owners cannot leave without first transferring
     *   ownership or deleting the organization. Include in the error payload
     *   the list of organization IDs where the caller is the sole owner. 4.
     *   Perform the removal atomically within a database transaction: a.
     *   Hard-delete or set deleted_at on the erp_hrm_organization_members
     *   record (follow the schema's soft-delete column). b. Cascade any
     *   necessary cleanup per business rules (e.g., unassign any active timer,
     *   end any active sessions scoped to this organization context). 5. Emit a
     *   real-time membership-removed event to connected clients within the
     *   organization context. 6. Return the removed organization member record
     *   as the response body to confirm the operation. 7. Edge cases: - If the
     *   organization itself is already deleted (deleted_at IS NOT NULL), return
     *   404. - If the caller is not a member of the organization, return 404 or
     *   403. - Ensure the operation is idempotent with respect to repeated
     *   calls (already-removed members return 404).
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete()
  public async leave(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteErpHrmMemberOrganizationsOrganizationIdMembers({
        member,
        organizationId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
