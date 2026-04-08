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
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";

/**
 * Test employee invitation creation for new user with pending status.
 *
 * Validates the complete employee invitation workflow where a member with employee:manage permission invites a new employee by sending an invitation to an email address that does not have an existing user account in the platform. The invitation should be created with status 'pending' and all specified attributes correctly stored.
 *
 * This test ensures that when inviting a user without an existing account, the system creates a pending invitation record rather than immediately adding an employee. The invitation remains pending until the user signs up with the invited email address.
 *
 * 1. Member account is created and authenticated via /hrmPlatform/auth/member/join.
 * 2. Organization is created via /hrmPlatform/member/organizations.
 * 3. Custom role is created via /hrmPlatform/member/roles for assignment.
 * 4. Employee invitation is created via /hrmPlatform/member/employee-invitations with unique email.
 * 5. Validates invitation response contains correct status, email, role, employment_type, and timestamps.
 * 6. Validates invitation organization and invitedBy references are correct.
 */
export async function test_api_employee_invitation_new_user_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const invitedEmail = typia.random<string & tags.Format<"email">>();
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create custom role in the organization
  const role = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        organization_id: organization.id,
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(role);
  // 4. Create employee invitation for new user (email without existing account)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  const expiresAtIso = expiresAt.toISOString();
  const position = RandomGenerator.name();
  const invitation =
    await api.functional.hrmPlatform.member.employee_invitations.create(
      memberConnection,
      {
        body: {
          email: invitedEmail,
          role_id: role.id,
          employment_type: "full-time",
          expires_at: expiresAtIso,
          position: position,
        } satisfies IHrmPlatformEmployeeInvitation.ICreate,
      },
    );
  typia.assert(invitation);
  // 5. Validate invitation response
  TestValidator.equals(
    "invitation status is pending",
    invitation.status,
    "pending",
  );
  TestValidator.equals(
    "invitation email matches",
    invitation.email,
    invitedEmail,
  );
  TestValidator.equals("invitation role matches", invitation.role.id, role.id);
  TestValidator.equals(
    "invitation employment_type matches",
    invitation.employment_type,
    "full-time",
  );
  TestValidator.equals(
    "invitation expires_at matches",
    invitation.expires_at,
    expiresAtIso,
  );
  TestValidator.predicate(
    "invitation invited_at is set",
    invitation.invited_at !== null,
  );
  TestValidator.equals(
    "invitation accepted_at is null",
    invitation.accepted_at,
    null,
  );
  TestValidator.equals(
    "invitation organization matches",
    invitation.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "invitation invitedBy matches",
    invitation.invitedBy.id,
    member.id,
  );
  TestValidator.equals(
    "invitation position matches",
    invitation.position,
    position,
  );
}
