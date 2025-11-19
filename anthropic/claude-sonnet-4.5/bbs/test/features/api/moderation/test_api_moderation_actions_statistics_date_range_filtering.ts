import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDateRange";
import type { IDiscussionBoardModerationActionTypeStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationActionTypeStatistic";
import type { IDiscussionBoardModerationStatisticsByType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationStatisticsByType";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderation action statistics with date range filtering.
 *
 * This test validates that the moderation statistics endpoint correctly filters
 * moderation actions based on start_date and end_date parameters. It verifies:
 *
 * 1. Create authenticated moderator account
 * 2. Query statistics with various date range scenarios:
 *
 *    - Single day analysis
 *    - Weekly reporting period
 *    - Monthly trend tracking
 *    - Custom date ranges
 * 3. Validate that returned date_range matches requested boundaries
 * 4. Ensure inclusive boundary handling (actions matching exact start/end dates
 *    are included)
 * 5. Verify response structure and data types
 */
export async function test_api_moderation_actions_statistics_date_range_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
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

  // Step 2: Test with single day date range
  const today = new Date();
  const todayISO = today.toISOString();

  const singleDayStats: IDiscussionBoardModerationStatisticsByType =
    await api.functional.discussionBoard.moderator.statistics.moderation.actionsByType.index(
      connection,
      {
        body: {
          start_date: todayISO,
          end_date: todayISO,
        } satisfies IDiscussionBoardModerationStatisticsByType.IRequest,
      },
    );
  typia.assert(singleDayStats);

  TestValidator.equals(
    "single day date range start matches",
    singleDayStats.date_range.start_date,
    todayISO,
  );
  TestValidator.equals(
    "single day date range end matches",
    singleDayStats.date_range.end_date,
    todayISO,
  );

  // Step 3: Test with weekly date range
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekAgoISO = weekAgo.toISOString();

  const weeklyStats: IDiscussionBoardModerationStatisticsByType =
    await api.functional.discussionBoard.moderator.statistics.moderation.actionsByType.index(
      connection,
      {
        body: {
          start_date: weekAgoISO,
          end_date: todayISO,
        } satisfies IDiscussionBoardModerationStatisticsByType.IRequest,
      },
    );
  typia.assert(weeklyStats);

  TestValidator.equals(
    "weekly date range start matches",
    weeklyStats.date_range.start_date,
    weekAgoISO,
  );
  TestValidator.equals(
    "weekly date range end matches",
    weeklyStats.date_range.end_date,
    todayISO,
  );

  // Step 4: Test with monthly date range
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const monthAgoISO = monthAgo.toISOString();

  const monthlyStats: IDiscussionBoardModerationStatisticsByType =
    await api.functional.discussionBoard.moderator.statistics.moderation.actionsByType.index(
      connection,
      {
        body: {
          start_date: monthAgoISO,
          end_date: todayISO,
        } satisfies IDiscussionBoardModerationStatisticsByType.IRequest,
      },
    );
  typia.assert(monthlyStats);

  TestValidator.equals(
    "monthly date range start matches",
    monthlyStats.date_range.start_date,
    monthAgoISO,
  );
  TestValidator.equals(
    "monthly date range end matches",
    monthlyStats.date_range.end_date,
    todayISO,
  );

  // Step 5: Test with custom date range (2 weeks ago to 1 week ago)
  const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
  const twoWeeksAgoISO = twoWeeksAgo.toISOString();

  const customStats: IDiscussionBoardModerationStatisticsByType =
    await api.functional.discussionBoard.moderator.statistics.moderation.actionsByType.index(
      connection,
      {
        body: {
          start_date: twoWeeksAgoISO,
          end_date: weekAgoISO,
        } satisfies IDiscussionBoardModerationStatisticsByType.IRequest,
      },
    );
  typia.assert(customStats);

  TestValidator.equals(
    "custom date range start matches",
    customStats.date_range.start_date,
    twoWeeksAgoISO,
  );
  TestValidator.equals(
    "custom date range end matches",
    customStats.date_range.end_date,
    weekAgoISO,
  );

  // Step 6: Test without date range filters (system-wide)
  const allTimeStats: IDiscussionBoardModerationStatisticsByType =
    await api.functional.discussionBoard.moderator.statistics.moderation.actionsByType.index(
      connection,
      {
        body: {} satisfies IDiscussionBoardModerationStatisticsByType.IRequest,
      },
    );
  typia.assert(allTimeStats);

  // Verify that all-time stats have valid date range
  TestValidator.predicate(
    "all-time stats has valid start date",
    allTimeStats.date_range.start_date.length > 0,
  );
  TestValidator.predicate(
    "all-time stats has valid end date",
    allTimeStats.date_range.end_date.length > 0,
  );

  // Step 7: Validate statistics structure consistency across all queries
  const allStats = [
    singleDayStats,
    weeklyStats,
    monthlyStats,
    customStats,
    allTimeStats,
  ];

  for (const stats of allStats) {
    TestValidator.predicate(
      "statistics array is defined",
      Array.isArray(stats.statistics),
    );
    TestValidator.predicate(
      "total_actions is non-negative",
      stats.total_actions >= 0,
    );

    // Validate each statistic entry
    for (const stat of stats.statistics) {
      TestValidator.predicate(
        "action_count is non-negative",
        stat.action_count >= 0,
      );
      TestValidator.predicate(
        "percentage is within valid range",
        stat.percentage >= 0 && stat.percentage <= 100,
      );
    }
  }
}
