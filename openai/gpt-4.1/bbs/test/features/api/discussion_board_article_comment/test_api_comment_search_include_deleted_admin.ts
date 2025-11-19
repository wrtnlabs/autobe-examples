import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleComment";

/**
 * Tests admin ability to search for deleted and active comments in the
 * discussion board comment index endpoint.
 *
 * 1. As admin (simulated by absence of user constraints in test), first search for
 *    deleted comments (deleted=true) and verify all results have non-null
 *    deleted_at timestamps.
 * 2. Then search only for non-deleted comments (deleted=false) and verify all
 *    returned comments have null or undefined deleted_at.
 * 3. Test that combining both filters (deleted omitted) returns a mix of deleted
 *    and non-deleted, if such data exists.
 */
export async function test_api_comment_search_include_deleted_admin(
  connection: api.IConnection,
) {
  // Step 1: Search for DELETED comments only
  const deletedPage: IPageIDiscussionBoardArticleComment.ISummary =
    await api.functional.discussionBoard.comments.index(connection, {
      body: { deleted: true } satisfies IDiscussionBoardArticleComment.IRequest,
    });
  typia.assert(deletedPage);
  for (const comment of deletedPage.data) {
    TestValidator.predicate(
      "all returned comments with deleted=true should have non-null deleted_at",
      comment.deleted_at !== null && comment.deleted_at !== undefined,
    );
  }

  // Step 2: Search for ACTIVE (non-deleted) comments only
  const activePage: IPageIDiscussionBoardArticleComment.ISummary =
    await api.functional.discussionBoard.comments.index(connection, {
      body: {
        deleted: false,
      } satisfies IDiscussionBoardArticleComment.IRequest,
    });
  typia.assert(activePage);
  for (const comment of activePage.data) {
    TestValidator.predicate(
      "all returned comments with deleted=false should have null or undefined deleted_at",
      comment.deleted_at === null || comment.deleted_at === undefined,
    );
  }

  // Step 3: No deletion filter, should return any comment (may include deleted and non-deleted)
  const mixedPage: IPageIDiscussionBoardArticleComment.ISummary =
    await api.functional.discussionBoard.comments.index(connection, {
      body: {} satisfies IDiscussionBoardArticleComment.IRequest,
    });
  typia.assert(mixedPage);
  // At least all comments should have consistent deleted_at value with their presence in deleted/active requests
  // This portion verifies the system's behavior; we can assert only that the field is present or absent as allowed by type
}
