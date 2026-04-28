import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IErpHrmOrganizationMember } from "../../../../api/structures/IErpHrmOrganizationMember";
import { IPageIErpHrmOrganizationMember } from "../../../../api/structures/IPageIErpHrmOrganizationMember";
import { MemberAuth } from "../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../decorators/payload/MemberPayload";
import { deleteErpHrmMemberOrganizationMembersOrganizationMemberId } from "../../../../providers/deleteErpHrmMemberOrganizationMembersOrganizationMemberId";
import { getErpHrmMemberOrganizationMembersOrganizationMemberId } from "../../../../providers/getErpHrmMemberOrganizationMembersOrganizationMemberId";
import { patchErpHrmMemberOrganizationMembers } from "../../../../providers/patchErpHrmMemberOrganizationMembers";
import { postErpHrmMemberOrganizationMembers } from "../../../../providers/postErpHrmMemberOrganizationMembers";
import { putErpHrmMemberOrganizationMembersOrganizationMemberId } from "../../../../providers/putErpHrmMemberOrganizationMembersOrganizationMemberId";

@Controller("/erpHrm/member/organizationMembers")
export class ErphrmMemberOrganizationmembersController {
  /**
   * Create a new organization member (employee record) that links a global user to a specific organization.
   *
   * This operation establishes a membership relationship that connects a user account to an organizational context, enabling the user to perform work within that organization. Upon successful creation, the user gains access to organization-scoped data such as projects, tasks, timelogs, and timesheets within their assigned role's permission boundaries.
   *
   * The membership record includes:
   * - Organization assignment (required): The organization the user joins
   * - User reference (required): The global user account to link
   * - Role assignment (required): Determines what actions the member can perform
   * - Optional department placement: Assigns member to an organizational department
   * - Employment type classification: Distinguishes between full_time, part_time, contractor, or intern
   * - Activation status: Controls whether member can perform work activities
   * - Position/title: Captures job title for organizational identification
   *
   * **Authorization Requirements**
   *
   * Users must have employee management permission (employee:manage) to invoke this operation. This permission is granted to users who can manage employee records including invitations, role assignments, and activation status changes according to the employee lifecycle management requirements in section [378].
   *
   * **Validation Constraints**
   *
   * - The (organization_id, user_id) combination must be unique - a user cannot have multiple memberships in the same organization
   * - Referenced user must exist in erp_hrm_members
   * - Referenced role must exist in erp_hrm_roles within the same organization
   * - Referenced department (if provided) must exist in erp_hrm_departments within the same organization
   * - department_id, employment_type, is_active, and position validation follows the database schema constraints
   *
   * **Business Rules**
   *
   * - New members are created with their specified activation status (is_active field)
   * - Members can be activated/deactivated later without affecting historical records
   * - Employment type affects work hour expectations and reporting classifications
   * - Department assignment supports organizational chart visualization and department-based filtering
   *
   * **Related Operations**
   *
   * - Use PATCH /organizationMembers to list/search existing members
   * - Use GET /organizationMembers/{organizationMemberId} to retrieve a specific member
   * - Use PUT /organizationMembers/{organizationMemberId} to update member details
   * - Referenced in Employee Lifecycle Events [378] - triggers employee invited recorded event on completion
   *
   * @param connection
   * @param body Organization member creation data linking a user to organization with role and optional department assignment
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Service Layer Implementation:
   *
   * 1. **Authorization Check**
   *    - Verify caller has "org:manage" permission in the target organization
   *    - Return 403 Forbidden if unauthorized
   *
   * 2. **Input Validation**
   *    - Validate organization_id exists in erp_hrm_organizations
   *    - Validate user_id exists in erp_hrm_members
   *    - Check (organization_id, user_id) uniqueness constraint - return 409 if membership already exists
   *    - Validate role_id exists in erp_hrm_roles and belongs to same organization_id
   *    - If department_id provided:
   *      - Validate exists in erp_hrm_departments
   *      - Verify belongs to same organization_id
   *
   * 3. **Transaction Handling**
   *    - Begin database transaction
   *    - Create erp_hrm_organization_members record:
   *      - id: Generate UUID
   *      - organization_id: From request body
   *      - user_id: From request body
   *      - role_id: From request body
   *      - department_id: From request body (nullable)
   *      - employment_type: From request body (enum: full_time, part_time, contractor, intern)
   *      - is_active: From request body (boolean, default true)
   *      - position: From request body (nullable string)
   *      - created_at: Current timestamp
   *      - updated_at: Current timestamp
   *      - deleted_at: null
   *    - Commit transaction
   *
   * 4. **Response Construction**
   *    - Query complete member record with joined relations:
   *      - organization (via erp_hrm_organizations relation)
   *      - user (via erp_hrm_members relation)
   *      - role (via erp_hrm_roles relation)
   *      - department (via erp_hrm_departments relation if set)
   *    - Return IErpHrmOrganizationMember with all populated fields
   *
   * 5. **Error Handling**
   *    - 400: Invalid enum values for employment_type, missing required fields
   *    - 403: Insufficient permissions (org:manage required)
   *    - 404: Referenced organization, user, role, or department not found
   *    - 409: Duplicate membership (user already member of this organization)
   *    - 422: Validation failures on constraints
   *
   * 6. **Edge Cases**
   *    - Deactivated organizations: Allow creating members (owner decision)
   *    - Deactivated users: Check if user exists but may be soft-deleted
   *    - Built-in roles: All roles (including Owner, Manager, Employee) can be assigned
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IErpHrmOrganizationMember.ICreate,
  ): Promise<IErpHrmOrganizationMember> {
    try {
      return await postErpHrmMemberOrganizationMembers({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a filtered and paginated list of organization members (employees) belonging to the currently selected organization.
   *
   * This operation provides comprehensive search capabilities for employee management. Members can be filtered by activation status (active/deactivated), department assignment, assigned role, employment type (full_time, part_time, contractor, intern), and position/title.
   *
   * The response includes member summary information containing the membership details along with linked user profile information (display name, email, avatar) and role information for proper identification. This endpoint is essential for employee directory browsing, management dashboards, and organizational reporting.
   *
   * Organization context is determined by the current session's selected organization. All returned members belong to this organization context. Results are paginated using cursor-based pagination for efficient navigation through large employee lists.
   *
   * Permission-based access: Users with employee management permission (employee:manage) can view all members including deactivated ones. Regular members can view active colleagues based on their role permissions.
   *
   * Soft-deleted members (where deleted_at is not null) are excluded from results to maintain clean employee lists while preserving historical records.
   *
   * @param connection
   * @param body Search criteria and pagination parameters for filtering organization members
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Query erp_hrm_organization_members table with
     *   organization scoping from session context.
   *
   * Join with erp_hrm_members for user profile data (first_name, last_name, email, avatar_url).
   * Join with erp_hrm_roles for role name and description.
   * Join with erp_hrm_departments for department name (if department_id exists).
   *
   * Apply filters from request body:
   * - is_active: Filter by activation status (true/false/null for all)
   * - department_id: Filter by specific department, array for multiple, null for no department assignment
   * - role_id: Filter by assigned role
   * - employment_type: Filter by employment classification (full_time, part_time, contractor, intern)
   * - position: Partial text search on position field (case-insensitive, uses GIN index)
   * - user_id: Filter by specific user (for checking existing membership)
   *
   * Add WHERE organization_id = current_organization_id from session.
   * Exclude records where deleted_at IS NOT NULL.
   *
   * Pagination:
   * - cursor-based with created_at as tie-breaker
   * - page_size from request (default 20, max 100)
   * - Return pagination object with next_cursor, prev_cursor, total_count
   *
   * Sorting:
   * - Default sort by created_at DESC (newest first)
   * - Support position, department name, role name sorts
   *
   * Response structure:
   * - data: Array of IErpHrmOrganizationMember.ISummary
   * - pagination: Cursor-based pagination metadata
   *
   * Each summary includes:
   * - id, organization_id, role_id, department_id
   * - employment_type, position, is_active
   * - user: Embedded user info (id, email, first_name, last_name, avatar_url)
   * - role: Embedded role name
   * - department: Embedded department name (if exists)
   * - created_at, updated_at
   *
   * Edge cases:
   * - Empty department_id shows members without department assignment
   * - Deactivated members returned only if is_active filter explicitly false
   * - Position search uses trigram similarity for fuzzy matching
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IErpHrmOrganizationMember.IRequest,
  ): Promise<IPageIErpHrmOrganizationMember.ISummary> {
    try {
      return await patchErpHrmMemberOrganizationMembers({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve detailed information about a specific organization member by their unique identifier.
   *
   * This operation returns complete information about an organization member, including their role assignment, optional department placement, employment type classification, activation status, and related user profile data. The response includes the full member record with all organizational context needed to understand the member's position and permissions within the organization.
   *
   * The response contains the member's basic details (position, employment_type, is_active), along with nested objects for the assigned role (name, description, is_builtin), optional department (name, description), and the linked user (email, first_name, last_name, avatar_url). This comprehensive view enables the client to display complete member information without requiring additional API calls.
   *
   * Authorization requires that the requesting user has employee management permissions or is accessing their own member record within the same organization context.
   *
   * This endpoint is typically used when clicking on a member in a list to view their full profile, or when loading member details for editing purposes.
   *
   * @param connection
   * @param organizationMemberId Target organization member's ID (scoped to organization)
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implementation details:
   *
   * 1. Query the erp_hrm_organization_members table by id (path parameter)
   * 2. Join with erp_hrm_roles to get role details
   * 3. Left join with erp_hrm_departments to get optional department details
   * 4. Join with erp_hrm_members to get user profile information
   * 5. Verify the member belongs to the current organization context (from session)
   * 6. Return the complete member record with nested role, department, and user objects
   *
   * Security checks:
   * - Must have employee_management permission or be the same user
   * - Must be in the same organization context
   * - Skip records where deleted_at is not null (soft deleted)
   *
   * Edge cases:
   * - Return 404 if member not found
   * - Return 403 if no permission or wrong organization
   * - Handle cases where department_id is null gracefully
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":organizationMemberId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("organizationMemberId")
    organizationMemberId: string,
  ): Promise<IErpHrmOrganizationMember> {
    try {
      return await getErpHrmMemberOrganizationMembersOrganizationMemberId({
        member,
        organizationMemberId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Updates an existing OrganizationMember (Employee) record with new values for role assignment, department placement, position title, employment type classification, or activation status.
   *
   * This operation allows authorized users with employee management permission to modify employee records within their organization. Common update scenarios include:
   * - Changing an employee's role (e.g., promoting to Manager or assigning a custom role)
   * - Reassigning the employee to a different department
   * - Updating the employee's job position or title
   * - Changing employment type (full-time, part-time, contractor, intern)
   * - Activating or deactivating an employee account
   *
   * When updating department assignment, the employee is moved from their current department (if any) to the newly specified department. When department_id is set to null or omitted, the employee's department assignment is cleared.
   *
   * Role changes take effect immediately, updating the employee's permission set based on the assignments defined for the new role. Built-in roles (Owner, Manager, Employee) and custom roles can be assigned.
   *
   * Deactivating an employee (setting is_active to false) prevents them from logging new time entries or submitting timesheets while preserving all historical work data. Reactivation (setting is_active to true) restores full access.
   *
   * The operation requires permission token containing 'employee:manage' scope. Users can only update members within their own organization context.
   *
   * Validation rules enforced:
   * - Target organization member must exist and belong to the caller's organization
   * - Assigned role_id must be valid within the organization
   * - Assigned department_id, if provided, must be valid and belong to the organization
   * - Employment type must be one of: full_time, part_time, contractor, intern
   *
   * Related operations:
   * - GET /organizationMembers/{organizationMemberId} - Retrieve current member details before updating
   * - PATCH /organizationMembers - Search and list members to find target for updates
   *
   * @param connection
   * @param organizationMemberId Target OrganizationMember's unique identifier (UUID)
   * @param body Updated values for OrganizationMember attributes
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implementation requires the following steps:
   *
   * 1. **Authentication & Authorization**: Verify caller has valid authentication token with active organization context. Confirm caller possesses 'employee:manage' permission (or equivalent employee management capability).
   *
   * 2. **Path Parameter Validation**: Extract organizationMemberId from path. Validate it is a valid UUID format.
   *
   * 3. **Request Body Validation**: Validate IErpHrmOrganizationMember.IUpdate payload:
   *    - role_id: Must be valid UUID referencing erp_hrm_roles table within same organization
   *    - department_id: Optional, if provided must be valid UUID referencing erp_hrm_departments in same organization; if set to null, clear existing assignment
   *    - position: Optional string, max length appropriate for job titles
   *    - employment_type: Enum validation - one of: 'full_time', 'part_time', 'contractor', 'intern'
   *    - is_active: Boolean value
   *
   * 4. **Database Transaction**: Use Prisma transaction to ensure atomic update:
   *    - Query existing erp_hrm_organization_members record by id
   *    - Verify record exists - throw NOT_FOUND if absent or soft-deleted
   *    - Verify record's organization_id matches caller's current organization context - throw FORBIDDEN if cross-org attempt
   *    - If role_id is changing, verify new role exists in same organization and is not a built-in role being incorrectly modified
   *    - If department_id is changing, verify new department exists in same organization
   *    - Update fields: role_id, department_id, position, employment_type, is_active, updated_at
   *    - When deactivating (is_active => false), stop any active timers for this member (cascade to erp_hrm_timers)
   *
   * 5. **Return Response**: Return full updated IErpHrmOrganizationMember object including joined data (user info, role info, department info if any)
   *
   * Edge cases:
   * - If member is the last Owner in organization, prevent role change that would remove Owner capability
   * - Soft-deleted members cannot be updated - return NOT_FOUND
   * - Department deletion cascades clear department_id - this operation should allow explicit clearing too
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":organizationMemberId")
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("organizationMemberId")
    organizationMemberId: string,
    @TypedBody()
    body: IErpHrmOrganizationMember.IUpdate,
  ): Promise<IErpHrmOrganizationMember> {
    try {
      return await putErpHrmMemberOrganizationMembersOrganizationMemberId({
        member,
        organizationMemberId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Soft deletes an organization member from the organization by marking their record as deleted.
   *
   * This operation performs a soft delete on the employment relationship between a user and the organization. The OrganizationMember record is marked with a deletion timestamp, preventing the member from accessing organization data while preserving all historical records for audit and compliance purposes.
   *
   * When an organization member is soft deleted:
   * - Their is_active status becomes false, preventing login and work activity
   * - Historical timelogs, timesheets, and time tracking records remain intact for reporting
   * - Project membership links are preserved for historical reference
   * - The member's user account itself is not affected - only their association with this specific organization is deactivated
   * - The record can be viewed by administrators for auditing purposes
   *
   * This operation requires organization management permission (org:manage) and should only be performed by authorized personnel such as organization owners or administrators. The soft deletion preserves the complete audit trail of the member's work history.
   *
   * Note: This is distinct from user account deletion, which removes the global user profile. Members deleted from an organization can later be re-invited if their user account still exists.
   *
   * @param connection
   * @param organizationMemberId Unique identifier of the organization member (employee) to remove (UUID format)
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implement DELETE operation for OrganizationMember
     *   removal.
   *
   * 1. Validate the requesting user has org:manage permission for the organization.
   *
   * 2. Query the OrganizationMember by organizationMemberId, verify it belongs to the current organization context.
   *
   * 3. Check for active contracts - if any active contracts exist for the member, rejection may be required per deletion dependency rules (org owner must terminate contracts first).
   *
   * 4. Handle related data preservation:
   *    - Timelogs: Preserve all historical timelogs. Do NOT cascade delete - they are needed for audit and compliance.
   *    - Timesheets: Preserve all timesheet records.
   *    - Timers: Remove active timers belonging to this member (they represent in-progress work that won't complete).
   *    - ProjectMember records: Remove membership links, but preserve the member's historical contributions to projects.
   *    - Contracts: If any contracts exist, they should be handled based on business rules - possibly archived or marked as terminated.
   *
   * 5. Delete the OrganizationMember record itself.
   *
   * 6. Log the deletion event in ActivityLog for audit purposes.
   *
   * 7. Return HTTP 204 No Content on success.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":organizationMemberId")
  public async erase(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("organizationMemberId")
    organizationMemberId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteErpHrmMemberOrganizationMembersOrganizationMemberId({
        member,
        organizationMemberId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
