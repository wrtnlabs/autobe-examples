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
 * Test the general search parameter that filters across multiple fields
 * including banned member username and ban reason text within a community.
 *
 * This test validates flexible text-based searching for moderators by:
 *
 * 1. Creating a moderator account for authentication
 * 2. Creating a test community
 * 3. Creating multiple members with distinct usernames
 * 4. Creating ban records with varied reasons
 * 5. Searching by member username and validating matching results
 * 6. Searching by ban reason keywords and validating matching results
 * 7. Testing partial text matches across searchable fields
 * 8. Testing case-insensitive search functionality
 */
export async function test_api_community_ban_search_general_text_search(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePassword123",
      nickname: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a test community
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: "gaming_community",
          display_title: "Gaming Community",
          description: "A community for gaming enthusiasts",
          rules: "Be respectful and follow community guidelines",
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create multiple member accounts with distinct usernames
  const memberUsernames = [
    "alice_smith",
    "bob_jones",
    "charlie_brown",
    "david_wilson",
    "emma_davis",
  ] as const;
  const members = await ArrayUtil.asyncRepeat(5, async (index) => {
    const member = await api.functional.auth.guest.join(connection, {
      body: {
        username: memberUsernames[index],
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        show_online_status: false,
        show_subscribed_communities: false,
        show_activity_feed: true,
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
    typia.assert(member);
    return member;
  });

  // Step 4: Create ban records with varied reasons
  const banReasons = [
    "Spam posting repeatedly in threads",
    "Harassment of other community members",
    "Posting inappropriate gaming content",
    "Violating community guidelines multiple times",
    "Spam links in comment sections",
  ] as const;

  const createdBans = await ArrayUtil.asyncRepeat(5, async (index) => {
    const ban =
      await api.functional.redditCommunity.moderator.communities.bans.create(
        connection,
        {
          communityName: community.name,
          body: {
            banned_member_id: members[index].id,
            reason: banReasons[index],
            expires_at: null,
          } satisfies IRedditCommunityCommunityBan.ICreate,
        },
      );
    typia.assert(ban);
    return ban;
  });

  // Step 5: Test search by member username (exact partial match)
  const searchByUsername =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: {
          search: "alice",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(searchByUsername);

  TestValidator.predicate(
    "search by username 'alice' returns at least one result",
    searchByUsername.data.length > 0,
  );

  const aliceBan = searchByUsername.data.find((ban) =>
    ban.banned_member.username.toLowerCase().includes("alice"),
  );
  TestValidator.predicate(
    "search result contains ban for user with 'alice' in username",
    aliceBan !== undefined,
  );

  // Step 6: Test search by ban reason keyword
  const searchByReason =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: {
          search: "Spam",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(searchByReason);

  TestValidator.predicate(
    "search by reason keyword 'Spam' returns results",
    searchByReason.data.length > 0,
  );

  const spamBan = searchByReason.data.find((ban) =>
    ban.reason.toLowerCase().includes("spam"),
  );
  TestValidator.predicate(
    "search result contains ban with 'spam' in reason",
    spamBan !== undefined,
  );

  // Step 7: Test search by different member username
  const searchByBob =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: {
          search: "bob",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(searchByBob);

  const bobBan = searchByBob.data.find((ban) =>
    ban.banned_member.username.toLowerCase().includes("bob"),
  );
  TestValidator.predicate(
    "search for 'bob' returns ban for user with 'bob' in username",
    bobBan !== undefined,
  );

  // Step 8: Test case-insensitive search
  const searchUpperCase =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: {
          search: "HARASSMENT",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(searchUpperCase);

  TestValidator.predicate(
    "case-insensitive search 'HARASSMENT' returns results",
    searchUpperCase.data.length > 0,
  );

  // Step 9: Test partial keyword match in reason
  const searchPartialReason =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: {
          search: "guidelines",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(searchPartialReason);

  const guidelinesBan = searchPartialReason.data.find((ban) =>
    ban.reason.toLowerCase().includes("guidelines"),
  );
  TestValidator.predicate(
    "partial text 'guidelines' matches ban reasons",
    guidelinesBan !== undefined,
  );

  // Step 10: Verify pagination metadata is valid
  TestValidator.predicate(
    "pagination metadata is properly structured",
    searchByUsername.pagination.current >= 0 &&
      searchByUsername.pagination.limit > 0 &&
      searchByUsername.pagination.records >= 0 &&
      searchByUsername.pagination.pages >= 0,
  );

  // Step 11: Test search with no results
  const searchNoResults =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: {
          search: "nonexistent_search_term_xyz",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(searchNoResults);

  TestValidator.predicate(
    "search with non-matching term returns empty results",
    searchNoResults.data.length === 0,
  );
}
