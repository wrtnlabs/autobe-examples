import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationLog";

/**
 * Test filtering member moderation history by date range to analyze enforcement
 * patterns over time.
 *
 * This test validates that moderators can retrieve member enforcement actions
 * within specific time periods using from_date and to_date parameters. The test
 * verifies correct date range filtering for both recent activity (past 7 days,
 * 30 days) and historical reviews (past 6 months, 1 year).
 *
 * Test steps:
 *
 * 1. Create and authenticate a moderator account
 * 2. Query moderation history with only from_date (all actions after date)
 * 3. Query moderation history with only to_date (all actions before date)
 * 4. Query moderation history with bounded date range (both from_date and to_date)
 * 5. Validate pagination structure and response format
 * 6. Test various date range scenarios (7 days, 30 days, 6 months, 1 year)
 */
export async function test_api_member_moderation_history_filtered_by_date_range(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Verify authentication token is present
  TestValidator.predicate(
    "moderator authentication token exists",
    !!moderator.token.access,
  );

  // Generate a random member ID to query moderation history for
  const memberId = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Query with only from_date (past 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const fromDateOnlyRequest = {
    page: 1,
    limit: 20,
    from_date: sevenDaysAgo.toISOString(),
  } satisfies IDiscussionBoardModerationLog.IRequest;

  const fromDateOnlyResult: IPageIDiscussionBoardModerationLog.ISummary =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: memberId,
        body: fromDateOnlyRequest,
      },
    );
  typia.assert(fromDateOnlyResult);

  // Validate pagination structure
  TestValidator.predicate(
    "from_date filter returns valid pagination structure",
    fromDateOnlyResult.pagination.current === 1 &&
      fromDateOnlyResult.pagination.limit === 20 &&
      fromDateOnlyResult.pagination.records >= 0,
  );

  // Step 3: Query with only to_date (all actions before 30 days ago)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const toDateOnlyRequest = {
    page: 1,
    limit: 20,
    to_date: thirtyDaysAgo.toISOString(),
  } satisfies IDiscussionBoardModerationLog.IRequest;

  const toDateOnlyResult: IPageIDiscussionBoardModerationLog.ISummary =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: memberId,
        body: toDateOnlyRequest,
      },
    );
  typia.assert(toDateOnlyResult);

  TestValidator.predicate(
    "to_date filter returns valid pagination structure",
    toDateOnlyResult.pagination.current === 1 &&
      toDateOnlyResult.pagination.limit === 20,
  );

  // Step 4: Query with bounded date range (past 30 days to past 7 days)
  const boundedRangeRequest = {
    page: 1,
    limit: 50,
    from_date: thirtyDaysAgo.toISOString(),
    to_date: sevenDaysAgo.toISOString(),
  } satisfies IDiscussionBoardModerationLog.IRequest;

  const boundedRangeResult: IPageIDiscussionBoardModerationLog.ISummary =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: memberId,
        body: boundedRangeRequest,
      },
    );
  typia.assert(boundedRangeResult);

  TestValidator.predicate(
    "bounded date range filter returns valid pagination and data array",
    boundedRangeResult.pagination.current === 1 &&
      boundedRangeResult.pagination.limit === 50 &&
      Array.isArray(boundedRangeResult.data),
  );

  // Step 5: Test 6 months historical range
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const sixMonthRequest = {
    page: 1,
    limit: 100,
    from_date: sixMonthsAgo.toISOString(),
  } satisfies IDiscussionBoardModerationLog.IRequest;

  const sixMonthResult: IPageIDiscussionBoardModerationLog.ISummary =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: memberId,
        body: sixMonthRequest,
      },
    );
  typia.assert(sixMonthResult);

  TestValidator.predicate(
    "6 month historical range filter returns valid pagination",
    sixMonthResult.pagination.limit === 100 &&
      sixMonthResult.pagination.records >= 0,
  );

  // Step 6: Test 1 year historical range
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const oneYearRequest = {
    page: 1,
    limit: 100,
    from_date: oneYearAgo.toISOString(),
    to_date: new Date().toISOString(),
  } satisfies IDiscussionBoardModerationLog.IRequest;

  const oneYearResult: IPageIDiscussionBoardModerationLog.ISummary =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: memberId,
        body: oneYearRequest,
      },
    );
  typia.assert(oneYearResult);

  TestValidator.predicate(
    "1 year historical range filter returns valid pagination and data",
    oneYearResult.pagination.pages >= 0 && Array.isArray(oneYearResult.data),
  );

  // Step 7: Verify all results have proper data array structure
  TestValidator.predicate(
    "all date range queries return properly structured data arrays",
    Array.isArray(fromDateOnlyResult.data) &&
      Array.isArray(toDateOnlyResult.data) &&
      Array.isArray(boundedRangeResult.data) &&
      Array.isArray(sixMonthResult.data) &&
      Array.isArray(oneYearResult.data),
  );
}
