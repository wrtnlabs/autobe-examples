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

export async function test_api_invitation_deletion_already_accepted_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create inviter (organization owner) account
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
  // 2. Create invitee (existing user) account - this simulates a user that already exists
  const inviteeConnection: api.IConnection = { host: connection.host };
  const inviteeEmail = typia.random<string & tags.Format<"email">>();
  const invitee = await authorize_member_join(inviteeConnection, {
    body: {
      email: inviteeEmail,
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(invitee);
  // 3. Create organization (inviter becomes owner)
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      inviterConnection,
      {},
    );
  typia.assert(organization);
  // 4. Create role for invitation assignment
  const role =
    await generate_random_hrm_platform_member_roles_create(inviterConnection, {});
  typia.assert(role);
  // 5. Create invitation to existing user's email - this should immediately accept and create employee record
  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const invitation =
    await generate_random_hrm_platform_member_invitations_create(
      inviterConnection,
      {
        body: {
          email: inviteeEmail,
          role_id: role.id,
          expires_at: expiresAt,
        } satisfies IHrmPlatformInvitation.ICreate,
      },
    );
  typia.assert(invitation);
  // 6. Validate that the invitation was accepted (status should be 'accepted' since user already exists)
  TestValidator.equals(
    "invitation status should be accepted for existing user",
    invitation.status,
    "accepted",
  );
  TestValidator.predicate(
    "invitation should have accepted_at timestamp",
    invitation.accepted_at !== null,
  );
  // 7. Attempt to delete the accepted invitation - should fail with 409 Conflict
  await TestValidator.error(
    "deleting accepted invitation should fail with conflict error",
    async () => {
      await api.functional.hrmPlatform.member.invitations.erase(
        inviterConnection,
        {
          invitationId: invitation.id,
        },
      );
    },
  );
}