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

export async function test_api_moderator_banned_user_update_various_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully update the ban reason of a banned user record.
  // Scenario 2: Successfully unban a banned user by setting 'unbanned_at' timestamp.
  // Scenario 3: Attempt unauthorized update without moderator authentication (expect failure).
  // Create separate connection for moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Create and login moderator
  const moderatorJoinInput = {
    email: RandomGenerator.alphaNumeric(8) + "@test.com",
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(1),
    bio: null,
    avatarUrl: null,
  };
  const modJoin = await authorize_moderator_join(moderatorConnection, {
    body: moderatorJoinInput,
  });
  typia.assert(modJoin);
  // Create auth connection with token
  moderatorConnection.headers = {
    Authorization: `Bearer ${modJoin.token.access}`,
  };
  // Create separate connection for user
  const userConnection: api.IConnection = { host: connection.host };
  // Create and login user
  const userJoinInput = {
    email: RandomGenerator.alphaNumeric(8) + "@test.com",
    password: "1234",
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(1),
    href: "https://example.com/",
    referrer: "https://google.com/",
    ip: null,
  };
  const userJoin = await authorize_user_join(userConnection, {
    body: userJoinInput,
  });
  typia.assert(userJoin);
  // User auth connection with token
  userConnection.headers = { Authorization: `Bearer ${userJoin.token.access}` };
  // Create community as the user
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(community);
  // Ban user in community
  const bannedUser =
    await generate_random_community_platform_moderator_banned_users_create_banned_user(
      moderatorConnection,
      {
        body: {
          community_platform_user_id: userJoin.id,
          community_platform_community_id: community.id,
          banned_at: new Date().toISOString(),
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(bannedUser);
  // Scenario 1: Update reason
  const newReason: string = RandomGenerator.paragraph({ sentences: 1 });
  const updatedBannedUser =
    await api.functional.communityPlatform.moderator.banned_users.update(
      moderatorConnection,
      {
        id: bannedUser.id,
        body: {
          reason: newReason,
        },
      },
    );
  typia.assert(updatedBannedUser);
  TestValidator.equals(
    "Updated reason matches",
    updatedBannedUser.reason,
    newReason,
  );
  TestValidator.equals(
    "User ID unchanged",
    updatedBannedUser.user.id,
    bannedUser.user.id,
  );
  TestValidator.equals(
    "Community ID unchanged",
    updatedBannedUser.community.id,
    bannedUser.community.id,
  );
  TestValidator.predicate(
    "Updated timestamp",
    new Date(updatedBannedUser.updatedAt) > new Date(bannedUser.updatedAt),
  );
  // Scenario 2: Unban user via unbannedAt
  const unbannedAt = new Date().toISOString();
  const unbannedBannedUser =
    await api.functional.communityPlatform.moderator.banned_users.update(
      moderatorConnection,
      {
        id: bannedUser.id,
        body: {
          reason: updatedBannedUser.reason, // same reason
          unbanned_at: unbannedAt,
        },
      },
    );
  typia.assert(unbannedBannedUser);
  TestValidator.equals(
    "UnbannedAt timestamp set properly",
    unbannedBannedUser.unbannedAt,
    unbannedAt,
  );
  TestValidator.equals(
    "Reason remains unchanged",
    unbannedBannedUser.reason,
    updatedBannedUser.reason,
  );
  // Scenario 3: Unauthorized update
  // Attempt to update without authentication
  await TestValidator.error(
    "Update banned user without auth results in failure",
    async () => {
      await api.functional.communityPlatform.moderator.banned_users.update(
        connection,
        {
          id: bannedUser.id,
          body: {
            reason: RandomGenerator.paragraph({ sentences: 1 }),
          },
        },
      );
    },
  );
  // Attempt to update with user auth (non-moderator)
  await TestValidator.error(
    "Update banned user with user auth results in failure",
    async () => {
      await api.functional.communityPlatform.moderator.banned_users.update(
        userConnection,
        {
          id: bannedUser.id,
          body: {
            reason: RandomGenerator.paragraph({ sentences: 1 }),
          },
        },
      );
    },
  );
}
