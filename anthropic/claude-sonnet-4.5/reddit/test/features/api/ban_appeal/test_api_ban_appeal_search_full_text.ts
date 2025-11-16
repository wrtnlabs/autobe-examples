import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBanAppeal";
import type { IRedditCommunityBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanAppeal";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityBan";
import type { IRedditCommunityCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityMember";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test full-text search functionality across appeal_text content using the
 * search parameter.
 *
 * This test validates that moderators can search ban appeals by keywords in the
 * appeal text. The test creates multiple ban appeals with different content and
 * verifies that search correctly filters appeals based on keyword matching,
 * case-insensitivity, and partial matches.
 *
 * Test Flow:
 *
 * 1. Create and authenticate moderator
 * 2. Create a test community
 * 3. Create multiple members, ban them, and submit appeals with distinct
 *    searchable content
 * 4. Perform full-text searches and validate results
 * 5. Verify case-insensitive matching
 * 6. Verify partial keyword matching
 * 7. Verify non-matching appeals are excluded
 */
export async function test_api_ban_appeal_search_full_text(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    nickname: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create test community
  const communityData = {
    name: RandomGenerator.alphabets(10),
    display_title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 3 }),
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

  // Step 3: Create multiple members with bans and appeals containing different searchable content
  const searchableKeywords = [
    "misunderstanding about community guidelines",
    "accidental violation of posting rules",
    "technical error caused the issue",
    "unfair moderation decision",
    "respectful disagreement with policy",
  ];

  const createdAppeals: IRedditCommunityBanAppeal[] = [];
  const appealIdsByKeyword: Map<string, string> = new Map();

  for (let i = 0; i < searchableKeywords.length; i++) {
    // Create member
    const memberData = {
      username: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate;

    const member: IRedditCommunityGuest.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body: memberData,
      });
    typia.assert(member);

    // Switch to moderator to create ban
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorData.email,
        password: moderatorData.password,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ILogin,
    });

    // Create ban
    const banData = {
      banned_member_id: member.id,
      reason: RandomGenerator.paragraph({ sentences: 2 }),
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

    // Switch to member to submit appeal
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberData.email,
        password: memberData.password,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ILogin,
    });

    // Submit appeal with searchable content
    const appealText = `I would like to appeal my ban. ${searchableKeywords[i]}. ${RandomGenerator.paragraph({ sentences: 3 })}`;

    const appealData = {
      appeal_text: appealText,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityBanAppeal.ICreate;

    const appeal: IRedditCommunityBanAppeal =
      await api.functional.redditCommunity.member.bans.appeal.create(
        connection,
        {
          banId: ban.id,
          body: appealData,
        },
      );
    typia.assert(appeal);
    createdAppeals.push(appeal);

    // Map keyword to appeal ID for validation
    appealIdsByKeyword.set(searchableKeywords[i], appeal.id);
  }

  // Step 4: Switch back to moderator for search operations
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorData.email,
      password: moderatorData.password,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Step 5: Test search with specific keyword - "misunderstanding"
  const searchRequest1 = {
    page: 1,
    limit: 10,
    search: "misunderstanding",
  } satisfies IRedditCommunityBanAppeal.IRequest;

  const searchResults1: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.communities.banAppeals.index(
      connection,
      {
        communityName: community.name,
        body: searchRequest1,
      },
    );
  typia.assert(searchResults1);

  // Validate that only appeals containing "misunderstanding" are returned
  TestValidator.predicate(
    "search returns at least one result for 'misunderstanding'",
    searchResults1.data.length > 0,
  );

  // Step 6: Test case-insensitive search - "TECHNICAL"
  const searchRequest2 = {
    page: 1,
    limit: 10,
    search: "TECHNICAL",
  } satisfies IRedditCommunityBanAppeal.IRequest;

  const searchResults2: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.communities.banAppeals.index(
      connection,
      {
        communityName: community.name,
        body: searchRequest2,
      },
    );
  typia.assert(searchResults2);

  // Validate case-insensitive matching works
  TestValidator.predicate(
    "case-insensitive search finds 'technical' appeals",
    searchResults2.data.length > 0,
  );

  // Step 7: Test partial keyword matching - "policy"
  const searchRequest3 = {
    page: 1,
    limit: 10,
    search: "policy",
  } satisfies IRedditCommunityBanAppeal.IRequest;

  const searchResults3: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.communities.banAppeals.index(
      connection,
      {
        communityName: community.name,
        body: searchRequest3,
      },
    );
  typia.assert(searchResults3);

  // Validate partial matching
  TestValidator.predicate(
    "partial keyword 'policy' returns matching appeals",
    searchResults3.data.length > 0,
  );

  // Step 8: Test search with non-matching keyword
  const searchRequest4 = {
    page: 1,
    limit: 10,
    search: "completely_unique_nonexistent_keyword_xyz123",
  } satisfies IRedditCommunityBanAppeal.IRequest;

  const searchResults4: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.communities.banAppeals.index(
      connection,
      {
        communityName: community.name,
        body: searchRequest4,
      },
    );
  typia.assert(searchResults4);

  // Validate non-matching appeals are excluded
  TestValidator.predicate(
    "search with non-matching keyword returns no results",
    searchResults4.data.length === 0,
  );

  // Step 9: Test search without search parameter returns all appeals
  const searchRequest5 = {
    page: 1,
    limit: 20,
  } satisfies IRedditCommunityBanAppeal.IRequest;

  const searchResults5: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.communities.banAppeals.index(
      connection,
      {
        communityName: community.name,
        body: searchRequest5,
      },
    );
  typia.assert(searchResults5);

  // Validate all created appeals are returned when no search filter
  TestValidator.predicate(
    "no search filter returns all appeals",
    searchResults5.data.length === createdAppeals.length,
  );
}
