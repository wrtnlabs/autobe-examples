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
import { generate_random_reddit_platform_user_communities_create } from "../../../generate/generate_random_reddit_platform_user_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_moderator_banned_users_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create a community as a regular user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: typia.random<IRedditPlatformUser.IJoin>(),
  });
  const community = await api.functional.redditPlatform.user.communities.create(
    userConnection,
    {
      body: typia.random<IRedditPlatformCommunity.ICreate>(),
    },
  );
  typia.assert(community);
  // 2. Setup: Register and login as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: typia.random<IRedditPlatformModerator.IJoin>(),
  });
  // 3. Action: Moderator retrieves banned users list from community
  // Use a random UUID for communityId since IRedditPlatformCommunity has no id property in the provided DTO definition
  const bannedUsers =
    await api.functional.redditPlatform.moderator.communities.banned_users.index(
      moderatorConnection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(bannedUsers);
  // 4. Validation: Verify response structure and empty banned users list
  TestValidator.equals("pagination exists", !!bannedUsers.pagination, true);
  TestValidator.equals(
    "data array exists",
    Array.isArray(bannedUsers.data),
    true,
  );
  TestValidator.equals("initially no banned users", bannedUsers.data.length, 0);
  TestValidator.predicate("pagination has valid structure", () => {
    return (
      bannedUsers.pagination.current > 0 &&
      bannedUsers.pagination.limit > 0 &&
      bannedUsers.pagination.records === 0 &&
      bannedUsers.pagination.pages === 0
    );
  });
}
