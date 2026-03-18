import { TypedBody, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia from "typia";

import { IHrmPlatformEmployee } from "../../../../api/structures/IHrmPlatformEmployee";
import { MemberAuth } from "../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../decorators/payload/MemberPayload";
import { postHrmPlatformMemberInvitations } from "../../../../providers/postHrmPlatformMemberInvitations";

@Controller("/hrmPlatform/member/invitations")
export class HrmplatformMemberInvitationsController {
  /**
   * Create an employee invitation or immediately add an existing member as an employee to the organization.
   *
   * This operation allows users with employee:manage permission to invite individuals to join the organization as employees by providing their email address and employment details. The system queries the hrm_platform_members table to determine if the invited email address already has a registered member account. If an account exists, the user is immediately added to the organization as an employee record in the hrm_platform_employees table with the specified role (hrm_platform_roles), department (hrm_platform_departments), position, employment type, and active status. If no member account exists, a pending invitation is created and stored until the user registers with the matching email address.
   *
   * The hrm_platform_employees table stores core employee records linking users to organizations with role assignment, department, position, employment type (full-time, part-time, contractor, or intern), and employment status (active or deactivated). Each employee record includes soft-delete support via the deleted_at field for data preservation while maintaining referential integrity. When a pending invitation is created, the system records the inviting user, target email address, organization, and all employment details for audit purposes in the activity log.
   *
   * Activity log entries are created for all invitation events per the hrm_platform_activity_logs schema, recording who sent the invitation and the email address of the invited person. This provides accountability and historical tracking for compliance and audit purposes. The operation validates email format (RFC 5322), verifies the inviting user has employee:manage permission, and ensures the target email is not already associated with an active employee record or has a pending invitation in the organization.
   *
   * Related operations include `PATCH /employees` for listing employees with search filters, `GET /employees/{employeeId}` for retrieving individual employee details, and `PUT /employees/{employeeId}` for updating employee information such as role, department, or employment status.
   *
   * @param connection
   * @param body Employee invitation request containing email address and optional employment details including role, department, position, and employment type
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1. Validate member actor authentication and organization context from request headers.
   * 2. Verify user has employee:manage permission for the organization.
   * 3. Validate request body: email format (RFC 5322), roleId exists and belongs to organization, departmentId exists and belongs to organization (if provided), employmentType is one of 'full-time'|'part-time'|'contractor'|'intern'.
   * 4. Query hrm_platform_members table by email to check if user already exists.
   * 5. IF user exists:
   *    a. Check hrm_platform_employees for existing employee record with same hrm_platform_organization_id and hrm_platform_user_id (unique constraint).
   *    b. IF employee exists: return 409 Conflict with 'Employee already exists' error.
   *    c. IF pending invitation exists for this email and organization: return 409 Conflict with 'Pending invitation exists' error.
   *    d. Create new hrm_platform_employee record with provided role, department, position, employmentType, status='active'.
   *    e. Create activity log entry for employee invitation.
   *    f. Return 201 Created with IHrmPlatformEmployee response.
   * 6. IF user does not exist:
   *    a. Check hrm_platform_employees for existing employee with same email (via member join) - should not happen since member doesn't exist.
   *    b. Check for existing pending invitation for this email and organization (if invitation table exists, otherwise track via employee with pending status).
   *    c. IF pending invitation exists: return 409 Conflict with 'Pending invitation exists' error.
   *    d. Create pending invitation record (implementation-specific: separate table or employee with pending status).
   *    e. Create activity log entry for employee invitation.
   *    f. Return 202 Accepted with invitation details.
   * 7. Handle database transaction failures with appropriate rollback and error responses.
   * 8. Emit real-time event for invitation creation to users with employee:view permission.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IHrmPlatformEmployee.ICreate,
  ): Promise<IHrmPlatformEmployee> {
    try {
      return await postHrmPlatformMemberInvitations({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
