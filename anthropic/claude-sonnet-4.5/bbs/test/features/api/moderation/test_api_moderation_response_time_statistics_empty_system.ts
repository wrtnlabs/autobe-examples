import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationResponseTimeByCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationResponseTimeByCategory";
import type { IDiscussionBoardModerationResponseTimeStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationResponseTimeStatistics";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderation response time statistics retrieval when no content reports
 * exist in the system.
 *
 * This test validates the endpoint's behavior in a fresh system or after data
 * cleanup where the discussion_board_content_reports table is empty or contains
 * no resolved reports.
 *
 * The test confirms that the endpoint returns a valid statistical structure
 * with zero or null values appropriately representing the empty dataset state.
 * This ensures the API gracefully handles edge cases where no data exists for
 * analysis.
 *
 * Steps:
 *
 * 1. Register and authenticate as a moderator
 * 2. Retrieve moderation response time statistics (with no reports in system)
 * 3. Validate response structure passes type validation
 * 4. Verify statistical values appropriately represent empty dataset (zeros)
 * 5. Confirm category breakdown array exists and is valid
 */
export async function test_api_moderation_response_time_statistics_empty_system(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "SecurePassword123!",
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Retrieve moderation response time statistics (empty system - no reports)
  const statistics =
    await api.functional.discussionBoard.moderator.statistics.moderation.responseTime.at(
      connection,
    );
  typia.assert(statistics);

  // Step 3: Validate statistical values represent empty dataset appropriately
  TestValidator.predicate(
    "average response time should be 0 when no reports exist",
    statistics.average_response_time_hours === 0,
  );

  TestValidator.predicate(
    "median response time should be 0 when no reports exist",
    statistics.median_response_time_hours === 0,
  );

  TestValidator.predicate(
    "90th percentile response time should be 0 when no reports exist",
    statistics.percentile_90_response_time_hours === 0,
  );

  TestValidator.predicate(
    "percentage resolved within 24 hours should be 0 when no reports exist",
    statistics.percentage_resolved_within_24_hours === 0,
  );

  TestValidator.predicate(
    "percentage resolved within 7 days should be 0 when no reports exist",
    statistics.percentage_resolved_within_7_days === 0,
  );

  TestValidator.predicate(
    "total pending reports should be 0 in empty system",
    statistics.total_pending_reports === 0,
  );

  // Step 4: Validate category breakdown array exists and is valid
  TestValidator.predicate(
    "response times by category array should exist",
    Array.isArray(statistics.response_times_by_category),
  );

  // Step 5: If category breakdown has entries, verify they all show zero counts
  if (statistics.response_times_by_category.length > 0) {
    statistics.response_times_by_category.forEach((categoryStats) => {
      TestValidator.predicate(
        "category statistics should have 0 average response time in empty system",
        categoryStats.average_response_time_hours === 0,
      );

      TestValidator.predicate(
        "category statistics should have 0 total reports resolved in empty system",
        categoryStats.total_reports_resolved === 0,
      );
    });
  }
}
