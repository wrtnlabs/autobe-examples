import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSuspension";

export async function test_api_moderation_suspensions_filter_by_suspension_date_range(
  connection: api.IConnection,
) {
  // 1. Create a moderator account with valid credentials
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "TestPass123!";
  const moderatorUsername = RandomGenerator.alphabets(10);

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Set up date range for filtering
  // Create a 7-day window from today
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const suspendedFromDate = sevenDaysAgo.toISOString();
  const suspendedToDate = now.toISOString();

  // 3. Query suspensions within the date range
  const suspensionResults: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          suspended_from: suspendedFromDate,
          suspended_to: suspendedToDate,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(suspensionResults);

  // 4. Validate pagination information
  TestValidator.predicate(
    "pagination should have valid page info",
    suspensionResults.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination should have valid limit",
    suspensionResults.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination should have valid total records",
    suspensionResults.pagination.records >= 0,
  );

  // 5. Validate all returned suspensions are within the date range
  if (suspensionResults.data.length > 0) {
    for (const suspension of suspensionResults.data) {
      const suspensionDate = new Date(suspension.suspended_at);
      TestValidator.predicate(
        "suspension should be on or after suspended_from date",
        suspensionDate.getTime() >= sevenDaysAgo.getTime(),
      );
      TestValidator.predicate(
        "suspension should be on or before suspended_to date",
        suspensionDate.getTime() <= now.getTime(),
      );

      // Validate suspension structure
      TestValidator.predicate(
        "suspension should have valid ID",
        suspension.id !== undefined && suspension.id !== null,
      );
      TestValidator.predicate(
        "suspension should have moderator info",
        suspension.moderator !== undefined &&
          suspension.moderator.id !== undefined,
      );
      TestValidator.predicate(
        "suspension should have suspension type",
        ["posting_restriction", "account_suspension", "permanent_ban"].includes(
          suspension.suspension_type,
        ),
      );
      TestValidator.predicate(
        "suspension should have severity level",
        ["minor", "moderate", "severe", "permanent"].includes(
          suspension.severity_level,
        ),
      );
      TestValidator.predicate(
        "suspension should have status",
        ["active", "lifted", "expired"].includes(suspension.status),
      );
    }
  }

  // 6. Test with narrower date range (last 24 hours)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const recentSuspensionResults: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          suspended_from: oneDayAgo.toISOString(),
          suspended_to: now.toISOString(),
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(recentSuspensionResults);

  // 7. Validate recent suspensions are within the narrower range
  if (recentSuspensionResults.data.length > 0) {
    for (const suspension of recentSuspensionResults.data) {
      const suspensionDate = new Date(suspension.suspended_at);
      TestValidator.predicate(
        "recent suspension should be within last 24 hours",
        suspensionDate.getTime() >= oneDayAgo.getTime(),
      );
    }
  }

  // 8. Test filtering with only suspended_from (no upper bound)
  const resultFromOnly: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          suspended_from: suspendedFromDate,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(resultFromOnly);

  // 9. Test filtering with only suspended_to (no lower bound)
  const resultToOnly: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          suspended_to: suspendedToDate,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(resultToOnly);

  // 10. Verify results without date filters for comparison
  const unfiltered: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(unfiltered);

  TestValidator.predicate(
    "filtered results should have fewer or equal suspensions than unfiltered",
    suspensionResults.data.length <= unfiltered.data.length,
  );
}
