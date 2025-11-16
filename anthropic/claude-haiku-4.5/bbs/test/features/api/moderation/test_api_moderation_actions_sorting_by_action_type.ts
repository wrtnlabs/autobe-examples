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
 * Test sorting moderation actions by action_type field.
 *
 * Validates that moderators can effectively sort and analyze moderation actions
 * by action type. The test ensures the API correctly groups different
 * moderation decisions (approvals, rejections, deletions, edits, flags, etc.)
 * together when sorted by actionType, enabling moderators to identify patterns
 * in their moderation decisions.
 *
 * Test workflow:
 *
 * 1. Register and authenticate as a moderator
 * 2. Request moderation actions sorted by actionType in ascending order
 * 3. Verify that actions are grouped by type (approvals, rejections, deletions,
 *    etc.)
 * 4. Test descending order sorting to ensure reverse ordering works
 * 5. Combine actionType sorting with other filters
 * 6. Validate sorting effectiveness for pattern analysis
 */
export async function test_api_moderation_actions_sorting_by_action_type(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a moderator
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Request moderation actions sorted by actionType in ascending order
  const ascendingResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          orderBy: "actionType",
          order: "asc",
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(ascendingResult);

  // Step 3: Verify actions are grouped by type in ascending order
  if (ascendingResult.data.length > 1) {
    // Group actions by type for verification
    const actionTypeOrder = ascendingResult.data.map(
      (action) => action.action_type,
    );

    // Verify that actions of the same type are grouped together
    for (let i = 0; i < actionTypeOrder.length - 1; i++) {
      const currentType = actionTypeOrder[i];
      const nextType = actionTypeOrder[i + 1];

      // Check that types are in ascending alphabetical order
      TestValidator.predicate(
        `action types should be in ascending order: ${currentType} <= ${nextType}`,
        currentType <= nextType,
      );
    }
  }

  // Step 4: Test descending order sorting
  const descendingResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          orderBy: "actionType",
          order: "desc",
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(descendingResult);

  // Verify descending order
  if (descendingResult.data.length > 1) {
    const descendingActionTypeOrder = descendingResult.data.map(
      (action) => action.action_type,
    );

    for (let i = 0; i < descendingActionTypeOrder.length - 1; i++) {
      const currentType = descendingActionTypeOrder[i];
      const nextType = descendingActionTypeOrder[i + 1];

      // Check that types are in descending alphabetical order
      TestValidator.predicate(
        `action types should be in descending order: ${currentType} >= ${nextType}`,
        currentType >= nextType,
      );
    }
  }

  // Step 5: Combine actionType sorting with content type filter
  const filteredResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          contentType: "article",
          orderBy: "actionType",
          order: "asc",
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(filteredResult);

  // Verify all results have article content type
  if (filteredResult.data.length > 0) {
    for (const action of filteredResult.data) {
      TestValidator.equals(
        "filtered results should have article content type",
        action.content_type,
        "article",
      );
    }

    // Verify sorting still works with filter applied
    const filteredActionTypes = filteredResult.data.map(
      (action) => action.action_type,
    );
    for (let i = 0; i < filteredActionTypes.length - 1; i++) {
      TestValidator.predicate(
        `sorted action types with filter should maintain order: ${filteredActionTypes[i]} <= ${filteredActionTypes[i + 1]}`,
        filteredActionTypes[i] <= filteredActionTypes[i + 1],
      );
    }
  }

  // Step 6: Verify sorting with actionType filter
  const approvedActionsResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          actionType: "approved",
          orderBy: "actionType",
          order: "asc",
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(approvedActionsResult);

  // When filtered by specific actionType, all results should have that type
  if (approvedActionsResult.data.length > 0) {
    for (const action of approvedActionsResult.data) {
      TestValidator.equals(
        "filtered approved actions should all have approved type",
        action.action_type,
        "approved",
      );
    }
  }

  // Step 7: Validate pagination works with sorting
  const page1Result: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          orderBy: "actionType",
          order: "asc",
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(page1Result);

  TestValidator.predicate(
    "pagination info should be valid",
    page1Result.pagination.current === 1 && page1Result.pagination.limit === 10,
  );

  // Test that sorting consistency across pagination
  const page2Result: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 2,
          limit: 10,
          orderBy: "actionType",
          order: "asc",
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(page2Result);

  // If we have data on both pages, verify sorting continues consistently
  if (page1Result.data.length > 0 && page2Result.data.length > 0) {
    const lastActionTypeOnPage1 =
      page1Result.data[page1Result.data.length - 1].action_type;
    const firstActionTypeOnPage2 = page2Result.data[0].action_type;

    TestValidator.predicate(
      "action type sorting should be consistent across pages",
      lastActionTypeOnPage1 <= firstActionTypeOnPage2,
    );
  }
}
