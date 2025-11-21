import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformVoteLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteLimit";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVoteLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteLimit";

/**
 * Test vote limits filtering by period timestamps.
 *
 * Validates that administrators can filter vote limits using period_after and
 * period_before parameters to retrieve records within specific time periods.
 * Tests date-based filtering to ensure accurate temporal analysis of vote limit
 * enforcement patterns across the platform.
 */
export async function test_api_vote_limits_temporal_filtering(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Test basic search functionality first to understand available data
  const initialResults =
    await api.functional.communityPlatform.admin.voteLimits.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVoteLimit.IRequest,
    });
  typia.assert(initialResults);

  // Step 3: Test period_after filtering with realistic date
  const currentDate = new Date().toISOString();
  const periodAfterResults =
    await api.functional.communityPlatform.admin.voteLimits.index(connection, {
      body: {
        page: 1,
        limit: 10,
        period_after: currentDate,
      } satisfies ICommunityPlatformVoteLimit.IRequest,
    });
  typia.assert(periodAfterResults);

  // Validate period_after filtering logic - only if we have results
  if (periodAfterResults.data.length > 0) {
    TestValidator.predicate(
      "period_after filter returns records with period_start after specified date",
      periodAfterResults.data.every(
        (record) => new Date(record.period_start) > new Date(currentDate),
      ),
    );
  }

  // Step 4: Test period_before filtering with realistic date
  const periodBeforeResults =
    await api.functional.communityPlatform.admin.voteLimits.index(connection, {
      body: {
        page: 1,
        limit: 10,
        period_before: currentDate,
      } satisfies ICommunityPlatformVoteLimit.IRequest,
    });
  typia.assert(periodBeforeResults);

  // Validate period_before filtering logic - only if we have results
  if (periodBeforeResults.data.length > 0) {
    TestValidator.predicate(
      "period_before filter returns records with period_end before specified date",
      periodBeforeResults.data.every(
        (record) => new Date(record.period_end) < new Date(currentDate),
      ),
    );
  }

  // Step 5: Test combined period_after and period_before filtering
  const startDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
  const endDate = new Date(Date.now() + 86400000).toISOString(); // 1 day from now

  const combinedResults =
    await api.functional.communityPlatform.admin.voteLimits.index(connection, {
      body: {
        page: 1,
        limit: 10,
        period_after: startDate,
        period_before: endDate,
      } satisfies ICommunityPlatformVoteLimit.IRequest,
    });
  typia.assert(combinedResults);

  // Validate combined filtering logic - only if we have results
  if (combinedResults.data.length > 0) {
    TestValidator.predicate(
      "combined period filters return records within specified date range",
      combinedResults.data.every((record) => {
        const periodStart = new Date(record.period_start);
        const periodEnd = new Date(record.period_end);
        return (
          periodStart > new Date(startDate) && periodEnd < new Date(endDate)
        );
      }),
    );
  }

  // Step 6: Test edge case with extreme future date (likely empty results)
  const distantFuture = new Date(Date.now() + 315360000000).toISOString(); // 10 years from now
  const emptyResults =
    await api.functional.communityPlatform.admin.voteLimits.index(connection, {
      body: {
        page: 1,
        limit: 10,
        period_after: distantFuture,
      } satisfies ICommunityPlatformVoteLimit.IRequest,
    });
  typia.assert(emptyResults);

  // Validate that extreme future date returns empty or valid results
  TestValidator.predicate(
    "period_after filter with distant future date returns valid pagination",
    emptyResults.pagination.current === 1 &&
      emptyResults.pagination.limit === 10 &&
      emptyResults.pagination.records >= 0 &&
      emptyResults.pagination.pages >= 0,
  );

  // Step 7: Validate pagination integrity across all tests
  const allResults = [
    initialResults,
    periodAfterResults,
    periodBeforeResults,
    combinedResults,
    emptyResults,
  ];

  for (const result of allResults) {
    TestValidator.predicate(
      "pagination metadata is correctly populated for all search results",
      result.pagination.current >= 0 &&
        result.pagination.limit > 0 &&
        result.pagination.records >= 0 &&
        result.pagination.pages >= 0,
    );
  }

  // Step 8: Test sorting by period timestamps
  const sortedByPeriodStart =
    await api.functional.communityPlatform.admin.voteLimits.index(connection, {
      body: {
        page: 1,
        limit: 5,
        sort_by: "period_start",
        order: "desc",
      } satisfies ICommunityPlatformVoteLimit.IRequest,
    });
  typia.assert(sortedByPeriodStart);

  // Validate sorting logic if we have multiple results
  if (sortedByPeriodStart.data.length > 1) {
    TestValidator.predicate(
      "records are sorted by period_start in descending order",
      sortedByPeriodStart.data.every((record, index, array) => {
        if (index === 0) return true;
        return (
          new Date(record.period_start) <=
          new Date(array[index - 1].period_start)
        );
      }),
    );
  }
}
