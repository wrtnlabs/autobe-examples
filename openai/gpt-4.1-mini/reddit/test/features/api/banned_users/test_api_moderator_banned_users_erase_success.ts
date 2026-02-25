import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedUser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_moderator_banned_users_create_banned_user } from "../../../generate/generate_random_community_platform_moderator_banned_users_create_banned_user";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_banned_user } from "../../../prepare/prepare_random_community_platform_banned_user";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_moderator_banned_users_erase_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator registration and authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinOutput = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<string>(),
        displayName: `mod_${RandomGenerator.name(1)}`,
        bio: null,
        avatarUrl: null,
      },
    },
  );
  typia.assert(moderatorJoinOutput);
  // 2. User registration and authentication
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinOutput = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "secret123",
      username: typia.random<string>(),
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(userJoinOutput);
  // 3. Create a community using the user actor
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: `community_${RandomGenerator.alphabets(5)}`,
          description: RandomGenerator.paragraph({ sentences: 5 }),
          iconUrl: `https://example.com/icon/${RandomGenerator.alphabets(5)}.png`,
        },
      },
    );
  typia.assert(community);
  // 4. Moderator bans the user in the community
  const bannedUser =
    await generate_random_community_platform_moderator_banned_users_create_banned_user(
      moderatorConnection,
      {
        body: {
          community_platform_user_id: userJoinOutput.id,
          community_platform_community_id: community.id,
          banned_at: new Date().toISOString(),
          reason: `Banned for testing - ${RandomGenerator.paragraph({ sentences: 2 })}`,
          unbanned_at: null,
        },
      },
    );
  typia.assert(bannedUser);
  // 5. Delete the banned user record by ID
  await api.functional.communityPlatform.moderator.banned_users.eraseBannedUser(
    moderatorConnection,
    { id: bannedUser.id },
  );
  // 6. Verify the banned user record no longer exists
  // Since there's no specific GET banned user API, this test assumes
  // that trying to delete again returns 404 or no record found error
  await TestValidator.error(
    "deleting already deleted banned user should fail",
    async () => {
      await api.functional.communityPlatform.moderator.banned_users.eraseBannedUser(
        moderatorConnection,
        { id: bannedUser.id },
      );
    },
  );
}
