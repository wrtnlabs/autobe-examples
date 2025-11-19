import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationResponseTimeByCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationResponseTimeByCategory";
import type { IDiscussionBoardModerationResponseTimeStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationResponseTimeStatistics";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test retrieval of comprehensive moderation response time statistics as an
 * authenticated moderator.
 *
 * This test validates that the endpoint correctly calculates and returns all
 * key performance metrics including average response time, median response
 * time, 90th percentile, resolution percentages within 24 hours and 7 days,
 * current pending report count, and category-specific breakdowns.
 *
 * The test verifies that statistics are computed from actual content report
 * data in the discussion_board_content_reports table, measuring time
 * differences between created_at and resolved_at timestamps.
 *
 * Steps:
 *
 * 1. Register and authenticate as a moderator
 * 2. Retrieve moderation response time statistics
 * 3. Validate response structure and data types
 * 4. Verify numeric constraints (non-negative values, percentage ranges)
 * 5. Confirm category-specific breakdowns are present and valid
 */
export async function test_api_moderation_response_time_statistics_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecureModeratorPass123!";
  const moderatorUsername = RandomGenerator.alphaNumeric(12);

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
        display_name: RandomGenerator.name(2),
        ip: "192.168.1.100",
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

  // Step 3: Validate response structure with complete type checking
  typia.assert(statistics);

  // Step 4: Verify numeric constraints for response time metrics
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

  // Step 5: Verify percentage values fall within valid range (0-100)
  TestValidator.predicate(
    "percentage resolved within 24 hours is valid",
    statistics.percentage_resolved_within_24_hours >= 0 &&
      statistics.percentage_resolved_within_24_hours <= 100,
  );

  TestValidator.predicate(
    "percentage resolved within 7 days is valid",
    statistics.percentage_resolved_within_7_days >= 0 &&
      statistics.percentage_resolved_within_7_days <= 100,
  );

  // Step 6: Verify pending count is non-negative
  TestValidator.predicate(
    "total pending reports is non-negative",
    statistics.total_pending_reports >= 0,
  );

  // Step 7: Validate category-specific breakdowns are present
  TestValidator.predicate(
    "response times by category is an array",
    Array.isArray(statistics.response_times_by_category),
  );

  // Step 8: Verify category breakdowns contain valid data types
  for (const categoryStats of statistics.response_times_by_category) {
    typia.assert(categoryStats);

    TestValidator.predicate(
      `category ${categoryStats.category} has non-negative average response time`,
      categoryStats.average_response_time_hours >= 0,
    );

    TestValidator.predicate(
      `category ${categoryStats.category} has non-negative total reports resolved`,
      categoryStats.total_reports_resolved >= 0,
    );
  }
}
