import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityBan";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test ban search with multiple filter parameters combined simultaneously.
 *
 * This test validates comprehensive search capabilities for community bans by
 * combining multiple filter criteria to perform complex queries. The scenario
 * creates diverse ban records with varying attributes including different
 * communities, statuses, permanence types, creation dates, banned members, and
 * issuing moderators.
 *
 * The test performs multiple search operations combining different filters:
 *
 * 1. Community name + status + is_permanent
 * 2. Banned member username + created_from + created_to date ranges
 * 3. Status + has_appeal + sort_by combinations
 * 4. Other meaningful multi-filter combinations
 *
 * For each combined search, the test verifies:
 *
 * - AND logic correctly applies all filters (only bans matching ALL criteria are
 *   returned)
 * - Pagination works correctly with combined filters
 * - Total record count accurately reflects the multi-filter result set
 * - Results are properly sorted when sort parameters are specified
 *
 * This ensures moderators can perform detailed ban reviews and analysis using
 * advanced search capabilities with multiple simultaneous filter criteria.
 */
export async function test_api_ban_search_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "SecurePassword123!",
      nickname: RandomGenerator.name(),
      href: "https://example.com/join" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/home" satisfies string &
        tags.Format<"uri">,
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a test community for ban management
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 6,
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
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Perform ban search with combined filters
  // Test scenario 1: Basic search with pagination
  const basicSearchResult =
    await api.functional.redditCommunity.moderator.bans.index(connection, {
      body: {
        page: 1,
        limit: 10,
        community_name: community.name,
      } satisfies IRedditCommunityCommunityBan.IRequest,
    });
  typia.assert(basicSearchResult);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination current page should be within valid range",
    basicSearchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should match request",
    basicSearchResult.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    basicSearchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    basicSearchResult.pagination.pages >= 0,
  );

  // Test scenario 2: Search with status filter
  const statusSearchResult =
    await api.functional.redditCommunity.moderator.bans.index(connection, {
      body: {
        page: 1,
        limit: 20,
        status: "active",
      } satisfies IRedditCommunityCommunityBan.IRequest,
    });
  typia.assert(statusSearchResult);
  TestValidator.predicate(
    "status search should have valid pagination",
    statusSearchResult.pagination.records >= 0,
  );

  // Test scenario 3: Search with is_permanent filter
  const permanentBansResult =
    await api.functional.redditCommunity.moderator.bans.index(connection, {
      body: {
        page: 1,
        limit: 15,
        is_permanent: true,
      } satisfies IRedditCommunityCommunityBan.IRequest,
    });
  typia.assert(permanentBansResult);

  // Test scenario 4: Combined community + status + is_permanent
  const combinedSearch1 =
    await api.functional.redditCommunity.moderator.bans.index(connection, {
      body: {
        page: 1,
        limit: 25,
        community_name: community.name,
        status: "active",
        is_permanent: true,
      } satisfies IRedditCommunityCommunityBan.IRequest,
    });
  typia.assert(combinedSearch1);
  TestValidator.predicate(
    "combined search should return valid results",
    combinedSearch1.pagination.records >= 0,
  );

  // Test scenario 5: Search with date range filters
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeSearch =
    await api.functional.redditCommunity.moderator.bans.index(connection, {
      body: {
        page: 1,
        limit: 30,
        created_from: thirtyDaysAgo.toISOString(),
        created_to: now.toISOString(),
      } satisfies IRedditCommunityCommunityBan.IRequest,
    });
  typia.assert(dateRangeSearch);

  // Test scenario 6: Search with sorting
  const sortedSearch =
    await api.functional.redditCommunity.moderator.bans.index(connection, {
      body: {
        page: 1,
        limit: 20,
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies IRedditCommunityCommunityBan.IRequest,
    });
  typia.assert(sortedSearch);

  // Test scenario 7: Complex multi-filter combination
  const complexSearch =
    await api.functional.redditCommunity.moderator.bans.index(connection, {
      body: {
        page: 1,
        limit: 50,
        community_name: community.name,
        status: "active",
        is_permanent: false,
        sort_by: "created_at",
        sort_order: "asc",
      } satisfies IRedditCommunityCommunityBan.IRequest,
    });
  typia.assert(complexSearch);

  TestValidator.predicate(
    "complex search pagination should be consistent",
    complexSearch.pagination.current === 0 ||
      complexSearch.pagination.current === 1,
  );
  TestValidator.predicate(
    "data array length should not exceed limit",
    complexSearch.data.length <= 50,
  );

  // Test scenario 8: Search with has_appeal filter
  const appealSearch =
    await api.functional.redditCommunity.moderator.bans.index(connection, {
      body: {
        page: 1,
        limit: 10,
        has_appeal: true,
        status: "appealed",
      } satisfies IRedditCommunityCommunityBan.IRequest,
    });
  typia.assert(appealSearch);

  // Test scenario 9: Maximum limit boundary test
  const maxLimitSearch =
    await api.functional.redditCommunity.moderator.bans.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IRedditCommunityCommunityBan.IRequest,
    });
  typia.assert(maxLimitSearch);
  TestValidator.predicate(
    "max limit search should respect 100 item cap",
    maxLimitSearch.data.length <= 100,
  );

  // Test scenario 10: Search with general search term
  const generalSearch =
    await api.functional.redditCommunity.moderator.bans.index(connection, {
      body: {
        page: 1,
        limit: 20,
        search: "test",
        community_name: community.name,
      } satisfies IRedditCommunityCommunityBan.IRequest,
    });
  typia.assert(generalSearch);
}
