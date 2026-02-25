import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityInvitation";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_communities_invitations_create } from "../../../generate/generate_random_community_platform_admin_communities_invitations_create";
import { prepare_random_community_platform_community_invitation } from "../../../prepare/prepare_random_community_platform_community_invitation";

export async function test_api_community_invitation_admin_creates_duplicate(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create community - since we don't have community creation endpoint,
  // we'll simulate by using the invitation creation which requires a valid community
  // This tests the actual business logic constraint
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create first invitation successfully
  const inviteeId = typia.random<string & tags.Format<"uuid">>();
  const firstInvitation =
    await generate_random_community_platform_admin_communities_invitations_create(
      adminConnection,
      {
        params: { communityId: communityId },
        body: {
          invitee_id: inviteeId,
          message: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(firstInvitation);
  // 4. Attempt to create duplicate invitation
  await TestValidator.error(
    "duplicate invitation creation should fail",
    async () => {
      await generate_random_community_platform_admin_communities_invitations_create(
        adminConnection,
        {
          params: { communityId: communityId },
          body: {
            invitee_id: inviteeId,
            message: RandomGenerator.paragraph({ sentences: 1 }),
          },
        },
      );
    },
  );
  // 5. Validate invitation status and uniqueness constraint
  TestValidator.equals(
    "first invitation status",
    firstInvitation.status,
    "pending",
  );
  TestValidator.equals(
    "invitee matches",
    firstInvitation.invitee.id,
    inviteeId,
  );
  TestValidator.equals(
    "community matches",
    firstInvitation.community.id,
    communityId,
  );
}
