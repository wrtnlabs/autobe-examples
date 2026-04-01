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
 * Test successful deletion of a pending employee invitation.
 *
 * Scenario: A member with employee:manage permission creates an organization,
 * creates a custom role with employee:manage permission, sends an invitation
 * to a new email address (creating a pending invitation), then deletes that
 * pending invitation. Validate that the invitation is successfully deactivated
 * and the invited email address can receive a new invitation afterward.
 */
export async function test_api_invitation_deletion_pending_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins and authenticates
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create custom role with employee:manage permission
  const role = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        permissions: ["employee:manage"],
      },
    },
  );
  typia.assert(role);
  // 4. Create pending invitation
  const invitedEmail = typia.random<string & tags.Format<"email">>();
  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const invitation =
    await generate_random_hrm_platform_member_invitations_create(
      memberConnection,
      {
        body: {
          email: invitedEmail,
          role_id: role.id,
          expires_at: expiresAt,
        },
      },
    );
  typia.assert(invitation);
  // Validate invitation is pending
  TestValidator.equals("invitation status", invitation.status, "pending");
  TestValidator.equals("invitation email", invitation.email, invitedEmail);
  // 5. Delete the pending invitation
  await api.functional.hrmPlatform.member.invitations.erase(memberConnection, {
    invitationId: invitation.id,
  });
  // 6. Validate email can receive new invitation after deletion
  const newExpiresAt = new Date(
    Date.now() + 14 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const newInvitation =
    await generate_random_hrm_platform_member_invitations_create(
      memberConnection,
      {
        body: {
          email: invitedEmail,
          role_id: role.id,
          expires_at: newExpiresAt,
        },
      },
    );
  typia.assert(newInvitation);
  TestValidator.equals(
    "new invitation email",
    newInvitation.email,
    invitedEmail,
  );
  TestValidator.notEquals(
    "new invitation has different id",
    newInvitation.id,
    invitation.id,
  );
}