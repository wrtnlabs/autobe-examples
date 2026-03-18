import { TypedBody, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia from "typia";

import { IErpHrmOrganizationMember } from "../../../../api/structures/IErpHrmOrganizationMember";
import { IPageIErpHrmOrganizationMember } from "../../../../api/structures/IPageIErpHrmOrganizationMember";
import { MemberAuth } from "../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../decorators/payload/MemberPayload";
import { patchErpHrmMemberMembers } from "../../../../providers/patchErpHrmMemberMembers";

@Controller("/erpHrm/member/members")
export class ErphrmMemberMembersController {
  /**
   * Retrieve a filtered and paginated list of organization members (employees).
   *
   * This operation provides advanced search capabilities for browsing employees within the current organization context. Organization members represent the link between global user accounts and organizational membership, containing role assignments, department placements, employment classifications, and activation status.
   *
   * Filtering capabilities include role-based filtering, department filtering, active/deactivated status filtering, and text search across member names and emails. The response includes essential summary information optimized for list displays, with joined data from user profiles (name, email, avatar), role definitions, and department assignments.
   *
   * Access is restricted based on the requesting member's permissions. Members with employee viewing permissions can access all organization members, while standard members may have limited visibility based on organizational policies. Deactivated members remain in results for administrative purposes but are identifiable via the isActive flag.
   *
   * Results are ordered by creation date (newest first) by default, with configurable sorting options. Pagination uses cursor-based strategies for optimal performance with large organizations. The operation respects the current organization context established in the authenticated session.
   *
   * Related operations: POST /members for inviting new members, PUT /members/{memberId} for updating member details, GET /members/{memberId} for detailed member information.
   *
   * @param connection
   * @param body Search criteria and pagination parameters for filtering organization members
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Query the erp_hrm_organization_members table with the following implementation details:
   *
   * 1. Organization Scope: Filter by the organization_id from the current session context (erp_hrm_member_sessions.organization_id).
   *
   * 2. Database Joins:
   *    - INNER JOIN erp_hrm_members ON organization_members.user_id = members.id (for user profile data: first_name, last_name, email, avatar_url)
   *    - INNER JOIN erp_hrm_roles ON organization_members.role_id = roles.id (for role name)
   *    - LEFT JOIN erp_hrm_departments ON organization_members.department_id = departments.id (for department name, handle null departments)
   *
   * 3. Soft Delete Filtering: Exclude records where organization_members.deleted_at IS NOT NULL (unless explicitly requested via includeDeleted flag in request).
   *
   * 4. Search Filters (applied when provided in request body):
   *    - roleIds: Filter by organization_members.role_id IN (provided UUIDs)
   *    - departmentIds: Filter by organization_members.department_id IN (provided UUIDs), include NULL when 'unassigned' sentinel provided
   *    - isActive: Filter by organization_members.is_active = true/false
   *    - searchText: Perform ILIKE search across members.first_name, members.last_name, members.email, and organization_members.position using OR conditions with Gin indexes
   *    - employmentType: Filter by organization_members.employment_type IN (provided values)
   *
   * 5. Sorting: Support sort by created_at (default DESC), first_name, last_name, role.name, department.name. Validate sort field against whitelist to prevent injection.
   *
   * 6. Pagination: Implement cursor-based pagination using created_at + id as cursor. Support configurable page size with max limit (100).
   *
   * 7. Permission Check: Verify requesting member has 'employee:read' or 'employee:manage' permission via their role assignment before executing query.
   *
   * 8. Response Projection: Select id, position, employment_type, is_active, created_at from organization_members; id, first_name, last_name, email, avatar_url from members; id, name from roles; id, name from departments.
   *
   * 9. Edge Cases:
   *    - Empty result: Return empty data array with valid pagination metadata
   *    - Invalid cursor: Return 400 with clear error message
   *    - Unauthorized: Return 403 if lacking permissions
   *    - Soft-deleted members: Exclude by default, include only with explicit permission and flag
   *
   * 10. Performance: Ensure proper index usage on organization_id, role_id, department_id, and deleted_at columns.
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
      return await patchErpHrmMemberMembers({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
