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
 * Test retrieval of moderation action statistics grouped by action type without
 * filters.
 *
 * This test validates that the statistics endpoint correctly aggregates
 * moderation logs from the discussion_board_moderation_logs table and groups
 * them by action_type. It verifies system-wide metrics including complete
 * statistics array with action counts, accurate percentage calculations, and
 * proper total_actions summation.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Retrieve moderation statistics without any filters (system-wide)
 * 3. Validate response structure and data integrity
 * 4. Verify percentage calculations and total_actions accuracy
 * 5. Confirm date_range reflects actual data temporal span
 */
export async function test_api_moderation_actions_statistics_all_action_types(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
    username: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Retrieve moderation statistics without any filters (system-wide)
  const requestBody =
    {} satisfies IDiscussionBoardModerationStatisticsByType.IRequest;

  const statistics: IDiscussionBoardModerationStatisticsByType =
    await api.functional.discussionBoard.moderator.statistics.moderation.actionsByType.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(statistics);

  // Step 3: Validate business logic - total_actions accuracy
  TestValidator.predicate(
    "total_actions should be non-negative",
    statistics.total_actions >= 0,
  );

  // Step 4: Verify percentage calculations and total_actions accuracy
  const calculatedTotal = statistics.statistics.reduce(
    (sum, stat) => sum + stat.action_count,
    0,
  );

  TestValidator.equals(
    "total_actions should equal sum of all action_counts",
    statistics.total_actions,
    calculatedTotal,
  );

  // Verify percentage calculations for each action type
  for (const stat of statistics.statistics) {
    typia.assert(stat);

    TestValidator.predicate(
      `action_count for ${stat.action_type} should be non-negative`,
      stat.action_count >= 0,
    );

    TestValidator.predicate(
      `percentage for ${stat.action_type} should be between 0 and 100`,
      stat.percentage >= 0 && stat.percentage <= 100,
    );

    if (statistics.total_actions > 0) {
      const expectedPercentage =
        (stat.action_count / statistics.total_actions) * 100;
      TestValidator.predicate(
        `percentage for ${stat.action_type} should be calculated correctly`,
        Math.abs(stat.percentage - expectedPercentage) < 0.01,
      );
    }
  }

  // Step 5: Validate date_range structure
  typia.assert(statistics.date_range);
}
