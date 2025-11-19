import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationLog";

/**
 * Test filtering moderation logs by date range using from_date and to_date
 * parameters.
 *
 * This test validates the moderation log date filtering functionality by
 * creating a moderator account and testing various date range combinations. It
 * verifies that the API correctly filters logs based on from_date and to_date
 * parameters and returns only logs with created_at timestamps within the
 * specified ranges.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Define test date ranges (past, present, future)
 * 3. Test filtering with only from_date (logs after a specific date)
 * 4. Test filtering with only to_date (logs before a specific date)
 * 5. Test filtering with both from_date and to_date (logs within a period)
 * 6. Test filtering without date parameters (all logs)
 * 7. Verify created_at timestamps fall within specified ranges
 * 8. Test edge case: same from_date and to_date values
 */
export async function test_api_moderation_logs_filtering_by_date_range(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string>(),
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Define test date ranges
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Step 3: Test filtering with only from_date
  const logsAfterTenDaysAgo: IPageIDiscussionBoardModerationLog =
    await api.functional.discussionBoard.moderator.moderators.moderationLogs.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          from_date: tenDaysAgo.toISOString(),
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(logsAfterTenDaysAgo);

  // Verify all logs are after from_date
  for (const log of logsAfterTenDaysAgo.data) {
    const logDate = new Date(log.created_at);
    TestValidator.predicate(
      "log created_at should be after from_date",
      logDate >= tenDaysAgo,
    );
  }

  // Step 4: Test filtering with only to_date
  const logsBeforeFiveDaysAgo: IPageIDiscussionBoardModerationLog =
    await api.functional.discussionBoard.moderator.moderators.moderationLogs.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          to_date: fiveDaysAgo.toISOString(),
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(logsBeforeFiveDaysAgo);

  // Verify all logs are before to_date
  for (const log of logsBeforeFiveDaysAgo.data) {
    const logDate = new Date(log.created_at);
    TestValidator.predicate(
      "log created_at should be before to_date",
      logDate <= fiveDaysAgo,
    );
  }

  // Step 5: Test filtering with both from_date and to_date
  const logsInRange: IPageIDiscussionBoardModerationLog =
    await api.functional.discussionBoard.moderator.moderators.moderationLogs.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          from_date: thirtyDaysAgo.toISOString(),
          to_date: fiveDaysAgo.toISOString(),
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(logsInRange);

  // Verify all logs are within the date range
  for (const log of logsInRange.data) {
    const logDate = new Date(log.created_at);
    TestValidator.predicate(
      "log created_at should be within date range",
      logDate >= thirtyDaysAgo && logDate <= fiveDaysAgo,
    );
  }

  // Step 6: Test filtering without date parameters (all logs)
  const allLogs: IPageIDiscussionBoardModerationLog =
    await api.functional.discussionBoard.moderator.moderators.moderationLogs.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {} satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(allLogs);

  // Step 7: Test edge case - same from_date and to_date
  const sameDate = tenDaysAgo.toISOString();
  const logsOnSameDate: IPageIDiscussionBoardModerationLog =
    await api.functional.discussionBoard.moderator.moderators.moderationLogs.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          from_date: sameDate,
          to_date: sameDate,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(logsOnSameDate);

  // Verify all logs are on the exact date
  const targetDate = new Date(sameDate);
  for (const log of logsOnSameDate.data) {
    const logDate = new Date(log.created_at);
    TestValidator.predicate(
      "log created_at should be on target date",
      logDate >= targetDate && logDate <= targetDate,
    );
  }

  // Step 8: Test with future date range (should return empty results)
  const futureDate = tomorrow.toISOString();
  const futureLogs: IPageIDiscussionBoardModerationLog =
    await api.functional.discussionBoard.moderator.moderators.moderationLogs.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          from_date: futureDate,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(futureLogs);
}
