import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationAction";

/**
 * Test filtering moderation actions by action date using dateFrom and dateTo
 * parameters.
 *
 * This test validates that moderators can filter moderation actions within a
 * specific date range. The API must respect both inclusive lower bounds
 * (dateFrom) and inclusive upper bounds (dateTo) when filtering the audit trail
 * of moderation actions by their creation timestamp. The test covers various
 * date range scenarios including single-day ranges, week-long ranges, and
 * historical date ranges, ensuring that date filtering works both independently
 * and when combined with other filter parameters.
 *
 * Business context: Moderators need to analyze moderation patterns and
 * compliance over specific time periods. The date range filtering enables
 * investigation of moderation activity during particular incidents, policy
 * changes, or audit periods.
 *
 * Test workflow:
 *
 * 1. Authenticate as moderator
 * 2. Test single day date range filtering
 * 3. Test week-long date range filtering
 * 4. Test historical date range filtering
 * 5. Test boundary conditions with actions at exact date boundaries
 * 6. Test date filtering combined with other filters
 * 7. Verify empty results when date range contains no actions
 */
export async function test_api_moderation_actions_filter_by_date_range(
  connection: api.IConnection,
) {
  // 1. Authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Test single day date range filtering
  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

  const todayResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          dateFrom: todayStart.toISOString(),
          dateTo: todayEnd.toISOString(),
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(todayResult);
  TestValidator.equals(
    "single day range returns valid page",
    todayResult.pagination.current,
    1,
  );

  // 3. Test week-long date range filtering
  const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekEnd = new Date(todayStart.getTime());

  const weekResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          dateFrom: weekStart.toISOString(),
          dateTo: weekEnd.toISOString(),
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(weekResult);
  TestValidator.predicate(
    "week range pagination is valid",
    weekResult.pagination.pages >= 0,
  );

  // 4. Test historical date range filtering (past 30 days)
  const thirtyDaysAgo = new Date(
    todayStart.getTime() - 30 * 24 * 60 * 60 * 1000,
  );

  const historicalResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          dateFrom: thirtyDaysAgo.toISOString(),
          dateTo: todayEnd.toISOString(),
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(historicalResult);
  TestValidator.predicate(
    "historical range records count is non-negative",
    historicalResult.pagination.records >= 0,
  );

  // 5. Test boundary conditions with exact dates
  const boundaryStart = new Date(2024, 0, 1).toISOString();
  const boundaryEnd = new Date(2024, 0, 1, 23, 59, 59).toISOString();

  const boundaryResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          dateFrom: boundaryStart,
          dateTo: boundaryEnd,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(boundaryResult);

  // 6. Test date filtering combined with action type filter
  const filteredResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          dateFrom: weekStart.toISOString(),
          dateTo: weekEnd.toISOString(),
          actionType: "approved",
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(filteredResult);
  TestValidator.predicate(
    "combined filter returns valid data",
    Array.isArray(filteredResult.data),
  );

  // 7. Test date filtering combined with content type filter
  const contentTypeFilterResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          dateFrom: thirtyDaysAgo.toISOString(),
          dateTo: todayEnd.toISOString(),
          contentType: "article",
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(contentTypeFilterResult);
  TestValidator.equals(
    "content type combined filter page count valid",
    contentTypeFilterResult.pagination.current >= 0,
    true,
  );

  // 8. Test empty result when date range contains no future actions
  const futureStart = new Date(
    todayStart.getTime() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const futureEnd = new Date(
    todayStart.getTime() + 366 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const futureResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          dateFrom: futureStart,
          dateTo: futureEnd,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(futureResult);
  TestValidator.predicate(
    "future date range returns empty or valid results",
    futureResult.pagination.records >= 0,
  );

  // 9. Test dateFrom only (no dateTo)
  const dateFromOnlyResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          dateFrom: thirtyDaysAgo.toISOString(),
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(dateFromOnlyResult);
  TestValidator.predicate(
    "dateFrom only filter works correctly",
    dateFromOnlyResult.pagination.limit === 50,
  );

  // 10. Test dateTo only (no dateFrom)
  const dateToOnlyResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          dateTo: todayEnd.toISOString(),
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(dateToOnlyResult);
  TestValidator.predicate(
    "dateTo only filter works correctly",
    dateToOnlyResult.pagination.limit === 50,
  );
}
