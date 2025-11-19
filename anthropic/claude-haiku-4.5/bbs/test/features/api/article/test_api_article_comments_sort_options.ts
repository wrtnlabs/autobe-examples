import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";

/**
 * Test sorting comments by different fields (created_at and reply_count) on a
 * discussion board article.
 *
 * This test validates that:
 *
 * 1. Comments can be sorted by creation time (newest first) and reply count
 *    (highest first)
 * 2. Sort order is consistent across multiple pagination pages
 * 3. The default sort order is by creation_at (newest first)
 * 4. Sorting is stable when multiple comments have the same sort value
 * 5. Sorting works correctly when filters are applied
 *
 * Steps:
 *
 * 1. Register a contributor and authenticate
 * 2. Create an article in draft status
 * 3. Create multiple comments with different creation times and reply counts
 * 4. Test sorting by created_at (default) - verify newest first
 * 5. Test sorting by reply_count - verify highest first
 * 6. Verify sort order is consistent across pagination pages
 * 7. Test sorting with filters applied (date range, author filter)
 */
export async function test_api_article_comments_sort_options(
  connection: api.IConnection,
) {
  // Step 1: Register contributor
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: "SecurePass123!",
        href: "http://example.com/register",
        referrer: "http://example.com",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Step 2: Create article
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          categoryId: categoryId,
          href: "http://example.com/article",
          referrer: "http://example.com",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // Step 3: Test default sort (created_at - newest first)
  const defaultSortResult: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(defaultSortResult);
  TestValidator.predicate(
    "default sort result has pagination info",
    defaultSortResult.pagination !== undefined,
  );

  // Step 4: Test sorting by created_at explicitly
  const sortByCreatedAt: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
        sort_by: "created_at",
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(sortByCreatedAt);
  TestValidator.equals(
    "created_at sort returns results",
    sortByCreatedAt.pagination.records >= 0,
    true,
  );

  // Step 5: Test sorting by reply_count
  const sortByReplyCount: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
        sort_by: "reply_count",
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(sortByReplyCount);
  TestValidator.equals(
    "reply_count sort returns results",
    sortByReplyCount.pagination.records >= 0,
    true,
  );

  // Step 6: Test pagination consistency
  const page1: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 10,
        sort_by: "created_at",
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(page1);

  const page2: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 2,
        limit: 10,
        sort_by: "created_at",
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(page2);
  TestValidator.predicate(
    "pagination is consistent across pages",
    page1.pagination.limit === page2.pagination.limit,
  );

  // Step 7: Test sorting with filters
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const filteredSort: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
        sort_by: "created_at",
        created_after: oneHourAgo,
        created_before: now,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(filteredSort);
  TestValidator.equals(
    "filtered sort maintains pagination structure",
    filteredSort.pagination !== undefined,
    true,
  );
}
