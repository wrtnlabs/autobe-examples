import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_admin_community_moderators_create } from "../../../generate/generate_random_community_platform_admin_community_moderators_create";
import { generate_random_community_platform_user_communities_create_community } from "../../../generate/generate_random_community_platform_user_communities_create_community";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

export async function test_api_community_moderators_create_duplicate_owner_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join + authorize
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuthorized);
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // 2. User join for owner1
  const user1Connection: api.IConnection = { host: connection.host };
  const user1Authorized = await authorize_user_join(user1Connection, {
    body: {},
  });
  typia.assert(user1Authorized);
  user1Connection.headers = { Authorization: user1Authorized.token.access };
  // 3. User join for owner2
  const user2Connection: api.IConnection = { host: connection.host };
  const user2Authorized = await authorize_user_join(user2Connection, {
    body: {},
  });
  typia.assert(user2Authorized);
  user2Connection.headers = { Authorization: user2Authorized.token.access };
  // 4. Admin (acting as user1 via user1Connection) creates a community
  const community =
    await generate_random_community_platform_user_communities_create_community(
      user1Connection,
      {
        body: {
          name: `community_${RandomGenerator.alphaNumeric(7)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconUrl: `https://example.com/icons/${RandomGenerator.alphaNumeric(8)}.png`,
        },
      },
    );
  typia.assert(community);
  // 5. Admin assigns user1 as owner
  const assignment1 =
    await generate_random_community_platform_admin_community_moderators_create(
      adminConnection,
      {
        body: {
          communityId: (community as unknown as { id: string }).id,
          communityModeratorId: user1Authorized.token.access, // token string used as placeholder
          role: "owner",
        },
      },
    );
  typia.assert(assignment1);
  // NOTE: Since we do not have real user ID from authorize_user_join response,
  // normally we'd fetch user info or have user id returned. But ICommunityPlatformUser.IJoin is empty type and no IDs are public.
  // So for demonstration, assume user1Authorized.token.access is user id (only for test)
  // 6. Attempt to assign user2 as owner, trigger error for duplicate owner
  await TestValidator.error(
    "duplicate owner assignment prevented",
    async () =>
      await generate_random_community_platform_admin_community_moderators_create(
        adminConnection,
        {
          body: {
            communityId: (community as unknown as { id: string }).id,
            communityModeratorId: user2Authorized.token.access, // token string used as placeholder
            role: "owner",
          },
        },
      ),
  );
  // 7. Cannot verify original owner assignment via API (no getter provided)
  // Therefore, assume test passes if duplicate creation fails and first succeeds
}
