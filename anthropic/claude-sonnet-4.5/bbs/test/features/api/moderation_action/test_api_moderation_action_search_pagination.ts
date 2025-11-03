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
 * Test pagination functionality when searching moderation action audit logs.
 *
 * This scenario validates that large audit datasets can be efficiently
 * navigated with proper page size controls and page number navigation.
 *
 * Workflow:
 *
 * 1. Create a new moderator account using join
 * 2. Create a large number of moderation actions (50+ actions) to test pagination
 * 3. Search for moderation actions with specific page size (e.g., 10 per page)
 * 4. Navigate through multiple pages and validate each page contains correct
 *    number of items
 * 5. Verify pagination metadata includes total count, current page, page size, and
 *    total pages
 * 6. Confirm last page contains remaining items correctly
 */
export async function test_api_moderation_action_search_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(12);

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: moderatorUsername,
      email: moderatorEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a large number of moderation actions (55 actions for thorough pagination testing)
  const totalActions = 55;
  const actionTypes = [
    "edit_content",
    "delete_content",
    "restore_content",
    "warn_user",
    "suspend_user",
    "ban_user",
    "lift_suspension",
    "dismiss_report",
  ] as const;
  const targetTypes = ["article", "comment", "user", "report"] as const;

  const createdActions = await ArrayUtil.asyncRepeat(
    totalActions,
    async (index) => {
      const actionType = RandomGenerator.pick(actionTypes);
      const targetType = RandomGenerator.pick(targetTypes);

      const action =
        await api.functional.discussionBoard.moderator.moderation.actions.create(
          connection,
          {
            body: {
              action_type: actionType,
              target_type: targetType,
              target_id: typia.random<string & tags.Format<"uuid">>(),
              reason: RandomGenerator.paragraph({
                sentences: 5,
                wordMin: 3,
                wordMax: 8,
              }),
              details: RandomGenerator.content({
                paragraphs: 2,
                sentenceMin: 10,
                sentenceMax: 15,
              }),
            } satisfies IDiscussionBoardModerationAction.ICreate,
          },
        );
      typia.assert(action);
      return action;
    },
  );

  // Step 3: Search for moderation actions with page size 10
  const pageSize = 10;

  // Test first page
  const firstPage =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: pageSize,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(firstPage);

  // Step 4: Validate pagination metadata
  TestValidator.equals(
    "first page current page number",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("page limit", firstPage.pagination.limit, pageSize);
  TestValidator.equals(
    "total records",
    firstPage.pagination.records,
    totalActions,
  );

  const expectedPages = Math.ceil(totalActions / pageSize);
  TestValidator.equals(
    "total pages",
    firstPage.pagination.pages,
    expectedPages,
  );

  // Validate first page contains correct number of items
  TestValidator.equals(
    "first page item count",
    firstPage.data.length,
    pageSize,
  );

  // Step 5: Navigate through middle pages
  const middlePage = 3;
  const middlePageResult =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: middlePage,
          limit: pageSize,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(middlePageResult);

  TestValidator.equals(
    "middle page current page number",
    middlePageResult.pagination.current,
    middlePage,
  );
  TestValidator.equals(
    "middle page item count",
    middlePageResult.data.length,
    pageSize,
  );
  TestValidator.equals(
    "middle page total records",
    middlePageResult.pagination.records,
    totalActions,
  );

  // Step 6: Test last page with remaining items
  const lastPageResult =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: expectedPages,
          limit: pageSize,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(lastPageResult);

  TestValidator.equals(
    "last page current page number",
    lastPageResult.pagination.current,
    expectedPages,
  );

  const expectedLastPageItems =
    totalActions % pageSize === 0 ? pageSize : totalActions % pageSize;
  TestValidator.equals(
    "last page item count",
    lastPageResult.data.length,
    expectedLastPageItems,
  );
  TestValidator.equals(
    "last page total records",
    lastPageResult.pagination.records,
    totalActions,
  );

  // Verify all items across pages are unique (no duplicates)
  const allItemIds = [
    ...firstPage.data.map((item) => item.id),
    ...middlePageResult.data.map((item) => item.id),
    ...lastPageResult.data.map((item) => item.id),
  ];

  const uniqueIds = new Set(allItemIds);
  TestValidator.equals(
    "no duplicate items across pages",
    uniqueIds.size,
    allItemIds.length,
  );
}
