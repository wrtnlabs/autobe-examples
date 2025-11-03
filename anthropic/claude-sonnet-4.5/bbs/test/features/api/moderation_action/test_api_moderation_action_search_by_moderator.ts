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
 * Test searching moderation action audit logs filtered by specific moderator.
 *
 * This scenario validates that moderators can retrieve a filtered list of
 * moderation actions performed by a specific moderator for oversight and
 * accountability tracking.
 *
 * Workflow:
 *
 * 1. Create a new moderator account using join
 * 2. Authenticate as the moderator to establish session
 * 3. Create multiple moderation actions with different action types (edit_content,
 *    delete_content, warn_user)
 * 4. Search for moderation actions filtered by the specific moderator ID
 * 5. Validate the response contains only actions performed by the specified
 *    moderator
 * 6. Verify pagination metadata is correct
 * 7. Confirm all returned actions include complete audit details
 */
export async function test_api_moderation_action_search_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
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

  // Step 2: Authentication is automatically handled by the join response
  // The connection now has the moderator's authentication token

  // Step 3: Create multiple moderation actions with different types
  const action1Data = {
    action_type: "edit_content",
    target_type: "article",
    target_id: typia.random<string & tags.Format<"uuid">>(),
    reason: "Correcting factual inaccuracies in the article content",
    details: "Modified claims to align with verified sources",
  } satisfies IDiscussionBoardModerationAction.ICreate;

  const action1: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderation.actions.create(
      connection,
      {
        body: action1Data,
      },
    );
  typia.assert(action1);

  const action2Data = {
    action_type: "delete_content",
    target_type: "comment",
    target_id: typia.random<string & tags.Format<"uuid">>(),
    reason: "Spam content promoting commercial services",
    details: "Repeated promotional links violating community guidelines",
  } satisfies IDiscussionBoardModerationAction.ICreate;

  const action2: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderation.actions.create(
      connection,
      {
        body: action2Data,
      },
    );
  typia.assert(action2);

  const action3Data = {
    action_type: "warn_user",
    target_type: "user",
    target_id: typia.random<string & tags.Format<"uuid">>(),
    reason: "Personal attack violating respectful discussion policy",
    details:
      "Warning issued for inflammatory language directed at other members",
  } satisfies IDiscussionBoardModerationAction.ICreate;

  const action3: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderation.actions.create(
      connection,
      {
        body: action3Data,
      },
    );
  typia.assert(action3);

  // Step 4: Search for moderation actions filtered by the specific moderator ID
  const searchRequest = {
    moderator_id: moderator.id,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardModerationAction.IRequest;

  const searchResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(searchResult);

  // Step 5: Validate the response contains only actions performed by the specified moderator
  TestValidator.predicate(
    "all returned actions belong to the specified moderator",
    searchResult.data.every((action) => action.moderator.id === moderator.id),
  );

  // Step 6: Verify pagination metadata is correct
  TestValidator.equals(
    "pagination records count matches created actions",
    searchResult.pagination.records,
    3,
  );

  TestValidator.predicate(
    "pagination pages calculated correctly",
    searchResult.pagination.pages >= 1,
  );

  TestValidator.equals("current page is 1", searchResult.pagination.current, 1);

  TestValidator.equals("limit is 10", searchResult.pagination.limit, 10);

  // Step 7: Confirm all returned actions include complete audit details
  TestValidator.equals(
    "returned data count matches pagination records",
    searchResult.data.length,
    3,
  );

  searchResult.data.forEach((action) => {
    TestValidator.predicate(
      "action has moderator summary",
      action.moderator !== null && action.moderator.id === moderator.id,
    );

    TestValidator.predicate(
      "action has valid action_type",
      typeof action.action_type === "string" && action.action_type.length > 0,
    );

    TestValidator.predicate(
      "action has valid target_type",
      typeof action.target_type === "string" && action.target_type.length > 0,
    );

    TestValidator.predicate(
      "action has reason",
      typeof action.reason === "string" && action.reason.length > 0,
    );
  });

  // Verify specific actions are present in the search results
  const actionIds = searchResult.data.map((a) => a.id);
  TestValidator.predicate(
    "action1 is in search results",
    actionIds.includes(action1.id),
  );

  TestValidator.predicate(
    "action2 is in search results",
    actionIds.includes(action2.id),
  );

  TestValidator.predicate(
    "action3 is in search results",
    actionIds.includes(action3.id),
  );
}
