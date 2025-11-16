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
 * Test ban search API with temporal filter parameters.
 *
 * This test validates that the ban search API correctly accepts and processes
 * temporal filtering parameters including created_from, created_to,
 * expires_from, and expires_to. Since there are no APIs available to create
 * test ban data, this test focuses on validating the API contract and parameter
 * handling.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create a test community
 * 3. Call ban search API with creation date range filters (created_from,
 *    created_to)
 * 4. Call ban search API with expiration date range filters (expires_from,
 *    expires_to)
 * 5. Call ban search API with combined temporal filters
 * 6. Call ban search API filtering for permanent bans (is_permanent)
 * 7. Verify all API calls return valid paginated response structures
 * 8. Verify pagination metadata is correctly structured
 * 9. Verify ISO 8601 date-time format is accepted by the API
 */
export async function test_api_ban_search_with_temporal_filters(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "securePassword123",
        nickname: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a test community
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Test ban search with creation date range filters
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

  const creationDateFilterResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.bans.index(connection, {
      body: {
        community_name: community.name,
        created_from: thirtyDaysAgo.toISOString(),
        created_to: fifteenDaysAgo.toISOString(),
        page: 1,
        limit: 50,
      } satisfies IRedditCommunityCommunityBan.IRequest,
    });
  typia.assert(creationDateFilterResult);

  TestValidator.predicate(
    "creation date filter response should have valid pagination",
    creationDateFilterResult.pagination.current >= 0 &&
      creationDateFilterResult.pagination.limit === 50 &&
      creationDateFilterResult.pagination.records >= 0 &&
      creationDateFilterResult.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "creation date filter response should have data array",
    Array.isArray(creationDateFilterResult.data),
  );

  // Step 4: Test ban search with expiration date range filters
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  const expirationDateFilterResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.bans.index(connection, {
      body: {
        community_name: community.name,
        expires_from: thirtyDaysFromNow.toISOString(),
        expires_to: sixtyDaysFromNow.toISOString(),
        page: 1,
        limit: 50,
      } satisfies IRedditCommunityCommunityBan.IRequest,
    });
  typia.assert(expirationDateFilterResult);

  TestValidator.predicate(
    "expiration date filter response should have valid pagination",
    expirationDateFilterResult.pagination.current >= 0 &&
      expirationDateFilterResult.pagination.limit === 50,
  );

  // Step 5: Test ban search with combined temporal filters
  const combinedFilterResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.bans.index(connection, {
      body: {
        community_name: community.name,
        created_from: thirtyDaysAgo.toISOString(),
        created_to: now.toISOString(),
        expires_from: now.toISOString(),
        expires_to: sixtyDaysFromNow.toISOString(),
        page: 1,
        limit: 25,
      } satisfies IRedditCommunityCommunityBan.IRequest,
    });
  typia.assert(combinedFilterResult);

  TestValidator.predicate(
    "combined filter response should respect limit parameter",
    combinedFilterResult.pagination.limit === 25,
  );

  // Step 6: Test ban search filtering for permanent bans
  const permanentBansResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.bans.index(connection, {
      body: {
        community_name: community.name,
        is_permanent: true,
        page: 1,
        limit: 50,
      } satisfies IRedditCommunityCommunityBan.IRequest,
    });
  typia.assert(permanentBansResult);

  // Step 7: Test ban search with boundary date validation
  const boundaryTestResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.bans.index(connection, {
      body: {
        created_from: now.toISOString(),
        created_to: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityCommunityBan.IRequest,
    });
  typia.assert(boundaryTestResult);

  TestValidator.predicate(
    "boundary date test should return valid response",
    Array.isArray(boundaryTestResult.data) &&
      boundaryTestResult.pagination.limit === 10,
  );

  // Step 8: Verify all temporal filter combinations are accepted
  const allFiltersResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.bans.index(connection, {
      body: {
        community_name: community.name,
        created_from: thirtyDaysAgo.toISOString(),
        created_to: now.toISOString(),
        expires_from: now.toISOString(),
        expires_to: sixtyDaysFromNow.toISOString(),
        is_permanent: false,
        status: "active",
        page: 1,
        limit: 100,
      } satisfies IRedditCommunityCommunityBan.IRequest,
    });
  typia.assert(allFiltersResult);

  TestValidator.predicate(
    "all filters result should have consistent structure",
    typeof allFiltersResult.pagination.current === "number" &&
      typeof allFiltersResult.pagination.records === "number" &&
      typeof allFiltersResult.pagination.pages === "number",
  );
}
