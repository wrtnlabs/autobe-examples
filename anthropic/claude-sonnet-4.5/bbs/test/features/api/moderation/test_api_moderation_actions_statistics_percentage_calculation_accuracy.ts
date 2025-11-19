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
 * Test accuracy of percentage calculations in moderation action statistics.
 *
 * This test validates that percentage values returned by the statistics API are
 * mathematically correct and consistent. It verifies that percentages
 * accurately represent each action type's proportion of total activity, that
 * all percentages sum to 100% (within floating-point tolerance), and that the
 * relationship between action_count, total_actions, and percentage is
 * mathematically sound.
 *
 * Steps:
 *
 * 1. Authenticate as moderator to access statistics endpoint
 * 2. Retrieve moderation statistics with various filter combinations
 * 3. Validate percentage calculation accuracy for all returned statistics
 * 4. Verify sum of all percentages equals 100% within tolerance
 * 5. Verify each percentage matches (action_count / total_actions) * 100
 * 6. Validate response structure and data consistency
 */
export async function test_api_moderation_actions_statistics_percentage_calculation_accuracy(
  connection: api.IConnection,
) {
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(10);

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "SecurePass123!",
      username: moderatorUsername,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  const allStatistics =
    await api.functional.discussionBoard.moderator.statistics.moderation.actionsByType.index(
      connection,
      {
        body: {} satisfies IDiscussionBoardModerationStatisticsByType.IRequest,
      },
    );
  typia.assert(allStatistics);

  TestValidator.predicate(
    "total_actions must be non-negative",
    allStatistics.total_actions >= 0,
  );

  TestValidator.predicate(
    "statistics array must be valid",
    Array.isArray(allStatistics.statistics),
  );

  if (allStatistics.total_actions > 0 && allStatistics.statistics.length > 0) {
    let percentageSum = 0;

    for (const stat of allStatistics.statistics) {
      TestValidator.predicate(
        "action_count must be non-negative",
        stat.action_count >= 0,
      );

      TestValidator.predicate(
        "percentage must be within valid range 0-100",
        stat.percentage >= 0 && stat.percentage <= 100,
      );

      const expectedPercentage =
        (stat.action_count / allStatistics.total_actions) * 100;

      TestValidator.predicate(
        `percentage for ${stat.action_type} matches calculated value`,
        Math.abs(stat.percentage - expectedPercentage) < 0.01,
      );

      percentageSum += stat.percentage;
    }

    TestValidator.predicate(
      "sum of all percentages equals 100% within floating-point tolerance",
      Math.abs(percentageSum - 100) < 0.1,
    );

    const sumOfCounts = allStatistics.statistics.reduce(
      (sum, stat) => sum + stat.action_count,
      0,
    );

    TestValidator.equals(
      "sum of action_counts equals total_actions",
      sumOfCounts,
      allStatistics.total_actions,
    );
  } else if (allStatistics.total_actions === 0) {
    TestValidator.equals(
      "statistics array should be empty when total_actions is zero",
      allStatistics.statistics.length,
      0,
    );
  }

  const actionTypes = [
    "article_edited",
    "article_deleted",
    "attachment_removed",
    "account_suspended",
    "account_banned",
    "account_restored",
  ] as const;

  const filteredStatistics =
    await api.functional.discussionBoard.moderator.statistics.moderation.actionsByType.index(
      connection,
      {
        body: {
          action_types: [actionTypes[0], actionTypes[1]],
        } satisfies IDiscussionBoardModerationStatisticsByType.IRequest,
      },
    );
  typia.assert(filteredStatistics);

  if (filteredStatistics.total_actions > 0) {
    let filteredPercentageSum = 0;

    for (const stat of filteredStatistics.statistics) {
      const expectedPercentage =
        (stat.action_count / filteredStatistics.total_actions) * 100;

      TestValidator.predicate(
        `filtered percentage for ${stat.action_type} is accurate`,
        Math.abs(stat.percentage - expectedPercentage) < 0.01,
      );

      filteredPercentageSum += stat.percentage;
    }

    TestValidator.predicate(
      "filtered statistics percentages sum to 100%",
      Math.abs(filteredPercentageSum - 100) < 0.1,
    );
  }
}
