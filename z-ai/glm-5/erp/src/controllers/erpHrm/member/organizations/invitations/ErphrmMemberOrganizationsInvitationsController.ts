import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IErpHrmInvitation } from "../../../../../api/structures/IErpHrmInvitation";
import { IPageIErpHrmInvitation } from "../../../../../api/structures/IPageIErpHrmInvitation";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { deleteErpHrmMemberOrganizationsOrganizationIdInvitationsInvitationId } from "../../../../../providers/deleteErpHrmMemberOrganizationsOrganizationIdInvitationsInvitationId";
import { getErpHrmMemberOrganizationsOrganizationIdInvitationsInvitationId } from "../../../../../providers/getErpHrmMemberOrganizationsOrganizationIdInvitationsInvitationId";
import { patchErpHrmMemberOrganizationsOrganizationIdInvitations } from "../../../../../providers/patchErpHrmMemberOrganizationsOrganizationIdInvitations";
import { postErpHrmMemberOrganizationsOrganizationIdInvitations } from "../../../../../providers/postErpHrmMemberOrganizationsOrganizationIdInvitations";

@Controller("/erpHrm/member/organizations/:organizationId/invitations")
export class ErphrmMemberOrganizationsInvitationsController {
  /**
   * Creates a new invitation to join an organization by sending an invitation to the specified email address.
   *
   * This operation allows organization administrators with the `employee:manage` permission to invite new members to join their organization. The invitation specifies the role that will be assigned to the new employee upon acceptance. The erp_hrm_invitations table stores pending invitations with a unique constraint on organization_id and email to prevent duplicate invitations.
   *
   * When an invitation is created, the system checks if a user account already exists for the provided email address. If the user already has an account, they are immediately added to the organization as an employee with the specified role. If no account exists, a pending invitation record is created in the erp_hrm_invitations table with status 'pending'. When a new user signs up with an email address that has pending invitations, the system automatically adds them to all organizations with pending invitations for that email.
   *
   * **Authorization Requirements**: The requesting user must have the `employee:manage` permission within the organization. This permission is typically granted to users with Owner or Manager built-in roles, or to custom roles that include this permission.
   *
   * **Validation Rules**: The email must be a valid email format. The specified role must exist within the same organization. A pending invitation cannot be created if another pending invitation already exists for the same email address in the same organization (enforced by the @@unique([organization_id, email]) constraint).
   *
   * @param connection
   * @param organizationId The unique identifier of the organization to which the person is being invited. The invitation will be scoped to this organization.
   * @param body Invitation creation details including the recipient's email address and the role to assign upon acceptance
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implementation Steps:
   *
   * 1. **Authorization Check**: Verify the requesting user has `employee:manage` permission within the organization. Return 403 Forbidden if lacking permission.
   *
   * 2. **Organization Validation**: Query erp_hrm_organizations to verify the organizationId exists and is not soft-deleted (deleted_at IS NULL). Return 404 Not Found if organization doesn't exist.
   *
   * 3. **Role Validation**: Query erp_hrm_roles to verify the roleId exists, belongs to the same organization (organization_id matches path parameter), and is not soft-deleted. Return 400 Bad Request if role is invalid.
   *
   * 4. **Email Format Validation**: Validate the email address format using standard email validation. Return 400 Bad Request if format is invalid.
   *
   * 5. **Duplicate Check**: Query erp_hrm_invitations to check if a pending invitation already exists for the same organization_id + email combination with status='pending' and deleted_at IS NULL. Return 409 Conflict if duplicate exists.
   *
   * 6. **Check for Existing User**: Query erp_hrm_members to check if the email already has an account (deleted_at IS NULL).
   *    - If user exists: Query erp_hrm_employees to check if they're already a member of this organization. If not, create an employee record directly with the specified role. Return the employee record or an appropriate success response.
   *    - If user doesn't exist: Proceed to create a pending invitation.
   *
   * 7. **Create Invitation**: Insert a new record into erp_hrm_invitations with:
   *    - id: Generate new UUID
   *    - organization_id: From path parameter
   *    - role_id: From request body
   *    - email: From request body
   *    - status: 'pending'
   *    - created_at: Current timestamp
   *    - updated_at: Current timestamp
   *    - deleted_at: NULL
   *
   * 8. **Send Notification**: (Optional) Send an invitation email to the provided email address notifying them of the invitation.
   *
   * 9. **Return Response**: Return the created invitation object with all fields populated.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmInvitation.ICreate,
  ): Promise<IErpHrmInvitation> {
    try {
      return await postErpHrmMemberOrganizationsOrganizationIdInvitations({
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
   * Retrieve a filtered and paginated list of invitations within a specific organization.
   *
   * This operation allows authorized users to browse all invitations sent for their organization, including pending invitations awaiting user registration, accepted invitations that resulted in new employee records, and cancelled invitations that were revoked by administrators.
   *
   * The erp_hrm_invitations table tracks each invitation with the target email address, assigned role, and current status. Each invitation establishes a connection between an email address and an organization, enabling automatic organization membership when users sign up with invited email addresses.
   *
   * Filtering capabilities include status-based filtering (pending, accepted, cancelled), partial email matching for locating specific invitees, and role-based filtering. The response provides paginated results optimized for list displays, with each invitation summary containing essential information for managing the invitation lifecycle.
   *
   * Authorization requires either the employee:manage permission (for users who can send and cancel invitations) or employee:view permission (for read-only access to the invitation list). Users without these permissions cannot access organization invitation records.
   *
   * @param connection
   * @param organizationId Target organization's unique identifier (UUID)
   * @param body Search criteria and pagination parameters for filtering invitations
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Query erp_hrm_invitations table with organization_id matching path parameter. Apply filters:
   * - Filter by status if provided in request body (pending, accepted, cancelled)
   * - Search by email with partial match if provided
   * - Filter by role_id if provided
   *
   * Exclude soft-deleted records (deleted_at IS NULL).
   *
   * Implement cursor-based pagination with configurable page size.
   * Join with erp_hrm_roles to include role name in summary.
   * Join with erp_hrm_organizations to verify organization exists.
   *
   * Verify caller has employee:manage or employee:view permission within the organization.
   * Return paginated results with invitation summaries including: id, email, status, role name, created_at.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmInvitation.IRequest,
  ): Promise<IPageIErpHrmInvitation.ISummary> {
    try {
      return await patchErpHrmMemberOrganizationsOrganizationIdInvitations({
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
   * Retrieve detailed information about a specific invitation to join an organization.
   *
   * This endpoint allows authenticated members to view the details of an invitation within their organization. The response includes the invited email address, the role that will be assigned upon acceptance, and the current status of the invitation.
   *
   * Access is restricted to members who belong to the specified organization. Users with employee management permissions typically use this endpoint to track invitation status and verify invitation details before taking further actions.
   *
   * The invitation status indicates where the invitation is in its lifecycle: 'pending' means awaiting user registration, 'accepted' means the user has joined the organization, and 'cancelled' means the invitation was revoked by an authorized user.
   *
   * @param connection
   * @param organizationId The unique identifier of the organization to which the invitation belongs (UUID format). The authenticated member must belong to this organization to access the invitation.
   * @param invitationId The unique identifier of the invitation to retrieve (UUID format). Must correspond to an invitation belonging to the specified organization.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Query erp_hrm_invitations table by id with organization_id filter for data isolation. Join with erp_hrm_organizations to verify organization exists and is accessible. Join with erp_hrm_roles to include role details (role name, is_builtin status). Validate that the authenticated member belongs to the organization through erp_hrm_employees table. Return 404 if invitation not found or if invitation belongs to different organization. Include soft-deleted invitations check (deleted_at IS NULL). Response includes invitation fields: id, email, status, created_at, updated_at, plus related organization and role information.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":invitationId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedParam("invitationId")
    invitationId: string & tags.Format<"uuid">,
  ): Promise<IErpHrmInvitation> {
    try {
      return await getErpHrmMemberOrganizationsOrganizationIdInvitationsInvitationId(
        {
          member,
          organizationId,
          invitationId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Cancel a pending invitation to join an organization.
   *
   * This operation allows authorized users with employee:manage permission to revoke a pending invitation before the invited user accepts it. Once cancelled, the invitation can no longer be used - if the invited user later signs up with the matching email address, they will not be automatically added to the organization.
   *
   * The invitation record is soft-deleted by setting its status to 'cancelled' and recording the deletion timestamp. This maintains an audit trail of all invitation activities within the organization.
   *
   * Authorization: Only users with the 'employee:manage' permission can cancel invitations. This typically includes organization owners and managers.
   *
   * The operation returns the cancelled invitation record, including the updated status and deletion timestamp, providing confirmation that the cancellation was successful.
   *
   * @param connection
   * @param organizationId Unique identifier of the organization that owns the invitation
   * @param invitationId Unique identifier of the invitation to cancel
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implementation steps:
   *
   * 1. Validate path parameters (organizationId, invitationId as UUIDs)
   * 2. Verify the authenticated user has employee:manage permission in the specified organization
   * 3. Query the invitation by ID and verify it belongs to the specified organization
   * 4. Check invitation exists and has not been already cancelled or accepted
   * 5. Update invitation: set status to 'cancelled', set deleted_at to current timestamp
   * 6. Return the updated invitation record
   *
   * Authorization: Requires employee:manage permission
   *
   * Business rules:
   * - Cannot cancel an already accepted invitation
   * - Cannot cancel an already cancelled invitation
   * - Invitation must belong to the organization in the path
   *
   * Database operations:
   * - SELECT invitation by id and organization_id
   * - UPDATE invitation SET status = 'cancelled', deleted_at = NOW(), updated_at = NOW'
   *
   * Edge cases:
   * - 404 if invitation not found in organization
   * - 403 if user lacks employee:manage permission
   * - 400 if invitation already cancelled or accepted
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":invitationId")
  public async erase(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedParam("invitationId")
    invitationId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteErpHrmMemberOrganizationsOrganizationIdInvitationsInvitationId(
        {
          member,
          organizationId,
          invitationId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
