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
 * Test filtering moderation logs by specific action types.
 *
 * This test validates that moderators can filter the audit trail to show only
 * specific types of moderation actions. The moderator authenticates and then
 * requests moderation logs filtered by one or more action types to focus on
 * specific moderation activities.
 *
 * Steps:
 *
 * 1. Create and authenticate a moderator account
 * 2. Query moderation logs with action_types filter
 * 3. Verify the response structure and pagination
 * 4. Test multiple action type filters
 */
export async function test_api_moderation_logs_filtering_by_action_type(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecureModeratorPass123!",
        username: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Query moderation logs with single action type filter
  const singleActionTypeFilter = ["article_edited"] as const;
  const singleActionResult: IPageIDiscussionBoardModerationLog.ISummary =
    await api.functional.discussionBoard.moderator.moderationLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          action_types: [...singleActionTypeFilter],
          sort_by: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(singleActionResult);

  // Step 3: Verify response structure and pagination
  TestValidator.predicate(
    "pagination should have valid structure",
    singleActionResult.pagination.current >= 0 &&
      singleActionResult.pagination.limit > 0 &&
      singleActionResult.pagination.records >= 0 &&
      singleActionResult.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "data should be an array",
    Array.isArray(singleActionResult.data),
  );

  // Step 4: Test with multiple action type filters
  const multipleActionTypes = [
    "article_edited",
    "article_deleted",
    "account_suspended",
  ];
  const multipleActionResult: IPageIDiscussionBoardModerationLog.ISummary =
    await api.functional.discussionBoard.moderator.moderationLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          action_types: multipleActionTypes,
          sort_by: "action_type",
          order: "asc",
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(multipleActionResult);

  TestValidator.predicate(
    "multiple action types filter should return valid pagination",
    multipleActionResult.pagination.limit === 50,
  );

  // Step 5: Test filtering with all possible action types
  const allActionTypes = [
    "article_edited",
    "article_deleted",
    "attachment_removed",
    "account_suspended",
    "account_banned",
    "account_restored",
  ];
  const allTypesResult: IPageIDiscussionBoardModerationLog.ISummary =
    await api.functional.discussionBoard.moderator.moderationLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          action_types: allActionTypes,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(allTypesResult);

  TestValidator.predicate(
    "all action types filter should work correctly",
    allTypesResult.pagination.limit === 100,
  );

  // Step 6: Test without action type filter to get all logs
  const noFilterResult: IPageIDiscussionBoardModerationLog.ISummary =
    await api.functional.discussionBoard.moderator.moderationLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(noFilterResult);

  TestValidator.predicate(
    "no filter should return valid result",
    noFilterResult.pagination.limit === 10 &&
      Array.isArray(noFilterResult.data),
  );
}
