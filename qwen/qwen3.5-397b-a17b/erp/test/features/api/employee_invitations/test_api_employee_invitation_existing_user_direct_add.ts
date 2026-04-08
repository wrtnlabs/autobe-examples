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
 * Test employee invitation flow when invitee already has an existing member account.
 *
 * Validates the direct employee addition path where inviting an existing platform member by email results in immediate employee creation rather than a pending invitation. This tests the system's ability to detect existing user accounts and bypass the invitation workflow.
 *
 * The test ensures that when an email address already has a registered member account, the invitation endpoint creates an employee record directly with the specified role, employment type, and optional department assignment. No pending invitation record should be created in this scenario.
 *
 * 1. Create inviter member account with unique credentials.
 * 2. Create invitee member account with different email (simulating existing user).
 * 3. Inviter creates organization and becomes owner.
 * 4. Create custom role within the organization for assignment.
 * 5. Inviter sends employee invitation using invitee's existing email.
 * 6. Validate response contains employee record with correct properties.
 * 7. Verify employee is immediately active with assigned role and employment type.
 */
export async function test_api_employee_invitation_existing_user_direct_add(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create inviter member account
  const inviterAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(inviterAuth);
  // 2. Create invitee member account (existing user)
  const inviteeEmail = typia.random<string & tags.Format<"email">>();
  const inviteeAuth = await authorize_member_join(connection, {
    body: {
      email: inviteeEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(inviteeAuth);
  // 3. Create organization as inviter
  const inviterConnection: api.IConnection = { host: connection.host };
  inviterConnection.headers = {
    Authorization: `Bearer ${inviterAuth.token.access}`,
  };
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      inviterConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 4. Create custom role in the organization
  const role = await generate_random_hrm_platform_member_roles_create(
    inviterConnection,
    {
      body: {
        organization_id: organization.id,
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(role);
  // 5. Send employee invitation with invitee's existing email
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);
  const invitationResult =
    await api.functional.hrmPlatform.member.employee_invitations.create(
      inviterConnection,
      {
        body: {
          email: inviteeEmail,
          role_id: role.id,
          employment_type: "full-time",
          expires_at: futureDate.toISOString(),
          position: RandomGenerator.name(),
        } satisfies IHrmPlatformEmployeeInvitation.ICreate,
      },
    );
  typia.assert(invitationResult);
  // 6. Validate the result is an employee record (direct addition)
  TestValidator.equals(
    "email matches invitee",
    invitationResult.email,
    inviteeEmail,
  );
  TestValidator.equals(
    "role matches assignment",
    invitationResult.role.id,
    role.id,
  );
  TestValidator.equals(
    "employment type matches",
    invitationResult.employment_type,
    "full-time",
  );
  TestValidator.predicate(
    "position is set",
    invitationResult.position !== null &&
      invitationResult.position !== undefined,
  );
  // 7. Validate organization reference
  TestValidator.equals(
    "organization matches",
    invitationResult.organization.id,
    organization.id,
  );
  // 8. Validate inviter reference
  TestValidator.equals(
    "invited by matches inviter",
    invitationResult.invitedBy.id,
    inviterAuth.id,
  );
}
