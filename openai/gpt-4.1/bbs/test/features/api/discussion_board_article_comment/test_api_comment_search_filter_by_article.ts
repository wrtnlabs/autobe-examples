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
 * Test retrieving comments belonging to a specific article using the article
 * filter.
 *
 * 1. Retrieve a seed comment page with typia.random (simulation mode) or a real
 *    API call. Pick at least two article IDs that each have at least one
 *    comment.
 * 2. For each selected article ID, call the comment search API with
 *    discussion_board_article_id set to that article's id.
 * 3. For each result, verify that every returned comment's .article.id matches the
 *    filter value.
 * 4. Confirm that no comments of other articles are present in the results.
 * 5. Use TestValidator for thorough assertion of all checks.
 */
export async function test_api_comment_search_filter_by_article(
  connection: api.IConnection,
) {
  // 1. Obtain simulated complete comment list/sample for multiple articles
  const all: IPageIDiscussionBoardArticleComment.ISummary =
    await api.functional.discussionBoard.comments.index(connection, {
      body: {},
    });
  typia.assert(all);
  // Group comments by article IDs
  const articles = Array.from(
    new Set(all.data.map((comment) => comment.article.id)),
  );
  // Ensure there are at least two articles with comments
  TestValidator.predicate(
    "at least two articles with comments exist",
    articles.length >= 2,
  );
  // For each of the first two article IDs
  for (const articleId of articles.slice(0, 2)) {
    // 2. Search comments filtered by the current articleId
    const page: IPageIDiscussionBoardArticleComment.ISummary =
      await api.functional.discussionBoard.comments.index(connection, {
        body: {
          discussion_board_article_id: articleId,
        } satisfies IDiscussionBoardArticleComment.IRequest,
      });
    typia.assert(page);
    // 3. Check every result matches the filter value
    for (const comment of page.data) {
      TestValidator.equals(
        "comment.article.id must equal filtered articleId",
        comment.article.id,
        articleId,
      );
    }
    // 4. Ensure no comment of any other article is present
    TestValidator.predicate(
      "no comments from other articles appear",
      page.data.every((c) => c.article.id === articleId),
    );
  }
}
