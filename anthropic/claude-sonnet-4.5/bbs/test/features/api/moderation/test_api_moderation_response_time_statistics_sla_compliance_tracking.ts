import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationResponseTimeByCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationResponseTimeByCategory";
import type { IDiscussionBoardModerationResponseTimeStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationResponseTimeStatistics";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test SLA compliance tracking metrics in moderation response time statistics.
 *
 * This test validates that the moderation response time statistics endpoint
 * correctly computes SLA compliance percentages (24-hour and 7-day resolution
 * rates) and ensures these metrics follow proper business logic constraints.
 *
 * Process:
 *
 * 1. Authenticate as a moderator to gain access to statistics endpoint
 * 2. Retrieve moderation response time statistics
 * 3. Validate percentage calculations are within valid bounds (0-100)
 * 4. Verify 7-day percentage >= 24-hour percentage (mathematical constraint)
 * 5. Confirm response time metrics and category breakdowns are present
 * 6. Validate statistical consistency across all metrics
 */
export async function test_api_moderation_response_time_statistics_sla_compliance_tracking(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator to access statistics endpoint
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecureModPass123!",
        username: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve moderation response time statistics
  const statistics: IDiscussionBoardModerationResponseTimeStatistics =
    await api.functional.discussionBoard.moderator.statistics.moderation.responseTime.at(
      connection,
    );
  typia.assert(statistics);

  // Step 3: Validate percentage calculations are within valid bounds (0-100)
  TestValidator.predicate(
    "24-hour resolution percentage is within valid range",
    statistics.percentage_resolved_within_24_hours >= 0 &&
      statistics.percentage_resolved_within_24_hours <= 100,
  );

  TestValidator.predicate(
    "7-day resolution percentage is within valid range",
    statistics.percentage_resolved_within_7_days >= 0 &&
      statistics.percentage_resolved_within_7_days <= 100,
  );

  // Step 4: Verify 7-day percentage >= 24-hour percentage (24 hours is subset of 7 days)
  TestValidator.predicate(
    "7-day percentage should be greater than or equal to 24-hour percentage",
    statistics.percentage_resolved_within_7_days >=
      statistics.percentage_resolved_within_24_hours,
  );

  // Step 5: Validate response time metrics are non-negative
  TestValidator.predicate(
    "average response time is non-negative",
    statistics.average_response_time_hours >= 0,
  );

  TestValidator.predicate(
    "median response time is non-negative",
    statistics.median_response_time_hours >= 0,
  );

  TestValidator.predicate(
    "90th percentile response time is non-negative",
    statistics.percentile_90_response_time_hours >= 0,
  );

  // Step 6: Validate pending reports count is non-negative
  TestValidator.predicate(
    "total pending reports is non-negative",
    statistics.total_pending_reports >= 0,
  );

  // Step 7: Validate category breakdown exists and is properly structured
  TestValidator.predicate(
    "response times by category array exists",
    Array.isArray(statistics.response_times_by_category),
  );

  // Step 8: Validate each category breakdown has valid data
  statistics.response_times_by_category.forEach((categoryStats) => {
    typia.assert(categoryStats);

    TestValidator.predicate(
      `category ${categoryStats.category} has non-negative average response time`,
      categoryStats.average_response_time_hours >= 0,
    );

    TestValidator.predicate(
      `category ${categoryStats.category} has non-negative total reports`,
      categoryStats.total_reports_resolved >= 0,
    );
  });

  // Step 9: Validate statistical consistency - percentiles should follow logical order
  TestValidator.predicate(
    "median should be less than or equal to 90th percentile",
    statistics.median_response_time_hours <=
      statistics.percentile_90_response_time_hours,
  );
}
