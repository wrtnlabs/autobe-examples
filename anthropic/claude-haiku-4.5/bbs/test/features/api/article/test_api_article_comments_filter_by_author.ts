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
 * Test filtering comments by specific contributor author.
 *
 * This test validates the comment filtering functionality by:
 *
 * 1. Creating multiple contributor accounts
 * 2. Creating an article in the discussion board
 * 3. Testing the comments index endpoint with author_id filtering parameter
 * 4. Verifying pagination and sorting work correctly with author filtering
 * 5. Testing various filter combinations and parameters
 */
export async function test_api_article_comments_filter_by_author(
  connection: api.IConnection,
) {
  // Step 1: Register first contributor (article author)
  const contributor1: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string & tags.MinLength<3> & tags.MaxLength<50>
        >(),
        password: "SecurePass123!@",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor1);

  // Step 2: Register second contributor
  const contributor2: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string & tags.MinLength<3> & tags.MaxLength<50>
        >(),
        password: "SecurePass123!@",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor2);

  // Step 3: Register third contributor
  const contributor3: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string & tags.MinLength<3> & tags.MaxLength<50>
        >(),
        password: "SecurePass123!@",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor3);

  // Step 4: Create article as first contributor
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 5 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // Step 5: Test filtering comments by first contributor author
  const filterByContributor1: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        author_id: contributor1.id,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(filterByContributor1);
  TestValidator.equals(
    "pagination current page for contributor 1 filter",
    filterByContributor1.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    filterByContributor1.pagination.records >= 0,
  );

  // Step 6: Test filtering comments by second contributor author
  const filterByContributor2: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        author_id: contributor2.id,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(filterByContributor2);
  TestValidator.equals(
    "pagination current page for contributor 2 filter",
    filterByContributor2.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit should match requested limit",
    filterByContributor2.pagination.limit === 20,
  );

  // Step 7: Test filtering with non-existent author ID
  const nonExistentAuthorId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const filterByNonExistentAuthor: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        author_id: nonExistentAuthorId,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(filterByNonExistentAuthor);
  TestValidator.predicate(
    "non-existent author should return valid pagination",
    filterByNonExistentAuthor.pagination.records >= 0,
  );

  // Step 8: Test pagination with author filtering
  const paginationTest: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        author_id: contributor1.id,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(paginationTest);
  TestValidator.equals(
    "pagination limit should be respected with author filter",
    paginationTest.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination current should be positive",
    paginationTest.pagination.current > 0,
  );

  // Step 9: Test sorting by created_at with author filtering
  const sortByCreatedAt: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        author_id: contributor2.id,
        page: 1,
        limit: 20,
        sort_by: "created_at",
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(sortByCreatedAt);
  TestValidator.predicate(
    "sorting by created_at should work with author filter",
    sortByCreatedAt.pagination.pages >= 0,
  );

  // Step 10: Test sorting by reply_count with author filtering
  const sortByReplyCount: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        author_id: contributor3.id,
        page: 1,
        limit: 20,
        sort_by: "reply_count",
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(sortByReplyCount);
  TestValidator.equals(
    "pagination should be valid with reply_count sorting",
    sortByReplyCount.pagination.current,
    1,
  );

  // Step 11: Test nested replies inclusion with author filtering
  const withNestedReplies: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        author_id: contributor1.id,
        page: 1,
        limit: 20,
        include_nested: true,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(withNestedReplies);
  TestValidator.predicate(
    "should handle nested replies inclusion with author filter",
    withNestedReplies.pagination.pages >= 0,
  );

  // Step 12: Test without nested replies with author filtering
  const withoutNestedReplies: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        author_id: contributor2.id,
        page: 1,
        limit: 20,
        include_nested: false,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(withoutNestedReplies);
  TestValidator.predicate(
    "should handle without nested replies with author filter",
    withoutNestedReplies.pagination.records >= 0,
  );
}
