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

/**
 * Test searching moderation action audit logs filtered by action type.
 *
 * This test validates that moderators can filter moderation actions by specific
 * action types (edit_content, delete_content, warn_user, suspend_user) for
 * pattern analysis and enforcement consistency.
 *
 * Workflow:
 *
 * 1. Create a new moderator account using join endpoint
 * 2. Create multiple moderation actions with different action types
 * 3. Search for moderation actions filtered by specific action type
 *    (delete_content)
 * 4. Validate response contains only actions of the specified type
 * 5. Verify all delete_content actions are returned with complete audit
 *    information
 * 6. Confirm pagination works correctly for filtered results
 */
export async function test_api_moderation_action_search_by_action_type(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(10),
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

  // Step 2: Create moderation actions with different action types
  const actionTypes = [
    "edit_content",
    "delete_content",
    "warn_user",
    "suspend_user",
  ] as const;
  const createdActions: IDiscussionBoardModerationAction[] = [];

  for (const actionType of actionTypes) {
    for (let i = 0; i < 3; i++) {
      const actionData = {
        action_type: actionType,
        target_type: RandomGenerator.pick([
          "article",
          "comment",
          "user",
          "report",
        ] as const),
        target_id: typia.random<string & tags.Format<"uuid">>(),
        reason: `${actionType} reason ${i + 1}`,
        details: `Detailed explanation for ${actionType} action`,
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
    }
  }

  // Step 3: Search for moderation actions filtered by action_type = "delete_content"
  const searchRequest = {
    action_type: "delete_content",
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardModerationAction.IRequest;

  const searchResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(searchResult);

  // Step 4: Validate response contains only actions of the specified type
  TestValidator.predicate(
    "search result should contain data",
    searchResult.data.length > 0,
  );

  for (const action of searchResult.data) {
    TestValidator.equals(
      "action type should be delete_content",
      action.action_type,
      "delete_content",
    );
  }

  // Step 5: Verify all delete_content actions are returned
  const expectedDeleteContentCount = createdActions.filter(
    (a) => a.action_type === "delete_content",
  ).length;

  TestValidator.predicate(
    "all delete_content actions should be returned",
    searchResult.data.length >= expectedDeleteContentCount,
  );

  // Step 6: Verify pagination information is correct
  typia.assert(searchResult.pagination);
  TestValidator.equals(
    "current page should match request",
    searchResult.pagination.current,
    searchRequest.page,
  );
  TestValidator.equals(
    "limit should match request",
    searchResult.pagination.limit,
    searchRequest.limit,
  );
  TestValidator.predicate(
    "pagination should have valid records count",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have valid pages count",
    searchResult.pagination.pages >= 0,
  );
}
