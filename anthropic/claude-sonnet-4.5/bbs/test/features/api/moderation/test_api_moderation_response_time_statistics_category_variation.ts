import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationResponseTimeByCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationResponseTimeByCategory";
import type { IDiscussionBoardModerationResponseTimeStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationResponseTimeStatistics";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderation response time statistics with category variation.
 *
 * This test validates that the moderation response time statistics endpoint
 * correctly computes and returns category-specific performance metrics. It
 * verifies that different report categories (Spam, Offensive Content,
 * Misinformation, Off-Topic, Other) can have distinct response time
 * characteristics and that the endpoint provides accurate breakdowns.
 *
 * Test Flow:
 *
 * 1. Register a new moderator account
 * 2. Retrieve moderation response time statistics
 * 3. Validate overall statistics structure and metrics
 * 4. Verify category-specific breakdowns exist
 * 5. Ensure each category has valid response times and report counts
 */
export async function test_api_moderation_response_time_statistics_category_variation(
  connection: api.IConnection,
) {
  // Step 1: Register moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorUsername = RandomGenerator.alphaNumeric(12);

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
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

  // Step 3: Validate overall statistics structure
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

  TestValidator.predicate(
    "total pending reports is non-negative",
    statistics.total_pending_reports >= 0,
  );

  // Step 4: Validate category breakdowns exist
  TestValidator.predicate(
    "category breakdown array exists",
    Array.isArray(statistics.response_times_by_category),
  );

  // Step 5: Validate each category has valid metrics
  for (const categoryData of statistics.response_times_by_category) {
    typia.assert<IDiscussionBoardModerationResponseTimeByCategory>(
      categoryData,
    );

    TestValidator.predicate(
      `category ${categoryData.category} has non-negative average response time`,
      categoryData.average_response_time_hours >= 0,
    );

    TestValidator.predicate(
      `category ${categoryData.category} has non-negative report count`,
      categoryData.total_reports_resolved >= 0,
    );
  }

  // Step 6: Verify valid category values
  const validCategories = [
    "Spam",
    "Offensive Content",
    "Misinformation",
    "Off-Topic",
    "Other",
  ] as const;

  for (const categoryData of statistics.response_times_by_category) {
    TestValidator.predicate(
      `category ${categoryData.category} is a valid category type`,
      validCategories.includes(categoryData.category),
    );
  }
}
