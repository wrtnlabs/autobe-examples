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
 * Test moderation action statistics endpoint with moderator_ids filter.
 *
 * This test validates that the statistics endpoint correctly processes the
 * moderator_ids filter parameter and returns properly structured responses.
 * Since we cannot create actual moderation logs through available APIs, this
 * test focuses on validating filter parameter handling and response structure
 * correctness.
 *
 * Test Flow:
 *
 * 1. Create multiple moderator accounts
 * 2. Query statistics with single moderator_ids filter
 * 3. Query statistics with multiple moderator_ids filter
 * 4. Query statistics with combined filters (moderator_ids + date_range)
 * 5. Query statistics with combined filters (moderator_ids + action_types)
 * 6. Validate response structure matches schema for all queries
 * 7. Verify filter parameters are accepted without errors
 */
export async function test_api_moderation_actions_statistics_moderator_workload_analysis(
  connection: api.IConnection,
) {
  // Create first moderator account
  const moderatorA: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: `mod_a_${RandomGenerator.alphaNumeric(8)}`,
        display_name: "Moderator Alpha",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderatorA);

  // Create second moderator account
  const moderatorB: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: `mod_b_${RandomGenerator.alphaNumeric(8)}`,
        display_name: "Moderator Beta",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderatorB);

  // Create third moderator account
  const moderatorC: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: `mod_c_${RandomGenerator.alphaNumeric(8)}`,
        display_name: "Moderator Gamma",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderatorC);

  // Test 1: Query statistics filtered by single moderator ID
  const singleModeratorStats: IDiscussionBoardModerationStatisticsByType =
    await api.functional.discussionBoard.moderator.statistics.moderation.actionsByType.index(
      connection,
      {
        body: {
          moderator_ids: [moderatorA.id],
        } satisfies IDiscussionBoardModerationStatisticsByType.IRequest,
      },
    );
  typia.assert(singleModeratorStats);

  // Validate response structure for single moderator query
  TestValidator.predicate(
    "single moderator statistics should have statistics array",
    Array.isArray(singleModeratorStats.statistics),
  );
  TestValidator.predicate(
    "single moderator total_actions should be non-negative integer",
    Number.isInteger(singleModeratorStats.total_actions) &&
      singleModeratorStats.total_actions >= 0,
  );
  TestValidator.predicate(
    "single moderator date_range should be defined",
    singleModeratorStats.date_range !== null &&
      singleModeratorStats.date_range !== undefined,
  );
  TestValidator.predicate(
    "date_range should have start_date",
    typeof singleModeratorStats.date_range.start_date === "string",
  );
  TestValidator.predicate(
    "date_range should have end_date",
    typeof singleModeratorStats.date_range.end_date === "string",
  );

  // Test 2: Query statistics filtered by multiple moderator IDs
  const multiModeratorStats: IDiscussionBoardModerationStatisticsByType =
    await api.functional.discussionBoard.moderator.statistics.moderation.actionsByType.index(
      connection,
      {
        body: {
          moderator_ids: [moderatorA.id, moderatorB.id],
        } satisfies IDiscussionBoardModerationStatisticsByType.IRequest,
      },
    );
  typia.assert(multiModeratorStats);

  // Validate response structure for multiple moderators query
  TestValidator.predicate(
    "multiple moderator statistics should have statistics array",
    Array.isArray(multiModeratorStats.statistics),
  );
  TestValidator.predicate(
    "multiple moderator total_actions should be non-negative integer",
    Number.isInteger(multiModeratorStats.total_actions) &&
      multiModeratorStats.total_actions >= 0,
  );

  // Test 3: Query statistics for third moderator only
  const moderatorCStats: IDiscussionBoardModerationStatisticsByType =
    await api.functional.discussionBoard.moderator.statistics.moderation.actionsByType.index(
      connection,
      {
        body: {
          moderator_ids: [moderatorC.id],
        } satisfies IDiscussionBoardModerationStatisticsByType.IRequest,
      },
    );
  typia.assert(moderatorCStats);

  TestValidator.predicate(
    "moderatorC statistics should have valid structure",
    Array.isArray(moderatorCStats.statistics) &&
      Number.isInteger(moderatorCStats.total_actions) &&
      moderatorCStats.total_actions >= 0,
  );

  // Test 4: Validate statistics array items if present
  if (singleModeratorStats.statistics.length > 0) {
    for (const stat of singleModeratorStats.statistics) {
      TestValidator.predicate(
        "each statistic should have valid action_type",
        [
          "article_edited",
          "article_deleted",
          "attachment_removed",
          "account_suspended",
          "account_banned",
          "account_restored",
        ].includes(stat.action_type),
      );
      TestValidator.predicate(
        "each statistic should have non-negative action_count",
        Number.isInteger(stat.action_count) && stat.action_count >= 0,
      );
      TestValidator.predicate(
        "each statistic should have valid percentage",
        typeof stat.percentage === "number" &&
          stat.percentage >= 0 &&
          stat.percentage <= 100,
      );
    }

    // Validate percentage sum
    const totalPercentage = singleModeratorStats.statistics.reduce(
      (sum, stat) => sum + stat.percentage,
      0,
    );
    TestValidator.predicate(
      "percentages should sum to approximately 100 when actions exist",
      Math.abs(totalPercentage - 100) < 0.01,
    );
  }

  // Test 5: Query with date range filter combined with moderator_ids
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dateFilteredStats: IDiscussionBoardModerationStatisticsByType =
    await api.functional.discussionBoard.moderator.statistics.moderation.actionsByType.index(
      connection,
      {
        body: {
          moderator_ids: [moderatorA.id],
          start_date: thirtyDaysAgo.toISOString(),
          end_date: now.toISOString(),
        } satisfies IDiscussionBoardModerationStatisticsByType.IRequest,
      },
    );
  typia.assert(dateFilteredStats);

  TestValidator.predicate(
    "date-filtered statistics should have valid structure",
    Array.isArray(dateFilteredStats.statistics) &&
      Number.isInteger(dateFilteredStats.total_actions) &&
      dateFilteredStats.total_actions >= 0,
  );

  // Test 6: Query with action_types filter combined with moderator_ids
  const actionTypes = ["article_edited", "article_deleted"] as const;
  const actionFilteredStats: IDiscussionBoardModerationStatisticsByType =
    await api.functional.discussionBoard.moderator.statistics.moderation.actionsByType.index(
      connection,
      {
        body: {
          moderator_ids: [moderatorA.id, moderatorB.id],
          action_types: [...actionTypes],
        } satisfies IDiscussionBoardModerationStatisticsByType.IRequest,
      },
    );
  typia.assert(actionFilteredStats);

  // Validate that if statistics are returned, they only contain specified action types
  TestValidator.predicate(
    "action-filtered statistics should only contain specified action types if any exist",
    actionFilteredStats.statistics.every((stat) =>
      actionTypes.includes(stat.action_type as (typeof actionTypes)[number]),
    ),
  );

  // Test 7: Query with all filters combined
  const fullyFilteredStats: IDiscussionBoardModerationStatisticsByType =
    await api.functional.discussionBoard.moderator.statistics.moderation.actionsByType.index(
      connection,
      {
        body: {
          moderator_ids: [moderatorA.id, moderatorB.id, moderatorC.id],
          start_date: thirtyDaysAgo.toISOString(),
          end_date: now.toISOString(),
          action_types: [
            "article_edited",
            "article_deleted",
            "attachment_removed",
            "account_suspended",
          ],
        } satisfies IDiscussionBoardModerationStatisticsByType.IRequest,
      },
    );
  typia.assert(fullyFilteredStats);

  TestValidator.predicate(
    "fully filtered statistics should have valid structure",
    Array.isArray(fullyFilteredStats.statistics) &&
      Number.isInteger(fullyFilteredStats.total_actions) &&
      fullyFilteredStats.total_actions >= 0,
  );

  // Test 8: Query without any filters to get all moderation statistics
  const allStats: IDiscussionBoardModerationStatisticsByType =
    await api.functional.discussionBoard.moderator.statistics.moderation.actionsByType.index(
      connection,
      {
        body: {} satisfies IDiscussionBoardModerationStatisticsByType.IRequest,
      },
    );
  typia.assert(allStats);

  TestValidator.predicate(
    "unfiltered statistics should have valid structure",
    Array.isArray(allStats.statistics) &&
      Number.isInteger(allStats.total_actions) &&
      allStats.total_actions >= 0,
  );
}
