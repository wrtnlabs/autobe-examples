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

export async function test_api_moderator_ban_user_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful ban of a user by an authorized moderator
  // - Prerequisites: Create a community, register and authenticate as moderator
  // - Steps:
  //   1. Moderator creates a community
  //   2. Moderator bans a specified user from the community by providing valid user ID, community ID, ban reason, and timestamp
  // - Validation:
  //   - HTTP status 201 Created
  //   - Response contains full details of the banned user record, including bannedAt timestamp and reason
  //   - Database state reflects the banned user in the community_platform_banned_users table
  // Scenario 2: Attempt to ban a user who is already banned in the community
  // - Prerequisites: Same as scenario 1
  // - Steps:
  //   1. Ban already existing user
  //   2. Attempt another ban on the same user and community
  // - Validation:
  //   - HTTP status indicating conflict or duplicate ban attempt
  //   - Error message explaining user is already banned
  // Scenario 3: Unauthorized attempt to ban a user without moderator privileges
  // - Steps:
  //   1. Attempt to ban a user without authentication or with a user role
  // - Validation:
  //   - HTTP status 403 Forbidden
  //   - Error message indicating insufficient permissions
  // <E2E TEST CODE HERE>
  // Prepare connections for moderator and user
  const moderatorJoinConn: api.IConnection = { host: connection.host };
  const userJoinConn: api.IConnection = { host: connection.host };
  // Moderator registration and authentication
  const moderatorJoinInput: Partial<ICommunityPlatformModerator.IJoin> = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(1),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatarUrl: null,
  };
  const moderator = await authorize_moderator_join(moderatorJoinConn, {
    body: moderatorJoinInput,
  });
  typia.assert(moderator);
  moderatorJoinConn.headers = {
    Authorization: moderator.token.access,
  };
  // User registration and authentication
  const userJoinInput: Partial<ICommunityPlatformUser.IJoin> = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  };
  const user = await authorize_user_join(userJoinConn, { body: userJoinInput });
  typia.assert(user);
  userJoinConn.headers = {
    Authorization: user.token.access,
  };
  // Moderator creates a community
  const community =
    await generate_random_community_platform_user_communities_create(
      moderatorJoinConn,
      {
        body: {
          name: `test-${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconUrl: "https://example.com/icon.png",
        },
      },
    );
  typia.assert(community);
  // Scenario 1: Successful ban
  const bannedAt = new Date().toISOString();
  const banReason = "Violation of community guidelines.";
  const bannedUser =
    await generate_random_community_platform_moderator_banned_users_create_banned_user(
      moderatorJoinConn,
      {
        body: {
          community_platform_user_id: user.id,
          community_platform_community_id: community.id,
          banned_at: bannedAt,
          reason: banReason,
        },
      },
    );
  typia.assert(bannedUser);
  TestValidator.equals("banned user id matches", bannedUser.user.id, user.id);
  TestValidator.equals(
    "banned community id matches",
    bannedUser.community.id,
    community.id,
  );
  TestValidator.equals("ban reason matches", bannedUser.reason, banReason);
  TestValidator.predicate(
    "bannedAt present",
    () =>
      !!bannedUser.bannedAt &&
      new Date(bannedUser.bannedAt).getTime() <= Date.now(),
  );
  // Scenario 2: Attempt to ban the same user again - expect error
  await TestValidator.error("ban same user again should fail", async () => {
    await generate_random_community_platform_moderator_banned_users_create_banned_user(
      moderatorJoinConn,
      {
        body: {
          community_platform_user_id: user.id,
          community_platform_community_id: community.id,
          banned_at: new Date().toISOString(),
          reason: banReason,
        },
      },
    );
  });
  // Scenario 3: Unauthorized attempt to ban a user without moderator privileges
  const unauthorizedConn: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "non-moderator ban attempt should be forbidden",
    async () => {
      await generate_random_community_platform_moderator_banned_users_create_banned_user(
        unauthorizedConn,
        {
          body: {
            community_platform_user_id: user.id,
            community_platform_community_id: community.id,
            banned_at: new Date().toISOString(),
            reason: banReason,
          },
        },
      );
    },
  );
}
