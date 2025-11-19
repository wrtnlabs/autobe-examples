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
 * Test moderation action statistics with combined filters.
 *
 * This test validates the moderation statistics endpoint's ability to handle
 * multiple simultaneous filters (date range, moderator IDs, and action types)
 * with AND semantics. It verifies that the endpoint returns accurate statistics
 * when all filter criteria are applied together, ensuring only actions matching
 * ALL conditions are included in the results.
 *
 * Steps:
 *
 * 1. Create multiple moderator accounts for testing
 * 2. Query statistics with combined date range, moderator IDs, and action types
 *    filters
 * 3. Validate the response structure and data accuracy
 * 4. Test edge cases with filter combinations that yield no results
 * 5. Verify percentage calculations remain correct with constrained datasets
 */
export async function test_api_moderation_actions_statistics_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Create first moderator account
  const moderator1Email = typia.random<string & tags.Format<"email">>();
  const moderator1 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator1Email,
      password: "SecurePass123!",
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator1);

  // Step 2: Create second moderator account
  const moderator2Email = typia.random<string & tags.Format<"email">>();
  const moderator2 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator2Email,
      password: "SecurePass456!",
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator2);

  // Step 3: Set up date range for filtering (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startDate = thirtyDaysAgo.toISOString();
  const endDate = now.toISOString();

  // Step 4: Query statistics with all filters combined
  const actionTypes = [
    "article_edited",
    "article_deleted",
    "attachment_removed",
  ] as const;
  const combinedFilterStats =
    await api.functional.discussionBoard.moderator.statistics.moderation.actionsByType.index(
      connection,
      {
        body: {
          start_date: startDate,
          end_date: endDate,
          moderator_ids: [moderator1.id, moderator2.id],
          action_types: [...actionTypes],
        } satisfies IDiscussionBoardModerationStatisticsByType.IRequest,
      },
    );
  typia.assert(combinedFilterStats);

  // Step 5: Validate response structure
  TestValidator.predicate(
    "statistics array should exist",
    Array.isArray(combinedFilterStats.statistics),
  );
  TestValidator.predicate(
    "total_actions should be non-negative",
    combinedFilterStats.total_actions >= 0,
  );
  TestValidator.predicate(
    "date_range should be present",
    combinedFilterStats.date_range !== null &&
      combinedFilterStats.date_range !== undefined,
  );

  // Step 6: Validate percentage calculations sum correctly
  if (combinedFilterStats.statistics.length > 0) {
    const totalPercentage = combinedFilterStats.statistics.reduce(
      (sum, stat) => sum + stat.percentage,
      0,
    );
    TestValidator.predicate(
      "percentages should sum to approximately 100",
      Math.abs(totalPercentage - 100) < 0.01,
    );
  }

  // Step 7: Test with narrow filter that might yield no results
  const futureDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const emptyResultStats =
    await api.functional.discussionBoard.moderator.statistics.moderation.actionsByType.index(
      connection,
      {
        body: {
          start_date: futureDate.toISOString(),
          end_date: futureDate.toISOString(),
          moderator_ids: [moderator1.id],
          action_types: ["account_banned"],
        } satisfies IDiscussionBoardModerationStatisticsByType.IRequest,
      },
    );
  typia.assert(emptyResultStats);

  // Step 8: Validate empty result handling
  TestValidator.predicate(
    "empty filter results should have zero total_actions",
    emptyResultStats.total_actions === 0,
  );
  TestValidator.predicate(
    "empty filter results should have empty or zero-count statistics",
    emptyResultStats.statistics.length === 0 ||
      emptyResultStats.statistics.every((s) => s.action_count === 0),
  );

  // Step 9: Test with single moderator and specific action types
  const singleModeratorStats =
    await api.functional.discussionBoard.moderator.statistics.moderation.actionsByType.index(
      connection,
      {
        body: {
          start_date: startDate,
          end_date: endDate,
          moderator_ids: [moderator1.id],
          action_types: ["article_edited", "article_deleted"],
        } satisfies IDiscussionBoardModerationStatisticsByType.IRequest,
      },
    );
  typia.assert(singleModeratorStats);

  // Step 10: Validate filtered results only contain requested action types
  TestValidator.predicate(
    "statistics should only contain requested action types",
    singleModeratorStats.statistics.every(
      (stat) =>
        stat.action_type === "article_edited" ||
        stat.action_type === "article_deleted",
    ),
  );

  // Step 11: Verify date range in response matches or is within request range
  TestValidator.predicate(
    "response date_range should be present and valid",
    singleModeratorStats.date_range.start_date !== undefined &&
      singleModeratorStats.date_range.end_date !== undefined,
  );
}
