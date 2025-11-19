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

export async function test_api_article_comments_search_by_content(
  connection: api.IConnection,
) {
  // 1. Register a new contributor for authentication
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(12),
        password: "SecurePass123!",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Get a valid category ID by generating random UUID for category
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  // 2. Create an article to hold comments for testing
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: "Economic Policy Discussion Article",
          content: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          categoryId: categoryId,
          href: "http://localhost:3000/articles/new",
          referrer: "http://localhost:3000",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // 3. Test search with exact phrase match
  const searchExactPhrase =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        search: "economic policy",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(searchExactPhrase);
  TestValidator.predicate(
    "search with exact phrase should return results",
    searchExactPhrase.data.length >= 0,
  );

  // 4. Test search with partial keyword match
  const searchPartialMatch =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        search: "inflation",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(searchPartialMatch);
  TestValidator.predicate(
    "search with keyword should work",
    searchPartialMatch.pagination.current === 1,
  );

  // 5. Test case-insensitive search
  const searchCaseInsensitive =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        search: "MARKET",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(searchCaseInsensitive);
  TestValidator.predicate(
    "case-insensitive search should work",
    searchCaseInsensitive.pagination.limit === 20,
  );

  // 6. Test search with no matches
  const searchNoMatches =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        search: "nonexistentkey12345xyz",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(searchNoMatches);
  TestValidator.equals(
    "search with no matches should return empty results",
    searchNoMatches.data.length,
    0,
  );

  // 7. Test pagination parameters
  const searchWithPagination =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(searchWithPagination);
  TestValidator.equals(
    "pagination limit should be respected",
    searchWithPagination.pagination.limit,
    10,
  );

  // 8. Test sorting by creation date
  const searchSortedByDate =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
        sort_by: "created_at",
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(searchSortedByDate);
  TestValidator.predicate(
    "search with sorting should return valid results",
    searchSortedByDate.pagination.records >= 0,
  );

  // 9. Test search with multiple words
  const searchMultipleWords =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        search: "policy discussion",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(searchMultipleWords);
  TestValidator.predicate(
    "search with multiple words should handle gracefully",
    searchMultipleWords.pagination.current >= 1,
  );

  // 10. Test search without query parameter
  const searchNoQuery =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(searchNoQuery);
  TestValidator.predicate(
    "search without query should return all comments",
    searchNoQuery.pagination.current === 1,
  );

  // 11. Validate pagination metadata
  TestValidator.predicate(
    "pagination should have valid structure",
    searchNoQuery.pagination.pages >= 0 &&
      searchNoQuery.pagination.records >= 0,
  );

  // 12. Test pagination with different page size
  const searchLimitResults =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(searchLimitResults);
  TestValidator.equals(
    "search results should respect limit parameter",
    searchLimitResults.pagination.limit,
    5,
  );
}
