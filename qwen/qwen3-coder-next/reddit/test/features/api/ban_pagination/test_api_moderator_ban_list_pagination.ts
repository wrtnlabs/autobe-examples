import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformBan";
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

export async function test_api_moderator_ban_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create moderator and user actors
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: typia.random<IRedditPlatformModerator.IJoin>(),
  });
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: typia.random<IRedditPlatformUser.IJoin>(),
  });
  // 2. Create a community where moderator has authority
  const community = await api.functional.redditPlatform.user.communities.create(
    moderatorConnection,
    {
      body: typia.random<IRedditPlatformCommunity.ICreate>(),
    },
  );
  typia.assert(community);
  // 3. Create multiple banned users for pagination testing
  const banCount = 25;
  const bannedUsers: IRedditPlatformBan[] = [];
  for (let i = 0; i < banCount; i++) {
    const bannedUser =
      await api.functional.redditPlatform.moderator.communities.bans.create(
        moderatorConnection,
        {
          communityId: (community as any).id,
          body: typia.random<IRedditPlatformBan.ICreate>(),
        },
      );
    typia.assert(bannedUser);
    bannedUsers.push(bannedUser);
  }
  // 4. Test pagination with limit parameter
  const limit = 10;
  const page1 =
    await api.functional.redditPlatform.moderator.communities.bans.patchByCommunityid(
      moderatorConnection,
      {
        communityId: (community as any).id,
      },
    );
  typia.assert(page1);
  // 5. Validate pagination structure
  TestValidator.equals(
    "pagination limit matches",
    page1.pagination.limit,
    limit,
  );
  TestValidator.equals("current page is 1", page1.pagination.current, 1);
  TestValidator.equals(
    "total records count",
    page1.pagination.records,
    banCount,
  );
  TestValidator.equals(
    "total pages calculation",
    page1.pagination.pages,
    Math.ceil(banCount / limit),
  );
  TestValidator.equals("first page data count", page1.data.length, limit);
  // 6. Verify data contains expected number of bans
  TestValidator.predicate("has banned users", page1.data.length > 0);
}
