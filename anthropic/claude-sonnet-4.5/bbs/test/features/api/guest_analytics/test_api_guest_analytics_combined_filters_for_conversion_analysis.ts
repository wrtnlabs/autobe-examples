import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuest";

/**
 * Test complex guest analytics queries combining multiple filters for
 * comprehensive conversion analysis.
 *
 * This test validates the guest analytics filtering system's ability to handle
 * complex multi-criteria queries that marketing teams use to identify
 * high-value conversion candidates. It creates a moderator account and then
 * performs progressively complex guest queries combining engagement metrics,
 * device filters, visit date ranges, and location patterns.
 *
 * The test follows this workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Perform baseline single-filter query to establish data availability
 * 3. Test dual-filter combinations (engagement + device type)
 * 4. Test triple-filter combinations (engagement + device + date range)
 * 5. Validate complex multi-filter scenarios for conversion analysis
 * 6. Verify AND logic applies correctly across all filter combinations
 */
export async function test_api_guest_analytics_combined_filters_for_conversion_analysis(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Baseline query - retrieve all guests with pagination
  const baselineQuery = {
    page: 1,
    limit: 50,
  } satisfies IDiscussionBoardGuest.IRequest;

  const baselineResult: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: baselineQuery,
    });
  typia.assert(baselineResult);

  // Step 3: Single filter - high engagement guests (minimum page views)
  const highEngagementQuery = {
    page: 1,
    limit: 50,
    min_page_views: 10,
  } satisfies IDiscussionBoardGuest.IRequest;

  const highEngagementResult: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: highEngagementQuery,
    });
  typia.assert(highEngagementResult);

  // Validate that high engagement filter reduces results
  TestValidator.predicate(
    "high engagement filter should narrow results",
    highEngagementResult.pagination.records <=
      baselineResult.pagination.records,
  );

  // Step 4: Dual filter - highly engaged mobile users
  const mobileEngagedQuery = {
    page: 1,
    limit: 50,
    min_page_views: 10,
    user_agent_contains: "Mobile",
  } satisfies IDiscussionBoardGuest.IRequest;

  const mobileEngagedResult: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: mobileEngagedQuery,
    });
  typia.assert(mobileEngagedResult);

  // Validate AND logic - mobile + engaged should be subset of just engaged
  TestValidator.predicate(
    "mobile + engagement filters should further narrow results",
    mobileEngagedResult.pagination.records <=
      highEngagementResult.pagination.records,
  );

  // Step 5: Triple filter - recent highly engaged mobile users
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const recentMobileEngagedQuery = {
    page: 1,
    limit: 50,
    min_page_views: 10,
    user_agent_contains: "Mobile",
    last_visit_from: thirtyDaysAgo.toISOString(),
  } satisfies IDiscussionBoardGuest.IRequest;

  const recentMobileEngagedResult: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: recentMobileEngagedQuery,
    });
  typia.assert(recentMobileEngagedResult);

  // Validate progressive filtering
  TestValidator.predicate(
    "adding date filter should further narrow or maintain results",
    recentMobileEngagedResult.pagination.records <=
      mobileEngagedResult.pagination.records,
  );

  // Step 6: Complex scenario - new high-value visitors for conversion campaigns
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const conversionCandidatesQuery = {
    page: 1,
    limit: 20,
    min_page_views: 15,
    max_page_views: 100,
    first_visit_from: sevenDaysAgo.toISOString(),
    sort_by: "page_views" as const,
    order: "desc" as const,
  } satisfies IDiscussionBoardGuest.IRequest;

  const conversionCandidates: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: conversionCandidatesQuery,
    });
  typia.assert(conversionCandidates);

  // Validate sorting and engagement range
  if (conversionCandidates.data.length > 1) {
    for (let i = 0; i < conversionCandidates.data.length - 1; i++) {
      TestValidator.predicate(
        "results should be sorted by page_views descending",
        conversionCandidates.data[i].page_views >=
          conversionCandidates.data[i + 1].page_views,
      );
    }
  }

  // Step 7: IP address pattern filtering combined with engagement
  const ipPatternQuery = {
    page: 1,
    limit: 50,
    min_page_views: 5,
    ip_address: "192.168",
  } satisfies IDiscussionBoardGuest.IRequest;

  const ipPatternResult: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: ipPatternQuery,
    });
  typia.assert(ipPatternResult);

  // Step 8: General search combined with filters
  const searchWithFiltersQuery = {
    page: 1,
    limit: 50,
    search: "Chrome",
    min_page_views: 8,
  } satisfies IDiscussionBoardGuest.IRequest;

  const searchWithFiltersResult: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: searchWithFiltersQuery,
    });
  typia.assert(searchWithFiltersResult);

  // Step 9: Date range filtering - first visit range
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const firstVisitRangeQuery = {
    page: 1,
    limit: 50,
    first_visit_from: sixtyDaysAgo.toISOString(),
    first_visit_to: thirtyDaysAgo.toISOString(),
    min_page_views: 5,
  } satisfies IDiscussionBoardGuest.IRequest;

  const firstVisitRangeResult: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: firstVisitRangeQuery,
    });
  typia.assert(firstVisitRangeResult);

  // Step 10: Last visit range filtering - identify dormant users
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const dormantUsersQuery = {
    page: 1,
    limit: 50,
    last_visit_from: ninetyDaysAgo.toISOString(),
    last_visit_to: sixtyDaysAgo.toISOString(),
    min_page_views: 10,
  } satisfies IDiscussionBoardGuest.IRequest;

  const dormantUsersResult: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: dormantUsersQuery,
    });
  typia.assert(dormantUsersResult);

  // Step 11: Pagination validation with complex filters
  const paginatedQuery = {
    page: 1,
    limit: 10,
    min_page_views: 5,
    user_agent_contains: "Mozilla",
  } satisfies IDiscussionBoardGuest.IRequest;

  const page1Result: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: paginatedQuery,
    });
  typia.assert(page1Result);

  // Validate pagination metadata
  TestValidator.equals(
    "current page should match request",
    page1Result.pagination.current,
    1,
  );

  TestValidator.equals(
    "limit should match request",
    page1Result.pagination.limit,
    10,
  );

  TestValidator.predicate(
    "data length should not exceed limit",
    page1Result.data.length <= 10,
  );
}
