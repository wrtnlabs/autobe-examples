import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_bans_create } from "../../../generate/generate_random_reddit_platform_member_communities_bans_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

/**
 * Test the retrieval of an expired ban record to verify proper status computation
 * when a time-limited ban has expired.
 */
export async function test_api_community_ban_expired_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and login as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(moderator);
  // 2. Moderator creates a community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<3>>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create another member to be banned
  const victimConnection: api.IConnection = { host: connection.host };
  const victim = await authorize_member_join(victimConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(victim);
  // 4. Create a time-limited ban with expires_at in the past (7 days ago)
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 7);
  const expiresAt = pastDate.toISOString();
  const ban =
    await generate_random_reddit_platform_member_communities_bans_create(
      moderatorConnection,
      {
        params: { communityId: community.id },
        body: {
          user_id: victim.id,
          expires_at: expiresAt,
        },
      },
    );
  typia.assert(ban);
  // 5. Retrieve the ban record by banId
  const retrievedBan = await api.functional.redditPlatform.member.bans.at(
    moderatorConnection,
    {
      banId: ban.id,
    },
  );
  typia.assert(retrievedBan);
  // 6. Validate the response
  TestValidator.equals("ban id matches", retrievedBan.id, ban.id);
  TestValidator.equals("ban is active", retrievedBan.isActive, false);
  TestValidator.equals("ban is permanent", retrievedBan.isPermanent, false);
  TestValidator.equals("ban duration days", retrievedBan.durationDays, 7);
  TestValidator.equals("deleted_at is null", retrievedBan.deleted_at, null);
  TestValidator.equals(
    "community name matches",
    retrievedBan.community.name,
    community.name,
  );
  TestValidator.equals(
    "banned user matches",
    retrievedBan.bannedUser.id,
    victim.id,
  );
  TestValidator.equals(
    "banned by matches",
    retrievedBan.bannedBy.id,
    moderator.id,
  );
}
