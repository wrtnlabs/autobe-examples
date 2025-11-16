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
 * Test combining multiple filters simultaneously for complex audit trail
 * queries.
 *
 * This test validates the moderator's ability to filter moderation actions
 * using various combinations of criteria (actionType, contentType, moderatorId,
 * dateFrom) to support governance and compliance workflows.
 *
 * Test flow:
 *
 * 1. Register and authenticate as a moderator
 * 2. Test single filter with actionType='deleted_article'
 * 3. Test two-filter combination: actionType + contentType
 * 4. Test three-filter combination: actionType + contentType + moderatorId
 * 5. Test four-filter combination: actionType + contentType + moderatorId +
 *    dateFrom
 * 6. Test complex filter with ordering by createdAt
 * 7. Verify pagination works correctly with filtered results
 * 8. Validate that filter combinations return accurate subsets of data
 */
export async function test_api_moderation_actions_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(15),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator authenticated",
    moderator.id !== undefined,
  );

  // Step 2: Test single filter with actionType='deleted_article'
  const singleFilterResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          actionType: "deleted_article",
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(singleFilterResult);
  TestValidator.predicate(
    "single filter returns paginated results",
    singleFilterResult.pagination !== undefined &&
      Array.isArray(singleFilterResult.data),
  );

  // Verify all returned actions match the actionType filter
  singleFilterResult.data.forEach((action) => {
    TestValidator.equals(
      "action matches deleted_article filter",
      action.action_type,
      "deleted_article",
    );
  });

  // Step 3: Test two-filter combination: actionType + contentType
  const twoFilterResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          actionType: "deleted_article",
          contentType: "article",
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(twoFilterResult);
  TestValidator.predicate(
    "two filters return paginated results",
    twoFilterResult.pagination !== undefined &&
      Array.isArray(twoFilterResult.data),
  );

  // Verify all returned actions match both filters
  twoFilterResult.data.forEach((action) => {
    TestValidator.equals(
      "action matches deleted_article filter",
      action.action_type,
      "deleted_article",
    );
    TestValidator.equals(
      "content matches article type filter",
      action.content_type,
      "article",
    );
  });

  // Step 4: Test three-filter combination: actionType + contentType + moderatorId
  const threeFilterResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          actionType: "deleted_article",
          contentType: "article",
          moderatorId: moderator.id,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(threeFilterResult);
  TestValidator.predicate(
    "three filters return paginated results",
    threeFilterResult.pagination !== undefined &&
      Array.isArray(threeFilterResult.data),
  );

  // Verify all returned actions match all three filters
  threeFilterResult.data.forEach((action) => {
    TestValidator.equals(
      "action matches deleted_article filter",
      action.action_type,
      "deleted_article",
    );
    TestValidator.equals(
      "content matches article type filter",
      action.content_type,
      "article",
    );
    TestValidator.equals(
      "moderator matches specified moderatorId filter",
      action.moderatorId,
      moderator.id,
    );
  });

  // Step 5: Test four-filter combination with dateFrom
  const recentDate = new Date();
  recentDate.setDate(recentDate.getDate() - 7); // Last 7 days
  const fourFilterResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          actionType: "deleted_article",
          contentType: "article",
          moderatorId: moderator.id,
          dateFrom: recentDate.toISOString(),
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(fourFilterResult);
  TestValidator.predicate(
    "four filters return paginated results",
    fourFilterResult.pagination !== undefined &&
      Array.isArray(fourFilterResult.data),
  );

  // Verify all returned actions match all four filters
  fourFilterResult.data.forEach((action) => {
    TestValidator.equals(
      "action matches deleted_article filter",
      action.action_type,
      "deleted_article",
    );
    TestValidator.equals(
      "content matches article type filter",
      action.content_type,
      "article",
    );
    TestValidator.equals(
      "moderator matches specified moderatorId filter",
      action.moderatorId,
      moderator.id,
    );
    TestValidator.predicate(
      "action date is after dateFrom filter",
      new Date(action.created_at) >= recentDate,
    );
  });

  // Step 6: Test complex filter with ordering by createdAt
  const complexFilterWithOrder: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          actionType: "deleted_article",
          contentType: "article",
          moderatorId: moderator.id,
          dateFrom: recentDate.toISOString(),
          orderBy: "createdAt",
          order: "desc",
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(complexFilterWithOrder);
  TestValidator.predicate(
    "complex filter with ordering returns results",
    complexFilterWithOrder.pagination !== undefined &&
      Array.isArray(complexFilterWithOrder.data),
  );

  // Verify sorting order (descending by createdAt)
  if (complexFilterWithOrder.data.length > 1) {
    for (let i = 0; i < complexFilterWithOrder.data.length - 1; i++) {
      const current = new Date(complexFilterWithOrder.data[i].created_at);
      const next = new Date(complexFilterWithOrder.data[i + 1].created_at);
      TestValidator.predicate(
        "results sorted descending by createdAt",
        current >= next,
      );
    }
  }

  // Step 7: Test pagination with filters
  const paginatedResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          actionType: "deleted_article",
          contentType: "article",
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination info is accurate",
    paginatedResult.pagination.current === 1 &&
      paginatedResult.pagination.limit === 5,
  );
  TestValidator.predicate(
    "data count does not exceed limit",
    paginatedResult.data.length <= 5,
  );

  // Step 8: Test alternative filter combinations
  const commentFilterResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          actionType: "deleted_comment",
          contentType: "comment",
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(commentFilterResult);

  // Verify comment filter works independently
  commentFilterResult.data.forEach((action) => {
    TestValidator.equals(
      "action matches deleted_comment filter",
      action.action_type,
      "deleted_comment",
    );
    TestValidator.equals(
      "content matches comment type filter",
      action.content_type,
      "comment",
    );
  });

  // Step 9: Test with search/reason text filtering
  const searchFilterResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          search: "spam",
          actionType: "deleted_article",
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(searchFilterResult);
  TestValidator.predicate(
    "search with filter returns results",
    searchFilterResult.pagination !== undefined,
  );
}
