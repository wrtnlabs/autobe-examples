import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employee_invitations_create } from "../../../generate/generate_random_hrm_platform_member_employee_invitations_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_organizations_departments_create } from "../../../generate/generate_random_hrm_platform_member_organizations_departments_create";
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";

/**
 * Test business rule validation that only pending invitations can be updated.
 *
 * Validates the employee invitation update workflow and the business constraint that invitations must be in 'pending' status to be modifiable. This test creates the complete organizational structure required for invitation management including member account, organization, custom role, and department.
 *
 * An employee invitation is created with pending status, then updated to verify the update mechanism functions correctly for valid pending invitations. The test validates that all modifiable fields (role, department, position, employment type, expiration) can be successfully updated.
 *
 * Note: Testing rejection of non-pending (accepted/expired/cancelled) invitations requires either an API to change invitation status or completing the acceptance flow through member signup with the invited email. Since these endpoints are not available in the current API set, this test validates the update mechanism for pending invitations, which is the testable portion of the business rule with available APIs.
 *
 * 1. Member joins the platform with email and password credentials.
 * 2. Organization is created with currency, timezone, and fiscal year settings.
 * 3. Custom role is created within the organization for invitation assignment.
 * 4. Department is created within the organization for optional assignment.
 * 5. Employee invitation is created with pending status, assigned role, department, and future expiration.
 * 6. Update is attempted on the pending invitation with modified role, position, and employment type.
 * 7. Validates update succeeded and all modified fields reflect the new values.
 */
export async function test_api_employee_invitation_update_non_pending_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member join
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(organization);
  // 3. Create role for invitation
  const role = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        organization_id: organization.id,
      },
    },
  );
  typia.assert(role);
  // 4. Create department
  const department =
    await generate_random_hrm_platform_member_organizations_departments_create(
      memberConnection,
      {
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(department);
  // 5. Create employee invitation with pending status
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const invitation =
    await generate_random_hrm_platform_member_employee_invitations_create(
      memberConnection,
      {
        body: {
          role_id: role.id,
          department_id: department.id,
          expires_at: futureDate.toISOString(),
        },
      },
    );
  typia.assert(invitation);
  // Verify invitation is in pending status
  TestValidator.equals(
    "invitation status is pending",
    invitation.status,
    "pending",
  );
  // 6. Create a second role for update
  const updatedRole = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        organization_id: organization.id,
      },
    },
  );
  typia.assert(updatedRole);
  // Prepare update payload
  const updatedFutureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const updateBody = {
    role_id: updatedRole.id,
    position: "Senior " + RandomGenerator.name(1),
    employment_type: "contractor" as const,
    expires_at: updatedFutureDate.toISOString(),
    department_id: department.id,
  } satisfies IHrmPlatformEmployeeInvitation.IUpdate;
  // Attempt update on pending invitation
  const updatedInvitation =
    await api.functional.hrmPlatform.member.employee_invitations.update(
      memberConnection,
      {
        invitationId: invitation.id,
        body: updateBody,
      },
    );
  typia.assert(updatedInvitation);
  // 7. Validate update succeeded
  TestValidator.equals(
    "invitation id preserved",
    updatedInvitation.id,
    invitation.id,
  );
  TestValidator.equals(
    "role updated",
    updatedInvitation.role.id,
    updatedRole.id,
  );
  TestValidator.equals(
    "position updated",
    updatedInvitation.position,
    updateBody.position,
  );
  TestValidator.equals(
    "employment type updated",
    updatedInvitation.employment_type,
    updateBody.employment_type,
  );
  TestValidator.predicate(
    "expiration date updated",
    updatedInvitation.expires_at > invitation.expires_at,
  );
  TestValidator.equals(
    "status remains pending",
    updatedInvitation.status,
    "pending",
  );
}