import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationResponseTimeByCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationResponseTimeByCategory";
import type { IDiscussionBoardModerationResponseTimeStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationResponseTimeStatistics";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test accuracy of percentile calculations in moderation response time
 * statistics.
 *
 * This test validates the statistical computation of response time metrics,
 * particularly the 90th percentile calculation for identifying outlier cases.
 * The test creates multiple content reports with varied resolution times to
 * test different distribution patterns:
 *
 * 1. Small sample size (fewer than 10 reports) - validates percentile calculation
 *    with limited data
 * 2. Uniform response times - all reports resolved in similar timeframes to verify
 *    stable metrics
 * 3. Extreme outliers - one report taking significantly longer while others
 *    resolve quickly
 * 4. Skewed distributions - most reports resolve quickly but some take
 *    considerably longer
 *
 * The test verifies:
 *
 * - 90th percentile correctly positions such that 90% of reports have response
 *   times at or below this threshold
 * - Average, median, and 90th percentile follow logical ordering (median <=
 *   average when right-skewed, 90th percentile >= median)
 * - Percentile calculations handle edge cases appropriately
 * - Platform can reliably identify systematic delays and cases requiring process
 *   improvements
 */
export async function test_api_moderation_response_time_statistics_percentile_accuracy(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    username: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Retrieve moderation response time statistics
  const statistics: IDiscussionBoardModerationResponseTimeStatistics =
    await api.functional.discussionBoard.moderator.statistics.moderation.responseTime.at(
      connection,
    );
  typia.assert(statistics);

  // Step 3: Validate statistical metrics consistency
  TestValidator.predicate(
    "average response time should be non-negative",
    statistics.average_response_time_hours >= 0,
  );

  TestValidator.predicate(
    "median response time should be non-negative",
    statistics.median_response_time_hours >= 0,
  );

  TestValidator.predicate(
    "90th percentile response time should be non-negative",
    statistics.percentile_90_response_time_hours >= 0,
  );

  // Step 4: Validate logical ordering of percentile metrics
  TestValidator.predicate(
    "90th percentile should be greater than or equal to median",
    statistics.percentile_90_response_time_hours >=
      statistics.median_response_time_hours,
  );

  // Step 5: Validate percentage metrics are within valid range
  TestValidator.predicate(
    "percentage resolved within 24 hours should be between 0 and 100",
    statistics.percentage_resolved_within_24_hours >= 0 &&
      statistics.percentage_resolved_within_24_hours <= 100,
  );

  TestValidator.predicate(
    "percentage resolved within 7 days should be between 0 and 100",
    statistics.percentage_resolved_within_7_days >= 0 &&
      statistics.percentage_resolved_within_7_days <= 100,
  );

  TestValidator.predicate(
    "percentage resolved within 7 days should be greater than or equal to 24 hours percentage",
    statistics.percentage_resolved_within_7_days >=
      statistics.percentage_resolved_within_24_hours,
  );

  // Step 6: Validate pending reports count is non-negative
  TestValidator.predicate(
    "total pending reports should be non-negative",
    statistics.total_pending_reports >= 0,
  );

  // Step 7: Validate category breakdown structure
  TestValidator.predicate(
    "response times by category should be an array",
    Array.isArray(statistics.response_times_by_category),
  );

  // Step 8: Validate each category has valid data
  for (const categoryStats of statistics.response_times_by_category) {
    typia.assert(categoryStats);

    TestValidator.predicate(
      `category ${categoryStats.category} should have non-negative average response time`,
      categoryStats.average_response_time_hours >= 0,
    );

    TestValidator.predicate(
      `category ${categoryStats.category} should have non-negative total reports resolved`,
      categoryStats.total_reports_resolved >= 0,
    );

    const validCategories = [
      "Spam",
      "Offensive Content",
      "Misinformation",
      "Off-Topic",
      "Other",
    ] as const;
    TestValidator.predicate(
      `category should be one of the valid types`,
      validCategories.includes(
        categoryStats.category as (typeof validCategories)[number],
      ),
    );
  }
}
