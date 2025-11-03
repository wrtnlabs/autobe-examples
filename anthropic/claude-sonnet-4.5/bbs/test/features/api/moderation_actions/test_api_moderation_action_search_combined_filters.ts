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
 * Test searching moderation action audit logs with multiple combined filters.
 *
 * This test validates sophisticated query capabilities using combinations of
 * moderator, action type, target type, and date range filters simultaneously.
 *
 * Workflow:
 *
 * 1. Create a new moderator account using join
 * 2. Create diverse moderation actions with varying action types, target types,
 *    and timestamps
 * 3. Search with combined filters: specific moderator AND action type
 *    'delete_content' AND date range within last month
 * 4. Validate the response contains only actions matching ALL filter criteria
 * 5. Verify complex filter logic works correctly
 * 6. Confirm pagination and sorting work properly with combined filters
 */
export async function test_api_moderation_action_search_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authentication
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

  // Step 2: Create diverse moderation actions with varying properties
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const actionTypes = [
    "delete_content",
    "warn_user",
    "suspend_user",
    "edit_content",
  ] as const;
  const targetTypes = ["article", "comment", "user", "report"] as const;

  // Create actions with different combinations
  const createdActions: IDiscussionBoardModerationAction[] = [];

  // Create 3 delete_content actions within the search range
  for (let i = 0; i < 3; i++) {
    const action =
      await api.functional.discussionBoard.moderator.moderation.actions.create(
        connection,
        {
          body: {
            action_type: "delete_content",
            target_type: RandomGenerator.pick(targetTypes),
            target_id: typia.random<string & tags.Format<"uuid">>(),
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardModerationAction.ICreate,
        },
      );
    typia.assert(action);
    createdActions.push(action);
  }

  // Create 2 actions with different action types (should be filtered out)
  for (let i = 0; i < 2; i++) {
    const action =
      await api.functional.discussionBoard.moderator.moderation.actions.create(
        connection,
        {
          body: {
            action_type: RandomGenerator.pick(["warn_user", "suspend_user"]),
            target_type: RandomGenerator.pick(targetTypes),
            target_id: typia.random<string & tags.Format<"uuid">>(),
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardModerationAction.ICreate,
        },
      );
    typia.assert(action);
    createdActions.push(action);
  }

  // Step 3: Search with combined filters
  const searchStartDate = twoWeeksAgo.toISOString();
  const searchEndDate = now.toISOString();

  const searchResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          moderator_id: moderator.id,
          action_type: "delete_content",
          created_after: searchStartDate,
          created_before: searchEndDate,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(searchResult);

  // Step 4: Validate the response contains only actions matching ALL filter criteria
  TestValidator.predicate(
    "search result should have data array",
    Array.isArray(searchResult.data),
  );

  TestValidator.predicate(
    "all returned actions should have action_type delete_content",
    searchResult.data.every(
      (action) => action.action_type === "delete_content",
    ),
  );

  TestValidator.predicate(
    "all returned actions should belong to the specific moderator",
    searchResult.data.every((action) => action.moderator.id === moderator.id),
  );

  // Validate timestamps are within the search range
  searchResult.data.forEach((action) => {
    const actionDate = new Date(action.created_at);
    const afterDate = new Date(searchStartDate);
    const beforeDate = new Date(searchEndDate);

    TestValidator.predicate(
      "action created_at should be after or equal to search start date",
      actionDate >= afterDate,
    );

    TestValidator.predicate(
      "action created_at should be before or equal to search end date",
      actionDate <= beforeDate,
    );
  });

  // Step 5: Verify pagination metadata
  TestValidator.predicate(
    "pagination should be present",
    searchResult.pagination !== null && searchResult.pagination !== undefined,
  );

  TestValidator.predicate(
    "pagination current page should be 1",
    searchResult.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit should be 20",
    searchResult.pagination.limit === 20,
  );

  // Step 6: Verify that at least the delete_content actions we created are found
  TestValidator.predicate(
    "should find at least 3 delete_content actions",
    searchResult.data.length >= 3,
  );
}
