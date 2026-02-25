import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
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
import { generate_random_community_platform_moderator_communities_banned_users_create_banned_user } from "../../../generate/generate_random_community_platform_moderator_communities_banned_users_create_banned_user";
import { prepare_random_community_platform_community_banned_user } from "../../../prepare/prepare_random_community_platform_community_banned_user";

/**
 * Test scenario for successful banning of a user from a community by an authorized moderator.
 * This includes moderator joining to obtain authorization, selecting an existing
 * community and user, posting with valid user_id, ban_reason, and banned_at timestamp.
 * Validate correct creation of banned user record and response contents, including
 * timestamps and linked user/community summaries.
 */
export async function test_api_moderator_ban_user_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator joins and obtains authorization token
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: `moderator_${RandomGenerator.alphaNumeric(8)}@test.com`,
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: `https://avatar.example.com/${RandomGenerator.alphaNumeric(12)}.png`,
    },
  });
  typia.assert(moderator);
  // 2. Prepare random ban reason and bannedAt timestamp
  const banReason = RandomGenerator.paragraph({ sentences: 3 });
  const bannedAt = new Date().toISOString();
  // 3. Create a banned user entry by calling generation utility with random valid data
  const bannedUser =
    await generate_random_community_platform_moderator_communities_banned_users_create_banned_user(
      moderatorConnection,
      {
        // Pass empty partial body as it is generated internally
        body: {
          ban_reason: banReason,
          banned_at: bannedAt,
        },
        // Params communityId set randomly inside generator function
        params: {
          communityId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  // Validate response
  typia.assert(bannedUser);
  // Validate bannedAt property format
  TestValidator.predicate(
    "bannedAt is ISO date-time",
    /^?\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(
      bannedUser.bannedAt,
    ),
  );
  // Validate banReason matches request
  TestValidator.equals("banReason matches", bannedUser.banReason, banReason);
  // Validate related user and community summaries exist
  typia.assert(bannedUser.user);
  typia.assert(bannedUser.community);
  // Validate id formats
  TestValidator.predicate(
    "id has uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      bannedUser.id,
    ),
  );
  TestValidator.predicate(
    "user id has uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      bannedUser.user.id,
    ),
  );
  TestValidator.predicate(
    "community id has uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      bannedUser.community.id,
    ),
  );
}
