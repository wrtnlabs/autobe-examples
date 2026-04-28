import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IHrmPlatformEmployeeInvitation } from "../../../../api/structures/IHrmPlatformEmployeeInvitation";
import { IPageIHrmPlatformEmployeeInvitation } from "../../../../api/structures/IPageIHrmPlatformEmployeeInvitation";
import { MemberAuth } from "../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../decorators/payload/MemberPayload";
import { getHrmPlatformMemberEmployeeInvitationsInvitationId } from "../../../../providers/getHrmPlatformMemberEmployeeInvitationsInvitationId";
import { patchHrmPlatformMemberEmployeeInvitations } from "../../../../providers/patchHrmPlatformMemberEmployeeInvitations";
import { postHrmPlatformMemberEmployeeInvitations } from "../../../../providers/postHrmPlatformMemberEmployeeInvitations";
import { putHrmPlatformMemberEmployeeInvitationsInvitationId } from "../../../../providers/putHrmPlatformMemberEmployeeInvitationsInvitationId";

@Controller("/hrmPlatform/member/employee-invitations")
export class HrmplatformMemberEmployee_invitationsController {
  /**
   * Create a new employee invitation to join the organization.
   *
   * This endpoint allows users with employee:manage permission to invite new employees to the organization by email address. The system automatically checks if the invited email already has a user account in the platform.
   *
   * If the email already has an existing user account, the user is immediately added to the organization as an employee with the specified role, department (if provided), position, and employment type. No pending invitation record is created in this case, and the response contains the newly created employee record.
   *
   * If the email does not have an existing account, a pending invitation is created with the specified role, department (optional), position (optional), employment type, and expiration timestamp. The invitation remains pending until the user signs up with that email address or until it expires. When a user signs up with an email that has pending invitations, they are automatically added to all organizations where they have pending invitations with the roles specified in each invitation.
   *
   * The unique constraint on organization_id and email prevents duplicate pending invitations for the same email within an organization.
   *
   * @param connection
   * @param body Employee invitation details including the invited email address, role assignment, optional department and position, employment type classification, and invitation expiration timestamp.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification 1. Validate user has employee:manage permission
     *   in current organization context.
   *
   * 2. Validate request body:
   *    - email: valid email format, required
   *    - role_id: must reference existing role in same organization, required
   *    - department_id: if provided, must reference existing department in same organization
   *    - position: optional string
   *    - employment_type: must be one of 'full-time', 'part-time', 'contractor', 'intern', required
   *    - expires_at: must be in the future, required
   *
   * 3. Query hrm_platform_members table to check if email already has an account:
   *    SELECT id FROM hrm_platform_members WHERE email = {request.email} AND deleted_at IS NULL
   *
   * 4. If member exists (email already has account):
   *    - Check hrm_platform_employees for existing employee record with same member_id and organization_id (unique constraint)
   *    - If employee already exists, reject with conflict error (409)
   *    - Create hrm_platform_employees record:
   *      - id: generate UUID
   *      - member_id: from found member record
   *      - organization_id: from current organization context
   *      - role_id: from request
   *      - department_id: from request (nullable)
   *      - position: from request (nullable)
   *      - employment_type: from request
   *      - status: 'active'
   *    - Log activity: 'employee.added' with details
   *    - Return created employee record (IHrmPlatformEmployee)
   *
   * 5. If member does not exist (no account):
   *    - Check for existing pending invitation: SELECT id FROM hrm_platform_employee_invitations WHERE organization_id = {org_id} AND email = {request.email} AND status = 'pending' AND deleted_at IS NULL
   *    - If pending invitation exists, reject with conflict error (409)
   *    - Create hrm_platform_employee_invitations record:
   *      - id: generate UUID
   *      - organization_id: from current organization context
   *      - invited_by: current member's ID
   *      - role_id: from request
   *      - department_id: from request (nullable)
   *      - email: from request
   *      - position: from request (nullable)
   *      - employment_type: from request
   *      - status: 'pending'
   *      - invited_at: current timestamp
   *      - expires_at: from request
   *      - accepted_at: null
   *    - Log activity: 'employee.invited' with details
   *    - Return created invitation record (IHrmPlatformEmployeeInvitation)
   *
   * 6. Error handling:
   *    - 403: User lacks employee:manage permission
   *    - 404: role_id or department_id not found in organization
   *    - 409: Employee already exists or pending invitation already exists
   *    - 400: Invalid email format, invalid employment_type, expires_at in past
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IHrmPlatformEmployeeInvitation.ICreate,
  ): Promise<IHrmPlatformEmployeeInvitation> {
    try {
      return await postHrmPlatformMemberEmployeeInvitations({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieves a paginated list of employee invitations for the current organization.
   *
   * This endpoint allows users with employee:manage permission to view all pending and historical employee invitations. The list includes invitation details such as email, position, employment type, status, and timestamps. Users can filter invitations by status, department, employment type, and search by email address.
   *
   * The operation supports pagination to handle large invitation lists. Results are sorted by invitation date in descending order, showing the most recent invitations first. Soft-deleted invitations are excluded from the results.
   *
   * @param connection
   * @param body Search criteria for filtering employee invitations including email search, status filter, department filter, employment type filter, and pagination parameters.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Query hrm_platform_employee_invitations table
     *   with pagination and filtering. Apply search filters on email (partial
     *   match), status (exact match), department_id (exact match), and
     *   employment_type (exact match). Filter to current organization context
     *   using organization_id from session. Join with hrm_platform_roles to
     *   include role name in summary. Join with hrm_platform_departments to
     *   include department name in summary. Exclude soft-deleted records
     *   (deleted_at is null). Return cursor-based pagination with
     *   IPageIHrmPlatformEmployeeInvitation.ISummary response type. Sort by
     *   invited_at descending by default.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IHrmPlatformEmployeeInvitation.IRequest,
  ): Promise<IPageIHrmPlatformEmployeeInvitation.ISummary> {
    try {
      return await patchHrmPlatformMemberEmployeeInvitations({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a specific employee invitation by its unique identifier.
   *
   * This endpoint returns the complete details of a pending employee invitation including the invited email address, assigned role, optional department, position, employment type, invitation status, and timestamps for invitation, expiration, and acceptance.
   *
   * The operation requires employee:manage permission and enforces organization data isolation. Only invitations belonging to the current organization context are accessible. Invitations that have been soft-deleted are not returned.
   *
   * @param connection
   * @param invitationId Unique identifier of the employee invitation record (UUID format).
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Query hrm_platform_employee_invitations table by
     *   invitationId UUID. Verify the invitation exists and is not
     *   soft-deleted. Ensure the requesting user has employee:manage permission
     *   and the invitation belongs to the current organization context. Join
     *   with hrm_platform_roles to include role details,
     *   hrm_platform_departments for department info if department_id is set,
     *   and hrm_platform_members for inviter information. Return the complete
     *   invitation record with all fields. Handle 404 if invitation not found
     *   or user lacks permission.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":invitationId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("invitationId")
    invitationId: string & tags.Format<"uuid">,
  ): Promise<IHrmPlatformEmployeeInvitation> {
    try {
      return await getHrmPlatformMemberEmployeeInvitationsInvitationId({
        member,
        invitationId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Updates a pending employee invitation's details including role, department, position, employment type, and expiration date.
   *
   * This operation allows users with employee:manage permission to modify pending invitations before they are accepted. Only invitations with 'pending' status can be updated. Once an invitation is accepted, expired, or cancelled, it cannot be modified.
   *
   * The invited email address and organization cannot be changed. To modify these, the existing invitation must be cancelled and a new invitation created.
   *
   * Updates are validated against the organization's available roles and departments. The new expiry date must be in the future.
   *
   * @param connection
   * @param invitationId The UUID identifier of the employee invitation to update.
   * @param body Updated invitation details including role assignment, department, position title, employment type, and expiration timestamp.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Validate the invitationId exists and belongs to
     *   the current organization context. Verify the user has employee:manage
     *   permission. Check that the invitation status is 'pending' - reject if
     *   accepted, expired, or cancelled. Validate the new role_id references a
     *   valid role in the same organization. Validate the department_id (if
     *   provided) references a valid department in the same organization.
     *   Validate employment_type is one of: full-time, part-time, contractor,
     *   intern. Validate expires_at is a future timestamp. Update the
     *   invitation record with the provided fields. Set updated_at to current
     *   timestamp. Return the updated invitation object with all fields
     *   including related entity data (role name, department name).
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":invitationId")
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("invitationId")
    invitationId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmPlatformEmployeeInvitation.IUpdate,
  ): Promise<IHrmPlatformEmployeeInvitation> {
    try {
      return await putHrmPlatformMemberEmployeeInvitationsInvitationId({
        member,
        invitationId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
