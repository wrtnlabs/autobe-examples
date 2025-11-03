import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationAction";

export async function test_api_moderation_action_search_by_date_range(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account for authentication
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create multiple moderation actions at different timestamps
  // We'll create actions and track their timestamps
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const createdActions: IDiscussionBoardModerationAction[] = [];

  // Create 8 moderation actions to simulate temporal distribution
  const actionTypes = [
    "warn_user",
    "delete_content",
    "edit_content",
    "dismiss_report",
  ] as const;
  const targetTypes = ["article", "comment", "user", "report"] as const;

  for (let i = 0; i < 8; i++) {
    const actionData = {
      action_type: RandomGenerator.pick(actionTypes),
      target_type: RandomGenerator.pick(targetTypes),
      target_id: typia.random<string & tags.Format<"uuid">>(),
      reason: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 3,
        wordMax: 8,
      }),
      details: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 5,
        wordMax: 10,
      }),
    } satisfies IDiscussionBoardModerationAction.ICreate;

    const action: IDiscussionBoardModerationAction =
      await api.functional.discussionBoard.moderator.moderation.actions.create(
        connection,
        {
          body: actionData,
        },
      );
    typia.assert(action);
    createdActions.push(action);

    // Small delay to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Step 3: Search for moderation actions within last 24 hours
  const last24HoursSearch = {
    created_after: oneDayAgo.toISOString(),
    created_before: now.toISOString(),
    sort: "newest_first",
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardModerationAction.IRequest;

  const last24HoursResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: last24HoursSearch,
      },
    );
  typia.assert(last24HoursResult);

  // Step 4: Validate that all returned actions are within the date range
  const oneDayAgoTime = oneDayAgo.getTime();
  const nowTime = now.getTime();

  for (const action of last24HoursResult.data) {
    const actionTime = new Date(action.created_at).getTime();
    TestValidator.predicate(
      "action created_at is within last 24 hours range",
      actionTime >= oneDayAgoTime && actionTime <= nowTime,
    );
  }

  // Step 5: Test with 3-day range
  const last3DaysSearch = {
    created_after: threeDaysAgo.toISOString(),
    created_before: now.toISOString(),
    sort: "newest_first",
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardModerationAction.IRequest;

  const last3DaysResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: last3DaysSearch,
      },
    );
  typia.assert(last3DaysResult);

  const threeDaysAgoTime = threeDaysAgo.getTime();

  for (const action of last3DaysResult.data) {
    const actionTime = new Date(action.created_at).getTime();
    TestValidator.predicate(
      "action created_at is within last 3 days range",
      actionTime >= threeDaysAgoTime && actionTime <= nowTime,
    );
  }

  // Step 6: Test with 7-day range
  const last7DaysSearch = {
    created_after: sevenDaysAgo.toISOString(),
    created_before: now.toISOString(),
    sort: "oldest_first",
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardModerationAction.IRequest;

  const last7DaysResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: last7DaysSearch,
      },
    );
  typia.assert(last7DaysResult);

  const sevenDaysAgoTime = sevenDaysAgo.getTime();

  for (const action of last7DaysResult.data) {
    const actionTime = new Date(action.created_at).getTime();
    TestValidator.predicate(
      "action created_at is within last 7 days range",
      actionTime >= sevenDaysAgoTime && actionTime <= nowTime,
    );
  }

  // Step 7: Verify sorting - newest first
  if (last24HoursResult.data.length > 1) {
    for (let i = 0; i < last24HoursResult.data.length - 1; i++) {
      const current = new Date(last24HoursResult.data[i].created_at).getTime();
      const next = new Date(last24HoursResult.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "newest_first sorting works correctly",
        current >= next,
      );
    }
  }

  // Step 8: Verify sorting - oldest first
  if (last7DaysResult.data.length > 1) {
    for (let i = 0; i < last7DaysResult.data.length - 1; i++) {
      const current = new Date(last7DaysResult.data[i].created_at).getTime();
      const next = new Date(last7DaysResult.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "oldest_first sorting works correctly",
        current <= next,
      );
    }
  }

  // Step 9: Test narrow date range filtering
  const narrowRangeStart = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
  const narrowRangeEnd = now;

  const narrowSearch = {
    created_after: narrowRangeStart.toISOString(),
    created_before: narrowRangeEnd.toISOString(),
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardModerationAction.IRequest;

  const narrowResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: narrowSearch,
      },
    );
  typia.assert(narrowResult);

  const narrowStartTime = narrowRangeStart.getTime();
  const narrowEndTime = narrowRangeEnd.getTime();

  for (const action of narrowResult.data) {
    const actionTime = new Date(action.created_at).getTime();
    TestValidator.predicate(
      "action is within narrow 1-hour range",
      actionTime >= narrowStartTime && actionTime <= narrowEndTime,
    );
  }
}
