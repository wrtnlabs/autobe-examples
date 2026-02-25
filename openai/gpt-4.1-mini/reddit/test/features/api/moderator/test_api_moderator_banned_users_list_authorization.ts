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

export async function test_api_moderator_banned_users_list_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 3: Authorization checks for accessing banned users list
  // Preconditions: Community exists.
  // Test that access is denied when request is made without moderator authentication or with invalid tokens.
  // Verify proper error codes are returned (401 Unauthorized or 403 Forbidden) and no data is leaked.
  // Also test that a user with appropriate moderator role can successfully access the endpoint.
  // Create a user to create a community
  const userConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  // Set token on userConnection
  userConnection.headers = {
    Authorization: `Bearer ${userAuthorized.token.access}`,
  };
  // Create a community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(community);
  // Negative test: Try access banned users list without authorization header
  const noAuthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "access denied without authorization header",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.moderator.communities.banned_users.list.index(
        noAuthConnection,
        {
          communityId: community.id,
          body: {},
        },
      );
    },
  );
  // Negative test: Try access banned users list with invalid token
  const invalidTokenConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer invalidtoken`,
    },
  };
  await TestValidator.httpError(
    "access denied with invalid token",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.moderator.communities.banned_users.list.index(
        invalidTokenConnection,
        {
          communityId: community.id,
          body: {},
        },
      );
    },
  );
  // Create a moderator and join with a password
  const moderatorConnection: api.IConnection = { host: connection.host };
  const password = "password123";
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(1),
        displayName: null,
        bio: null,
        avatarUrl: null
      },
    },
  );
  typia.assert(moderatorAuthorized);
  // Login as moderator using the same credentials
  const moderatorLoginConnection: api.IConnection = { host: connection.host };
  const loggedInModerator = await authorize_moderator_login(
    moderatorLoginConnection,
    {
      body: {
        email: moderatorEmail,
        password: password,
      },
    },
  );
  typia.assert(loggedInModerator);
  // Set token on moderatorLoginConnection
  moderatorLoginConnection.headers = {
    Authorization: `Bearer ${loggedInModerator.token.access}`,
  };
  // Moderator should access banned users list successfully
  const bannedUsersResponse =
    await api.functional.communityPlatform.moderator.communities.banned_users.list.index(
      moderatorLoginConnection,
      {
        communityId: community.id,
        body: {},
      },
    );
  typia.assert(bannedUsersResponse);
}
