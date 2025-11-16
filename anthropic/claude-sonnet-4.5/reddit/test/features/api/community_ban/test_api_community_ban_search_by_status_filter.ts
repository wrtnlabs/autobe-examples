import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityBan";
import type { IRedditCommunityCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityMember";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test filtering ban records by their current status (active, expired).
 *
 * This test validates that moderators can effectively filter community bans by
 * their lifecycle status for efficient moderation queue management.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create a community for ban management
 * 3. Create multiple guest member accounts
 * 4. Create bans with different statuses (active, expired)
 * 5. Test filtering by status='active' returns only active bans
 * 6. Test filtering by status='expired' returns only expired bans
 * 7. Validate accurate status matching and exclusion
 */
export async function test_api_community_ban_search_by_status_filter(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a community
  const communityNameBase = RandomGenerator.alphabets(10);
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityNameBase,
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
          rules: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create guest members for banning
  const guestMembers = await ArrayUtil.asyncRepeat(3, async () => {
    const guest = await api.functional.auth.guest.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        show_online_status: false,
        show_subscribed_communities: false,
        show_activity_feed: true,
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
    typia.assert(guest);
    return guest;
  });

  // Step 4: Create active ban (no expiration)
  const activeBan =
    await api.functional.redditCommunity.moderator.communities.bans.create(
      connection,
      {
        communityName: community.name,
        body: {
          banned_member_id: guestMembers[0].id,
          reason: "Repeated spam posting - permanent ban",
          expires_at: null,
        } satisfies IRedditCommunityCommunityBan.ICreate,
      },
    );
  typia.assert(activeBan);

  // Step 5: Create expired ban (past expiration)
  const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
  const expiredBan =
    await api.functional.redditCommunity.moderator.communities.bans.create(
      connection,
      {
        communityName: community.name,
        body: {
          banned_member_id: guestMembers[1].id,
          reason: "Temporary ban that has expired",
          expires_at: pastDate.toISOString(),
        } satisfies IRedditCommunityCommunityBan.ICreate,
      },
    );
  typia.assert(expiredBan);

  // Step 6: Create another active ban with future expiration
  const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  const activeBan2 =
    await api.functional.redditCommunity.moderator.communities.bans.create(
      connection,
      {
        communityName: community.name,
        body: {
          banned_member_id: guestMembers[2].id,
          reason: "Harassment - 30 day temporary ban",
          expires_at: futureDate.toISOString(),
        } satisfies IRedditCommunityCommunityBan.ICreate,
      },
    );
  typia.assert(activeBan2);

  // Step 7: Test filtering by status='active'
  const activeBansResult =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: {
          status: "active",
          page: 1,
          limit: 100,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(activeBansResult);

  TestValidator.predicate(
    "active bans filter returns results",
    activeBansResult.data.length >= 2,
  );

  for (const ban of activeBansResult.data) {
    TestValidator.equals(
      "filtered ban has active status",
      ban.status,
      "active",
    );
  }

  // Step 8: Test filtering by status='expired'
  const expiredBansResult =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: {
          status: "expired",
          page: 1,
          limit: 100,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(expiredBansResult);

  TestValidator.predicate(
    "expired bans filter returns results",
    expiredBansResult.data.length >= 1,
  );

  for (const ban of expiredBansResult.data) {
    TestValidator.equals(
      "filtered ban has expired status",
      ban.status,
      "expired",
    );
  }
}
