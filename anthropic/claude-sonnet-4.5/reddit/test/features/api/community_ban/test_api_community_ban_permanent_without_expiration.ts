import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityBan";
import type { IRedditCommunityCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityMember";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test the creation of permanent bans without expiration dates.
 *
 * This test validates that moderators can issue indefinite bans for severe or
 * repeated violations. The test verifies that:
 *
 * 1. A moderator can create a ban without providing expires_at (null value)
 * 2. The ban is created with status 'active'
 * 3. The expires_at field remains null indicating permanence
 * 4. The ban remains in effect indefinitely until manually removed
 *
 * This tests the stronger enforcement mechanism for serious violations where
 * time-limited punishment is insufficient.
 */
export async function test_api_community_ban_permanent_without_expiration(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    nickname: RandomGenerator.name(),
    ip: typia.random<string>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorBody,
  });
  typia.assert(moderator);

  // Step 2: Create a community where the ban will be enforced
  const communityBody = {
    name: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<21> &
        tags.Pattern<"^[a-z0-9_]+$">
    >(),
    display_title: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 7,
    }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    rules: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    banner_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // Step 3: Create a guest member account to receive the permanent ban
  const guestBody = {
    username: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: typia.random<boolean>(),
    show_subscribed_communities: typia.random<boolean>(),
    show_activity_feed: typia.random<boolean>(),
    ip: typia.random<string>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const guest = await api.functional.auth.guest.join(connection, {
    body: guestBody,
  });
  typia.assert(guest);

  // Step 4: Issue a permanent ban without expires_at (null value)
  const banReason =
    "Severe violation of community guidelines - permanent ban for repeated harassment and spam";

  const banBody = {
    banned_member_id: guest.id,
    reason: banReason,
    expires_at: null,
  } satisfies IRedditCommunityCommunityBan.ICreate;

  const ban =
    await api.functional.redditCommunity.moderator.communities.bans.create(
      connection,
      {
        communityName: community.name,
        body: banBody,
      },
    );
  typia.assert(ban);

  // Step 5: Validate the permanent ban properties
  TestValidator.equals("ban status is active", ban.status, "active");
  TestValidator.equals(
    "expires_at is null for permanent ban",
    ban.expires_at,
    null,
  );
  TestValidator.equals("ban reason matches input", ban.reason, banReason);
  TestValidator.equals(
    "banned member ID matches",
    ban.reddit_community_member_id,
    guest.id,
  );
  TestValidator.equals(
    "community ID matches",
    ban.reddit_community_community_id,
    community.id,
  );
  TestValidator.equals(
    "moderator ID matches",
    ban.reddit_community_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "community name matches",
    ban.community.name,
    community.name,
  );
  TestValidator.equals(
    "banned member username matches",
    ban.banned_member.username,
    guest.username,
  );
  TestValidator.equals(
    "moderator username matches",
    ban.banned_by_moderator.username,
    moderator.username,
  );
}
