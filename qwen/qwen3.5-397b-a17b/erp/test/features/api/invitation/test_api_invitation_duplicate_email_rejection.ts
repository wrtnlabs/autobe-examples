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

/**
 * Test duplicate email invitation rejection within the same organization.
 *
 * This test validates that the system prevents sending multiple pending invitations
 * to the same email address within a single organization. The workflow:
 * 1. Member joins and creates an organization
 * 2. Member creates a custom role for invitation assignment
 * 3. Member sends first invitation to an email address (should succeed)
 * 4. Member attempts to send second invitation to the same email (should fail with conflict)
 *
 * This enforces the unique constraint on [organization_id, email] for pending invitations.
 */
export async function test_api_invitation_duplicate_email_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create custom role for invitation
  const role = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        permissions: ["employee:view"],
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(role);
  // 4. Prepare invitation email (will be reused for duplicate test)
  const invitationEmail = typia.random<string & tags.Format<"email">>();
  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // 5. Send first invitation (should succeed)
  const firstInvitation =
    await generate_random_hrm_platform_member_invitations_create(
      memberConnection,
      {
        body: {
          email: invitationEmail,
          role_id: role.id,
          expires_at: expiresAt,
        } satisfies IHrmPlatformInvitation.ICreate,
      },
    );
  typia.assert(firstInvitation);
  // 6. Validate first invitation details
  TestValidator.equals(
    "invitation email matches",
    firstInvitation.email,
    invitationEmail,
  );
  TestValidator.equals(
    "invitation organization matches",
    firstInvitation.organization.id,
    organization.id,
  );
  TestValidator.predicate(
    "invitation status is pending",
    firstInvitation.status === "pending",
  );
  // 7. Attempt duplicate invitation to same email (should fail with conflict error)
  await TestValidator.error("duplicate email invitation rejected", async () => {
    await generate_random_hrm_platform_member_invitations_create(
      memberConnection,
      {
        body: {
          email: invitationEmail,
          role_id: role.id,
          expires_at: expiresAt,
        } satisfies IHrmPlatformInvitation.ICreate,
      },
    );
  });
}
