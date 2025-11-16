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
 * Test the creation of temporary bans with expiration timestamps.
 *
 * This E2E test validates that moderators can issue time-limited bans that
 * automatically expire after a specified duration. The test verifies:
 *
 * 1. A moderator can create a ban with a future expires_at timestamp
 * 2. The ban is created with status 'active'
 * 3. The expires_at field is properly set to the specified future date
 * 4. All ban properties (reason, banned member, moderator) are correctly recorded
 *
 * This tests the graduated enforcement approach where moderators can issue
 * warnings or time-limited punishments for first-time or minor violations.
 */
export async function test_api_community_ban_temporary_with_expiration(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "SecurePassword123!",
      nickname: RandomGenerator.name(),
      ip: "192.168.1.100",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a community where the ban will be issued
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create a guest member account to be banned
  const guestEmail = typia.random<string & tags.Format<"email">>();
  const guest = await api.functional.auth.guest.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: guestEmail,
      password: "GuestPassword123!",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: "192.168.1.101",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(guest);

  // Step 4: Calculate expiration date (7 days from now)
  const now = new Date();
  const expirationDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const expiresAt = expirationDate.toISOString();

  // Step 5: Issue a temporary ban with future expiration timestamp
  const ban =
    await api.functional.redditCommunity.moderator.communities.bans.create(
      connection,
      {
        communityName: community.name,
        body: {
          banned_member_id: guest.id,
          reason:
            "First-time violation of community posting guidelines. This is a warning ban.",
          expires_at: expiresAt,
        } satisfies IRedditCommunityCommunityBan.ICreate,
      },
    );
  typia.assert(ban);

  // Step 6: Validate ban status is 'active'
  TestValidator.equals("ban status should be active", ban.status, "active");

  // Step 7: Validate expires_at is set to the specified future date
  TestValidator.equals(
    "ban expiration timestamp should match",
    ban.expires_at,
    expiresAt,
  );

  // Step 8: Validate ban reason is recorded
  TestValidator.equals(
    "ban reason should be recorded",
    ban.reason,
    "First-time violation of community posting guidelines. This is a warning ban.",
  );

  // Step 9: Validate banned member is correctly identified
  TestValidator.equals(
    "banned member ID should match",
    ban.banned_member.id,
    guest.id,
  );

  // Step 10: Validate issuing moderator is correctly identified
  TestValidator.equals(
    "ban moderator ID should match",
    ban.banned_by_moderator.id,
    moderator.id,
  );

  // Step 11: Validate community context
  TestValidator.equals(
    "ban community ID should match",
    ban.community.id,
    community.id,
  );
}
