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
 * Test filtering moderation actions by action type.
 *
 * Validates that moderators can retrieve and filter moderation actions by
 * specific action types. Tests each action type individually (approved,
 * rejected, requested_changes, deleted_article, deleted_comment,
 * edited_article, edited_comment, flagged) to ensure the filter correctly
 * identifies different moderation decisions. This enables moderators to analyze
 * patterns and consistency across similar decisions.
 *
 * 1. Authenticate as moderator
 * 2. Request all moderation actions without filter
 * 3. Filter actions by each action type individually
 * 4. Validate that only matching action types are returned
 * 5. Verify filtering enables pattern analysis for consistency review
 */
export async function test_api_moderation_actions_filter_by_action_type(
  connection: api.IConnection,
) {
  // 1. Authenticate as moderator
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // 2. Request all moderation actions without filter
  const allActionsPage: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {} satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(allActionsPage);
  TestValidator.predicate(
    "all actions page should have pagination info",
    allActionsPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "all actions page should have data array",
    Array.isArray(allActionsPage.data),
  );

  // 3. Test each action type filter individually
  const actionTypes: Array<
    | "approved"
    | "rejected"
    | "requested_changes"
    | "deleted_article"
    | "deleted_comment"
    | "edited_article"
    | "edited_comment"
    | "flagged"
  > = [
    "approved",
    "rejected",
    "requested_changes",
    "deleted_article",
    "deleted_comment",
    "edited_article",
    "edited_comment",
    "flagged",
  ];

  // Test each action type filter
  for (const actionType of actionTypes) {
    const filteredPage: IPageIDiscussionBoardModerationAction.ISummary =
      await api.functional.discussionBoard.moderator.moderation.actions.index(
        connection,
        {
          body: {
            actionType: actionType,
          } satisfies IDiscussionBoardModerationAction.IRequest,
        },
      );
    typia.assert(filteredPage);

    // 4. Validate that only matching action types are returned
    if (filteredPage.data.length > 0) {
      for (const action of filteredPage.data) {
        TestValidator.equals(
          `action type should match filter for ${actionType}`,
          action.action_type,
          actionType,
        );
      }
    }

    TestValidator.predicate(
      `filtered page for ${actionType} should have pagination`,
      filteredPage.pagination !== undefined,
    );

    TestValidator.predicate(
      `filtered data should be an array for ${actionType}`,
      Array.isArray(filteredPage.data),
    );
  }

  // 5. Test pagination with action type filter
  const paginatedPage: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          actionType: "approved",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(paginatedPage);

  TestValidator.predicate(
    "paginated filtered results should have pagination info",
    paginatedPage.pagination !== undefined,
  );

  TestValidator.predicate(
    "current page should be set correctly",
    paginatedPage.pagination.current >= 0,
  );

  TestValidator.predicate(
    "limit should be respected",
    paginatedPage.pagination.limit <= 10 || paginatedPage.data.length <= 10,
  );
}
