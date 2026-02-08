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

export async function test_api_community_banned_users_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  moderatorConnection.headers = { Authorization: moderatorAuth.token.access };
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {},
  });
  userConnection.headers = { Authorization: userAuth.token.access };
  // User creates a community
  const community =
    await generate_random_community_platform_user_communities_create_community(
      userConnection,
      { body: {} },
    );
  typia.assert(community);
  // Moderator requests banned users list for the community - expecting empty list
  const bannedUsersList =
    await api.functional.communityPlatform.moderator.communities.banned_users.index(
      moderatorConnection,
      { communityId: (community as any).communityId ?? (community as any).id },
    );
  typia.assert(bannedUsersList);
  // Validate that the result has an empty data array
  TestValidator.equals(
    "banned users data length",
    bannedUsersList.data.length,
    0,
  );
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is >= 0",
    bannedUsersList.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is >= 0",
    bannedUsersList.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is >= 0",
    bannedUsersList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is >= 0",
    bannedUsersList.pagination.pages >= 0,
  );
}
