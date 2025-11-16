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
 * Test filtering ban records by the username of the banned member.
 *
 * This test validates that moderators can search and retrieve all bans issued
 * to a specific member by filtering on their username. The test creates
 * multiple member accounts with different usernames, issues bans to them, then
 * verifies that the search API correctly filters and returns only the bans
 * matching the specified username.
 *
 * Steps:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create a test community for ban management
 * 3. Create multiple guest accounts with distinct usernames
 * 4. Issue bans to different members with unique reasons
 * 5. Search bans by specific member username
 * 6. Validate that all returned bans belong to the specified member
 * 7. Verify response structure and pagination metadata
 */
export async function test_api_community_ban_search_by_member_username(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    nickname: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://test.example.com/moderator/join" satisfies string &
      tags.Format<"uri">,
    referrer: "" satisfies string & tags.Format<"uri">,
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a test community
  const communityData = {
    name: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<21> &
        tags.Pattern<"^[a-z0-9_]+$">
    >(),
    display_title: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 8,
    }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
    rules: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    banner_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Create multiple guest accounts with different usernames
  const guestCount = 3;
  const guests: IRedditCommunityGuest.IAuthorized[] =
    await ArrayUtil.asyncRepeat(guestCount, async (index) => {
      const guestData = {
        username: `testuser_${index}_${typia.random<string & tags.MinLength<3> & tags.MaxLength<10>>()}`,
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        show_online_status: false,
        show_subscribed_communities: false,
        show_activity_feed: true,
        ip: "127.0.0.1",
        href: "https://test.example.com/guest/join" satisfies string &
          tags.Format<"uri">,
        referrer: "" satisfies string & tags.Format<"uri">,
      } satisfies IRedditCommunityGuest.ICreate;

      const guest: IRedditCommunityGuest.IAuthorized =
        await api.functional.auth.guest.join(connection, {
          body: guestData,
        });
      typia.assert(guest);
      return guest;
    });

  // Step 4: Issue bans to different members
  const targetGuest = guests[0];
  const otherGuests = guests.slice(1);

  // Create multiple bans for the target guest (the one we'll search for)
  const targetBanCount = 2;
  const targetBans: IRedditCommunityCommunityBan[] =
    await ArrayUtil.asyncRepeat(targetBanCount, async (index) => {
      const banData = {
        banned_member_id: targetGuest.id,
        reason: `Ban reason ${index + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
        expires_at: null,
      } satisfies IRedditCommunityCommunityBan.ICreate;

      const ban: IRedditCommunityCommunityBan =
        await api.functional.redditCommunity.moderator.communities.bans.create(
          connection,
          {
            communityName: community.name,
            body: banData,
          },
        );
      typia.assert(ban);
      return ban;
    });

  // Create bans for other guests (should not appear in search results)
  await ArrayUtil.asyncForEach(otherGuests, async (guest) => {
    const banData = {
      banned_member_id: guest.id,
      reason: `Other ban: ${RandomGenerator.paragraph({ sentences: 2 })}`,
      expires_at: null,
    } satisfies IRedditCommunityCommunityBan.ICreate;

    const ban: IRedditCommunityCommunityBan =
      await api.functional.redditCommunity.moderator.communities.bans.create(
        connection,
        {
          communityName: community.name,
          body: banData,
        },
      );
    typia.assert(ban);
  });

  // Step 5: Search bans by specific member username
  const searchRequest = {
    page: 1,
    limit: 10,
    banned_member_username: targetGuest.username,
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const searchResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: searchRequest,
      },
    );
  typia.assert(searchResult);

  // Step 6: Validate that all returned bans belong to the specified member
  TestValidator.equals(
    "search should return exactly the number of bans for target member",
    searchResult.data.length,
    targetBanCount,
  );

  TestValidator.predicate(
    "all returned bans should belong to the target member",
    searchResult.data.every(
      (ban) => ban.banned_member.username === targetGuest.username,
    ),
  );

  // Step 7: Verify response structure and pagination metadata
  TestValidator.predicate(
    "pagination current page should be 1",
    searchResult.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit should match request",
    searchResult.pagination.limit === searchRequest.limit,
  );

  TestValidator.predicate(
    "pagination records should match returned ban count",
    searchResult.pagination.records === targetBanCount,
  );

  // Validate individual ban properties
  searchResult.data.forEach((ban, index) => {
    TestValidator.equals(
      `ban ${index} should have correct member ID`,
      ban.reddit_community_member_id,
      targetGuest.id,
    );

    TestValidator.equals(
      `ban ${index} should have correct community ID`,
      ban.reddit_community_community_id,
      community.id,
    );

    TestValidator.predicate(
      `ban ${index} should have a valid reason`,
      ban.reason.length > 0,
    );

    TestValidator.predicate(
      `ban ${index} should have a valid status`,
      ["active", "expired", "lifted"].includes(ban.status),
    );
  });
}
