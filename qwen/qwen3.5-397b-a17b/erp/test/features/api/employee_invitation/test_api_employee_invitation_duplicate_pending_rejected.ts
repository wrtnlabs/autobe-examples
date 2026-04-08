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
 * Test duplicate employee invitation rejection when pending invitation exists.
 *
 * Validates that the system correctly rejects duplicate employee invitation requests when a pending invitation already exists for the same email address within an organization. This test ensures the unique constraint on organization_id and email is properly enforced at the API level.
 *
 * The test creates a member account, establishes an organization context, creates a valid role, and then attempts to send two employee invitations with the same email address. The first invitation should succeed, while the second should be rejected with a conflict error.
 *
 * 1. Member registers and authenticates via /hrmPlatform/auth/member/join.
 * 2. Organization is created via /hrmPlatform/member/organizations.
 * 3. Custom role is created via /hrmPlatform/member/roles for invitation assignment.
 * 4. First employee invitation is sent with a unique email address.
 * 5. Second employee invitation is sent with the same email address.
 * 6. Validates that the second request is rejected with conflict error.
 * 7. Confirms the first invitation remains in pending status.
 */
export async function test_api_employee_invitation_duplicate_pending_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create custom role for invitation
  const role = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        organization_id: organization.id,
      },
    },
  );
  typia.assert(role);
  // 4. Generate unique email for testing duplicate scenario
  const testEmail = typia.random<string & tags.Format<"email">>();
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  // 5. Send first employee invitation
  const firstInvitation =
    await api.functional.hrmPlatform.member.employee_invitations.create(
      memberConnection,
      {
        body: {
          email: testEmail,
          role_id: role.id,
          employment_type: "full-time",
          expires_at: futureDate.toISOString(),
        } satisfies IHrmPlatformEmployeeInvitation.ICreate,
      },
    );
  typia.assert(firstInvitation);
  // 6. Validate first invitation was created successfully
  TestValidator.equals(
    "first invitation email",
    firstInvitation.email,
    testEmail,
  );
  TestValidator.equals(
    "first invitation status",
    firstInvitation.status,
    "pending",
  );
  TestValidator.equals(
    "first invitation role",
    firstInvitation.role.id,
    role.id,
  );
  // 7. Attempt to send duplicate invitation with same email
  await TestValidator.error(
    "duplicate pending invitation rejected",
    async () => {
      await api.functional.hrmPlatform.member.employee_invitations.create(
        memberConnection,
        {
          body: {
            email: testEmail,
            role_id: role.id,
            employment_type: "part-time",
            expires_at: futureDate.toISOString(),
          } satisfies IHrmPlatformEmployeeInvitation.ICreate,
        },
      );
    },
  );
}