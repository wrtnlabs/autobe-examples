import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBan";
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
import { generate_random_reddit_platform_moderator_communities_bans_create } from "../../../generate/generate_random_reddit_platform_moderator_communities_bans_create";
import { generate_random_reddit_platform_user_communities_create } from "../../../generate/generate_random_reddit_platform_user_communities_create";
import { prepare_random_reddit_platform_ban } from "../../../prepare/prepare_random_reddit_platform_ban";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_moderator_ban_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register moderator and create moderator-specific connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  typia.assert(moderatorAuth);
  // 2. Register a regular user and create user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {},
  });
  typia.assert(userAuth);
  // 3. Create a community as moderator
  const community =
    await generate_random_reddit_platform_user_communities_create(
      moderatorConnection,
      {
        body: {},
      },
    );
  typia.assert(community);
  // 4. Ban the user from the community
  const ban =
    await generate_random_reddit_platform_moderator_communities_bans_create(
      moderatorConnection,
      {
        params: {
          communityId: (community as IRedditPlatformCommunity & IEntity).id,
        },
        body: {},
      },
    );
  typia.assert(ban);
  // 5. Retrieve the ban using banId
  const retrievedBan = await api.functional.redditPlatform.moderator.bans.at(
    moderatorConnection,
    {
      banId: (ban as IRedditPlatformBan & IEntity).id,
    },
  );
  typia.assert(retrievedBan);
}
