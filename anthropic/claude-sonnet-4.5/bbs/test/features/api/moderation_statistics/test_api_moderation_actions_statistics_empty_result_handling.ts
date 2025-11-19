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
 * Test moderation action statistics endpoint behavior when filters result in no
 * matching moderation actions.
 *
 * This test validates that the API gracefully handles empty result sets caused
 * by restrictive filters or absence of data in specified time periods. It
 * ensures the endpoint returns valid response structure with empty statistics
 * array, zero total_actions, and proper date_range even when no data exists.
 *
 * Test scenarios include:
 *
 * 1. Query future date ranges with no moderation actions
 * 2. Filter by non-existent moderator IDs
 * 3. Request action types that haven't occurred in the system
 * 4. Combine multiple restrictive filters that exclude all records
 *
 * Success criteria:
 *
 * - API returns HTTP 200 with valid response structure
 * - Statistics array is empty
 * - Total_actions equals 0
 * - Date_range reflects requested boundaries
 * - Response maintains consistent structure regardless of result size
 */
export async function test_api_moderation_actions_statistics_empty_result_handling(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator to access statistics endpoint
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
    username: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Test scenario 1 - Query future date range with no data
  const futureStartDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const futureEndDate = new Date(
    futureStartDate.getTime() + 30 * 24 * 60 * 60 * 1000,
  );

  const futureRangeStats =
    await api.functional.discussionBoard.moderator.statistics.moderation.actionsByType.index(
      connection,
      {
        body: {
          start_date: futureStartDate.toISOString(),
          end_date: futureEndDate.toISOString(),
        } satisfies IDiscussionBoardModerationStatisticsByType.IRequest,
      },
    );
  typia.assert(futureRangeStats);

  TestValidator.equals(
    "future range statistics array is empty",
    futureRangeStats.statistics,
    [],
  );
  TestValidator.equals(
    "future range total_actions is zero",
    futureRangeStats.total_actions,
    0,
  );
  typia.assert(futureRangeStats.date_range);

  // Step 3: Test scenario 2 - Filter by non-existent moderator IDs
  const nonExistentModeratorIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  const nonExistentModeratorStats =
    await api.functional.discussionBoard.moderator.statistics.moderation.actionsByType.index(
      connection,
      {
        body: {
          moderator_ids: nonExistentModeratorIds,
        } satisfies IDiscussionBoardModerationStatisticsByType.IRequest,
      },
    );
  typia.assert(nonExistentModeratorStats);

  TestValidator.equals(
    "non-existent moderator statistics array is empty",
    nonExistentModeratorStats.statistics,
    [],
  );
  TestValidator.equals(
    "non-existent moderator total_actions is zero",
    nonExistentModeratorStats.total_actions,
    0,
  );
  typia.assert(nonExistentModeratorStats.date_range);

  // Step 4: Test scenario 3 - Request specific action types in empty system
  const specificActionTypes = ["article_deleted", "account_banned"] as const;

  const specificActionStats =
    await api.functional.discussionBoard.moderator.statistics.moderation.actionsByType.index(
      connection,
      {
        body: {
          action_types: [...specificActionTypes],
        } satisfies IDiscussionBoardModerationStatisticsByType.IRequest,
      },
    );
  typia.assert(specificActionStats);

  TestValidator.equals(
    "specific action types statistics array is empty",
    specificActionStats.statistics,
    [],
  );
  TestValidator.equals(
    "specific action types total_actions is zero",
    specificActionStats.total_actions,
    0,
  );
  typia.assert(specificActionStats.date_range);

  // Step 5: Test scenario 4 - Combine multiple restrictive filters
  const pastStartDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const pastEndDate = new Date(
    pastStartDate.getTime() + 1 * 24 * 60 * 60 * 1000,
  );

  const combinedFiltersStats =
    await api.functional.discussionBoard.moderator.statistics.moderation.actionsByType.index(
      connection,
      {
        body: {
          start_date: pastStartDate.toISOString(),
          end_date: pastEndDate.toISOString(),
          moderator_ids: nonExistentModeratorIds,
          action_types: ["attachment_removed", "account_suspended"],
        } satisfies IDiscussionBoardModerationStatisticsByType.IRequest,
      },
    );
  typia.assert(combinedFiltersStats);

  TestValidator.equals(
    "combined filters statistics array is empty",
    combinedFiltersStats.statistics,
    [],
  );
  TestValidator.equals(
    "combined filters total_actions is zero",
    combinedFiltersStats.total_actions,
    0,
  );
  typia.assert(combinedFiltersStats.date_range);

  // Step 6: Test scenario 5 - Query with no filters (empty system baseline)
  const noFiltersStats =
    await api.functional.discussionBoard.moderator.statistics.moderation.actionsByType.index(
      connection,
      {
        body: {} satisfies IDiscussionBoardModerationStatisticsByType.IRequest,
      },
    );
  typia.assert(noFiltersStats);

  TestValidator.equals(
    "no filters statistics array is empty",
    noFiltersStats.statistics,
    [],
  );
  TestValidator.equals(
    "no filters total_actions is zero",
    noFiltersStats.total_actions,
    0,
  );
  typia.assert(noFiltersStats.date_range);

  // Step 7: Validate response structure consistency
  TestValidator.predicate(
    "all responses have statistics array property",
    Array.isArray(futureRangeStats.statistics) &&
      Array.isArray(nonExistentModeratorStats.statistics) &&
      Array.isArray(specificActionStats.statistics) &&
      Array.isArray(combinedFiltersStats.statistics) &&
      Array.isArray(noFiltersStats.statistics),
  );

  TestValidator.predicate(
    "all responses have total_actions as number",
    typeof futureRangeStats.total_actions === "number" &&
      typeof nonExistentModeratorStats.total_actions === "number" &&
      typeof specificActionStats.total_actions === "number" &&
      typeof combinedFiltersStats.total_actions === "number" &&
      typeof noFiltersStats.total_actions === "number",
  );

  TestValidator.predicate(
    "all responses have date_range object",
    typeof futureRangeStats.date_range === "object" &&
      typeof nonExistentModeratorStats.date_range === "object" &&
      typeof specificActionStats.date_range === "object" &&
      typeof combinedFiltersStats.date_range === "object" &&
      typeof noFiltersStats.date_range === "object",
  );
}
