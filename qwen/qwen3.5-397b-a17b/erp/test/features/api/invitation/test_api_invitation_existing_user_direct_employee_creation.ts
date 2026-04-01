import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_invitations_create } from "../../../generate/generate_random_hrm_platform_member_invitations_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { prepare_random_hrm_platform_invitation } from "../../../prepare/prepare_random_hrm_platform_invitation";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";

export async function test_api_invitation_existing_user_direct_employee_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create inviter member account (organization owner)
  const inviterConnection: api.IConnection = { host: connection.host };
  const inviter = await authorize_member_join(inviterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(inviter);
  // 2. Create organization under inviter's context
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
  // 3. Create custom role in the organization
  const role = await generate_random_hrm_platform_member_roles_create(
    inviterConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissions: ["employee:view"],
      },
    },
  );
  typia.assert(role);
  // 4. Create existing member account with specific email (the one to be invited)
  const targetEmail = typia.random<string & tags.Format<"email">>();
  const existingMember = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: targetEmail,
        password: "TestPassword123!",
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmPlatformMember.IJoin,
    },
  );
  typia.assert(existingMember);
  // 5. Send invitation to the existing member's email
  // According to the API specification, when the email already has a member account,
  // the system creates an employee record directly instead of a pending invitation.
  // The invitation status should be 'accepted' indicating immediate enrollment.
  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const invitationResult =
    await api.functional.hrmPlatform.member.invitations.create(
      inviterConnection,
      {
        body: {
          email: targetEmail,
          role_id: role.id,
          expires_at: expiresAt,
        } satisfies IHrmPlatformInvitation.ICreate,
      },
    );
  typia.assert(invitationResult);
  // 6. Verify the invitation was processed with direct employee creation
  TestValidator.equals(
    "invitation email matches",
    invitationResult.email,
    targetEmail,
  );
  TestValidator.equals(
    "invitation organization matches",
    invitationResult.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "inviter matches",
    invitationResult.invitedBy.id,
    inviter.id,
  );
  // Critical validation: When inviting existing user, the user field should be populated
  // and status should indicate acceptance (not pending)
  TestValidator.predicate(
    "user should be linked to invitation for existing member",
    invitationResult.user !== null,
  );
  if (invitationResult.user !== null) {
    TestValidator.equals(
      "linked user id matches existing member",
      invitationResult.user.id,
      existingMember.id,
    );
    TestValidator.equals(
      "linked user display name matches",
      invitationResult.user.display_name,
      existingMember.display_name,
    );
  }
  // Status should be 'accepted' since existing user doesn't need to accept invitation
  TestValidator.equals(
    "invitation status should be accepted for existing user",
    invitationResult.status,
    "accepted",
  );
}
