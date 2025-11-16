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
 * Test filtering moderation actions by content type (article or comment).
 *
 * Validates that the moderation actions endpoint correctly filters results
 * based on content type to show only article moderation or only comment
 * moderation. Moderators use this filtering to focus on specific types of
 * content for targeted analysis, compliance review, and pattern
 * identification.
 *
 * Test workflow:
 *
 * 1. Register and authenticate as a moderator
 * 2. Request moderation actions filtered by article content type
 * 3. Validate all returned actions have content_type = "article"
 * 4. Request moderation actions filtered by comment content type
 * 5. Validate all returned actions have content_type = "comment"
 * 6. Test filter works with pagination
 * 7. Test filter works in combination with other filters
 * 8. Verify filters produce non-overlapping results
 */
export async function test_api_moderation_actions_filter_by_content_type(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorAuth: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderatorAuth);
  TestValidator.predicate(
    "moderator auth should include access token",
    !!moderatorAuth.token.access,
  );

  // Step 2: Filter by article content type
  const articleActionsResponse: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          contentType: "article",
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(articleActionsResponse);

  // Step 3: Validate all article actions have content_type = "article"
  if (articleActionsResponse.data.length > 0) {
    TestValidator.predicate(
      "all article filtered actions should have content_type article",
      articleActionsResponse.data.every(
        (action) => action.content_type === "article",
      ),
    );
  }

  // Step 4: Filter by comment content type
  const commentActionsResponse: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          contentType: "comment",
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(commentActionsResponse);

  // Step 5: Validate all comment actions have content_type = "comment"
  if (commentActionsResponse.data.length > 0) {
    TestValidator.predicate(
      "all comment filtered actions should have content_type comment",
      commentActionsResponse.data.every(
        (action) => action.content_type === "comment",
      ),
    );
  }

  // Step 6: Test content type filter with pagination
  const articlePage1: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          contentType: "article",
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(articlePage1);

  // Verify pagination info is correct
  TestValidator.predicate(
    "pagination should reflect article filter parameters",
    articlePage1.pagination.current === 1 &&
      articlePage1.pagination.limit === 10,
  );

  // Step 7: Test combining content type filter with action type filter
  const combinedFilterResponse: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          contentType: "article",
          actionType: "approved",
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(combinedFilterResponse);

  // Verify combined filters work correctly
  if (combinedFilterResponse.data.length > 0) {
    TestValidator.predicate(
      "combined filters should return only article approved actions",
      combinedFilterResponse.data.every(
        (action) =>
          action.content_type === "article" &&
          action.action_type === "approved",
      ),
    );
  }

  // Step 8: Test filter segregation - verify filters actually separate results
  if (
    articleActionsResponse.data.length > 0 &&
    commentActionsResponse.data.length > 0
  ) {
    const articleIds = new Set(articleActionsResponse.data.map((a) => a.id));
    const commentIds = new Set(commentActionsResponse.data.map((a) => a.id));

    // Verify no overlap between article and comment filtered results
    const overlap = [...articleIds].filter((id) => commentIds.has(id));
    TestValidator.predicate(
      "article and comment filters should produce non-overlapping results",
      overlap.length === 0,
    );
  }
}
