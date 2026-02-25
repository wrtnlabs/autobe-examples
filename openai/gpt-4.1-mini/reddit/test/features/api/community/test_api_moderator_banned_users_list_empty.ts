import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBannedUser";
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
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_moderator_banned_users_list_empty(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Retrieve an empty banned users list for a community with no banned users.
  // Preconditions: Community exists, valid moderator authentication.
  // Test that an empty data array with correct pagination metadata is returned,
  // ensuring the system gracefully handles no banned users cases without errors.
  // 1. User join and login
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_user_join(userJoinConnection, {});
  const userConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${userAuthorized.token.access}` },
  };
  // 2. Moderator join and login
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorJoinConnection,
    { body: {} },
  );
  const moderatorConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${moderatorAuthorized.token.access}` },
  };
  // 3. User creates a community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(community);
  // 4. Moderator requests banned users list for the community
  const bannedUsersList =
    await api.functional.communityPlatform.moderator.communities.banned_users.list.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {}, // No filters, default pagination
      },
    );
  typia.assert(bannedUsersList);
  // 5. Validate response is empty with correct pagination
  TestValidator.equals(
    "banned users list data empty",
    bannedUsersList.data.length,
    0,
  );
  TestValidator.equals(
    "page current is 1",
    bannedUsersList.pagination.current,
    1,
  );
  TestValidator.equals(
    "page limit is 10",
    bannedUsersList.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page records is 0",
    bannedUsersList.pagination.records,
    0,
  );
  TestValidator.equals("page pages is 0", bannedUsersList.pagination.pages, 0);
}
