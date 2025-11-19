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
 * Test moderation action statistics filtered by specific action types to focus
 * analysis on particular enforcement categories.
 *
 * This test validates the action_types filter for computing statistics on
 * selected moderation action categories. The test verifies that only moderation
 * logs matching the specified action_type values are included in results, that
 * the statistics array contains entries only for the requested action types,
 * and that total_actions reflects the sum of only the filtered action types
 * rather than all platform activity.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Query statistics with content-only moderation actions filter
 * 3. Validate that statistics contain only the requested action types
 * 4. Verify total_actions equals sum of filtered action counts
 * 5. Test account management actions filtering
 * 6. Test combined action types filtering
 * 7. Verify percentage calculations within filtered subsets
 * 8. Verify date_range is properly populated
 */
export async function test_api_moderation_actions_statistics_action_type_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Test content-only moderation actions filtering
  const contentActionTypes = [
    "article_edited",
    "article_deleted",
    "attachment_removed",
  ] as const;
  const contentStats =
    await api.functional.discussionBoard.moderator.statistics.moderation.actionsByType.index(
      connection,
      {
        body: {
          action_types: [...contentActionTypes],
        } satisfies IDiscussionBoardModerationStatisticsByType.IRequest,
      },
    );
  typia.assert(contentStats);

  // Step 3: Validate statistics contain only requested action types
  for (const stat of contentStats.statistics) {
    TestValidator.predicate(
      "statistic action_type must be in filtered list",
      contentActionTypes.includes(stat.action_type as any),
    );
  }

  // Step 4: Verify total_actions equals sum of filtered action counts
  const contentSum = contentStats.statistics.reduce(
    (sum, stat) => sum + stat.action_count,
    0,
  );
  TestValidator.equals(
    "total_actions matches sum of filtered action counts",
    contentStats.total_actions,
    contentSum,
  );

  // Verify when statistics array is empty, total_actions is 0
  if (contentStats.statistics.length === 0) {
    TestValidator.equals(
      "empty statistics should have zero total_actions",
      contentStats.total_actions,
      0,
    );
  }

  // Step 5: Test account management actions filtering
  const accountActionTypes = [
    "account_suspended",
    "account_banned",
    "account_restored",
  ] as const;
  const accountStats =
    await api.functional.discussionBoard.moderator.statistics.moderation.actionsByType.index(
      connection,
      {
        body: {
          action_types: [...accountActionTypes],
        } satisfies IDiscussionBoardModerationStatisticsByType.IRequest,
      },
    );
  typia.assert(accountStats);

  // Validate only account management action types are returned
  for (const stat of accountStats.statistics) {
    TestValidator.predicate(
      "account action_type must be in filtered list",
      accountActionTypes.includes(stat.action_type as any),
    );
  }

  const accountSum = accountStats.statistics.reduce(
    (sum, stat) => sum + stat.action_count,
    0,
  );
  TestValidator.equals(
    "account total_actions matches filtered sum",
    accountStats.total_actions,
    accountSum,
  );

  // Step 6: Test single action type filtering
  const singleActionStats =
    await api.functional.discussionBoard.moderator.statistics.moderation.actionsByType.index(
      connection,
      {
        body: {
          action_types: ["article_deleted"],
        } satisfies IDiscussionBoardModerationStatisticsByType.IRequest,
      },
    );
  typia.assert(singleActionStats);

  // Verify only one action type in results
  for (const stat of singleActionStats.statistics) {
    TestValidator.equals(
      "single filter returns only requested action type",
      stat.action_type,
      "article_deleted",
    );
  }

  // Step 7: Verify percentage calculations are meaningful within filtered subset
  for (const stat of contentStats.statistics) {
    TestValidator.predicate(
      "percentage must be between 0 and 100",
      stat.percentage >= 0 && stat.percentage <= 100,
    );

    // Verify percentage calculation accuracy
    if (contentStats.total_actions > 0) {
      const expectedPercentage =
        (stat.action_count / contentStats.total_actions) * 100;
      TestValidator.predicate(
        "percentage calculation matches expected value",
        Math.abs(stat.percentage - expectedPercentage) < 0.01,
      );
    }
  }

  // Step 8: Test combined filtering with mixed action types
  const mixedActionTypes = ["article_edited", "account_suspended"] as const;
  const mixedStats =
    await api.functional.discussionBoard.moderator.statistics.moderation.actionsByType.index(
      connection,
      {
        body: {
          action_types: [...mixedActionTypes],
        } satisfies IDiscussionBoardModerationStatisticsByType.IRequest,
      },
    );
  typia.assert(mixedStats);

  // Validate mixed filtering
  for (const stat of mixedStats.statistics) {
    TestValidator.predicate(
      "mixed action_type must be in filtered list",
      mixedActionTypes.includes(stat.action_type as any),
    );
  }

  const mixedSum = mixedStats.statistics.reduce(
    (sum, stat) => sum + stat.action_count,
    0,
  );
  TestValidator.equals(
    "mixed total_actions matches filtered sum",
    mixedStats.total_actions,
    mixedSum,
  );

  // Step 9: Verify date_range is properly populated in all responses
  typia.assert(contentStats.date_range);
  typia.assert(accountStats.date_range);
  typia.assert(singleActionStats.date_range);
  typia.assert(mixedStats.date_range);

  // Verify date_range has valid start_date and end_date
  TestValidator.predicate(
    "date_range start_date is valid",
    contentStats.date_range.start_date.length > 0,
  );
  TestValidator.predicate(
    "date_range end_date is valid",
    contentStats.date_range.end_date.length > 0,
  );

  // Step 10: Test filtering excludes non-requested action types
  const allActionTypes = [
    "article_edited",
    "article_deleted",
    "attachment_removed",
    "account_suspended",
    "account_banned",
    "account_restored",
  ] as const;

  for (const stat of contentStats.statistics) {
    const excludedTypes = allActionTypes.filter(
      (type) => !contentActionTypes.includes(type as any),
    );
    TestValidator.predicate(
      "excluded action types must not appear in filtered results",
      !excludedTypes.includes(stat.action_type as any),
    );
  }
}
