import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
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
import { generate_random_reddit_platform_user_communities_create } from "../../../generate/generate_random_reddit_platform_user_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_moderator_ban_removal_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IRedditPlatformModerator.IJoin,
  });
  typia.assert(moderatorAuth);
  // Create new connection with moderator token
  const moderatorAuthConnection: api.IConnection = { host: connection.host };
  moderatorAuthConnection.headers = {
    Authorization: moderatorAuth.token.access,
  };
  // 2. Create a community as moderator (to ensure we have a valid community)
  const community = await api.functional.redditPlatform.user.communities.create(
    moderatorAuthConnection,
    {
      body: {
        name: `test-community-${RandomGenerator.alphaNumeric(6)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_url: null,
      } satisfies IRedditPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Attempt to delete a non-existent ban (should return 404)
  const randomCommunityId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentBanId = "00000000-0000-0000-0000-000000000000";
  await TestValidator.error("ban not found", async () => {
    await api.functional.redditPlatform.moderator.communities.bans.erase(
      moderatorAuthConnection,
      {
        communityId: randomCommunityId,
        banId: nonExistentBanId,
      },
    );
  });
}
