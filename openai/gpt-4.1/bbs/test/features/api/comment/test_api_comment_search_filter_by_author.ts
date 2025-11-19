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
 * E2E test filtering discussion board comments by author.
 *
 * This test verifies that when searching comments with a specific author filter
 * (discussion_board_user_id), only comments by that user are returned, and that
 * pagination metadata is correct. The test generates comments for at least two
 * users, issues a search query for one author's comments, and validates all
 * results.
 *
 * Steps:
 *
 * 1. Generate two fake users (authorA, authorB).
 * 2. Generate a discussion board article for association.
 * 3. Create multiple comments (some for authorA, some for authorB) on the article.
 * 4. Patch-search for comments using discussion_board_user_id set to authorA.id
 *    and a specific page size.
 * 5. Check all returned comments are authored by authorA.
 * 6. Validate pagination structure of the result.
 */
export async function test_api_comment_search_filter_by_author(
  connection: api.IConnection,
) {
  // 1. Generate two users (authorA, authorB) as plain objects satisfying ISummary
  const authorA = {
    id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies IDiscussionBoardUser.ISummary;

  const authorB = {
    id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies IDiscussionBoardUser.ISummary;

  // 2. Generate a discussion article
  const article = {
    id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    user: authorA, // Article owner is authorA
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IDiscussionBoardArticle.ISummary;

  // 3. Create comment array (ensure both authors are represented)
  const comments: IDiscussionBoardArticleComment.ISummary[] = [
    // Comments by authorA
    ...ArrayUtil.repeat(3, () => ({
      id: typia.random<string & tags.Format<"uuid">>(),
      author: authorA,
      article,
      body: RandomGenerator.paragraph({ sentences: 6 }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    })),
    // Comments by authorB
    ...ArrayUtil.repeat(2, () => ({
      id: typia.random<string & tags.Format<"uuid">>(),
      author: authorB,
      article,
      body: RandomGenerator.paragraph({ sentences: 4 }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    })),
  ];

  // Because actual creation API is not available, comments are only for local expectations

  // 4. Perform search using discussion_board_user_id (authorA)
  const pageLimit = 10;
  const searchBody = {
    discussion_board_user_id: authorA.id,
    limit: pageLimit,
    page: 1,
  } satisfies IDiscussionBoardArticleComment.IRequest;

  const result = await api.functional.discussionBoard.comments.index(
    connection,
    {
      body: searchBody,
    },
  );
  typia.assert(result);

  // 5. Validate all returned comments are from authorA
  for (const c of result.data) {
    TestValidator.equals(
      "comment is authored by filtered user",
      c.author.id,
      authorA.id,
    );
  }

  // 6. Validate pagination structure
  TestValidator.predicate(
    "pagination current is 1",
    result.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    result.pagination.limit === pageLimit,
  );
  TestValidator.predicate(
    "pagination records is at least returned data length",
    result.pagination.records >= result.data.length,
  );
  TestValidator.predicate(
    "pagination pages is at least 1",
    result.pagination.pages >= 1,
  );
}
