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
import { generate_random_community_platform_user_communities_create_community } from "../../../generate/generate_random_community_platform_user_communities_create_community";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_banned_users_list_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authorize user connections
  const user1Connection: api.IConnection = { host: connection.host };
  const user1Join = {} satisfies ICommunityPlatformUser.IJoin;
  const user1Authorized = await authorize_user_join(user1Connection, {
    body: user1Join,
  });
  typia.assert(user1Authorized);
  user1Connection.headers = { Authorization: user1Authorized.token.access };
  const user2Connection: api.IConnection = { host: connection.host };
  const user2Join = {} satisfies ICommunityPlatformUser.IJoin;
  const user2Authorized = await authorize_user_join(user2Connection, {
    body: user2Join,
  });
  typia.assert(user2Authorized);
  user2Connection.headers = { Authorization: user2Authorized.token.access };
  // 2. Create and authorize moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoin = {} satisfies ICommunityPlatformModerator.IJoin;
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorConnection,
    { body: moderatorJoin },
  );
  typia.assert(moderatorAuthorized);
  moderatorConnection.headers = {
    Authorization: moderatorAuthorized.token.access,
  };
  // 3. User1 creates a community
  const createdCommunity =
    await generate_random_community_platform_user_communities_create_community(
      user1Connection,
      {},
    );
  typia.assert(createdCommunity);
  const communityId: string = (
    createdCommunity as {
      id: string;
    }
  ).id;
  // Since no ban user creation API is available, proceed to test fetching the banned users list
  // 4. Moderator fetches the banned users list for the community
  const bannedUsersList =
    await api.functional.communityPlatform.moderator.communities.banned_users.index(
      moderatorConnection,
      {
        communityId,
      },
    );
  typia.assert(bannedUsersList);
  // 5. Validate pagination info presence and data array
  TestValidator.predicate(
    "pagination exists",
    bannedUsersList.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination current is positive",
    bannedUsersList.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    bannedUsersList.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    bannedUsersList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    bannedUsersList.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(bannedUsersList.data),
  );
  // 6. Typia assert each banned user summary object without checking non-existent properties
  bannedUsersList.data.forEach((bannedUser) => {
    typia.assert(bannedUser);
  });
  // 7. Unauthorized user (user2) attempts to fetch the banned users list (should fail)
  await TestValidator.error(
    "unauthorized user cannot access banned users list",
    async () => {
      await api.functional.communityPlatform.moderator.communities.banned_users.index(
        user2Connection,
        { communityId },
      );
    },
  );
  // 8. Guest (no auth) attempts to fetch the banned users list (should fail)
  await TestValidator.error(
    "guest cannot access banned users list",
    async () => {
      await api.functional.communityPlatform.moderator.communities.banned_users.index(
        connection,
        { communityId },
      );
    },
  );
}
