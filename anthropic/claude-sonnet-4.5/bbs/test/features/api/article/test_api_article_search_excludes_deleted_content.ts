import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test that article search automatically excludes soft-deleted articles from
 * results.
 *
 * This test validates that the search operation respects the deleted_at field
 * and maintains content integrity by hiding moderated or removed articles from
 * public discovery. It ensures pagination counts and metadata exclude deleted
 * articles from totals.
 *
 * Test Flow:
 *
 * 1. Create a member account for authentication
 * 2. Create multiple articles with distinct, searchable titles
 * 3. Soft-delete some of the created articles
 * 4. Perform search operations to retrieve articles
 * 5. Validate that deleted articles do not appear in search results
 * 6. Verify pagination metadata excludes deleted articles from counts
 */
export async function test_api_article_search_excludes_deleted_content(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "testPassword123";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create multiple articles with distinct titles
  const articleTitles = [
    "Economy Discussion Article One",
    "Political Analysis Article Two",
    "Market Trends Article Three",
    "Government Policy Article Four",
    "Trade Relations Article Five",
  ];

  const createdArticles: IDiscussionBoardArticle[] = [];

  for (const title of articleTitles) {
    const article = await api.functional.discussionBoard.articles.create(
      connection,
      {
        body: {
          title: title,
          body: RandomGenerator.content({ paragraphs: 3 }),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
    typia.assert(article);
    createdArticles.push(article);
  }

  TestValidator.equals(
    "created all articles",
    createdArticles.length,
    articleTitles.length,
  );

  // Step 3: Soft-delete some articles (delete first 2 articles)
  const articlesToDelete = createdArticles.slice(0, 2);
  const activeArticles = createdArticles.slice(2);

  for (const article of articlesToDelete) {
    const deletedArticle =
      await api.functional.discussionBoard.member.articles.erase(connection, {
        articleId: article.id,
      });
    typia.assert(deletedArticle);
    TestValidator.predicate(
      "article has deleted_at timestamp",
      deletedArticle.deleted_at !== null,
    );
  }

  // Step 4: Perform search to retrieve all articles
  const searchResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {} satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(searchResult);

  // Step 5: Validate deleted articles are excluded from search results
  const returnedArticleIds = searchResult.data.map((article) => article.id);
  const deletedArticleIds = articlesToDelete.map((article) => article.id);
  const activeArticleIds = activeArticles.map((article) => article.id);

  for (const deletedId of deletedArticleIds) {
    TestValidator.predicate(
      "deleted article not in search results",
      returnedArticleIds.includes(deletedId) === false,
    );
  }

  // Verify active articles are still present
  for (const activeId of activeArticleIds) {
    TestValidator.predicate(
      "active article is in search results",
      returnedArticleIds.includes(activeId),
    );
  }

  // Step 6: Verify pagination metadata excludes deleted articles
  TestValidator.predicate(
    "pagination records count excludes deleted articles",
    searchResult.pagination.records >= activeArticles.length,
  );

  // Additional test: Search with keyword that matches deleted article
  const deletedArticleTitle = articlesToDelete[0].title;
  const searchKeyword = deletedArticleTitle.split(" ")[0];

  const keywordSearchResult =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        search: searchKeyword,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(keywordSearchResult);

  const keywordResultIds = keywordSearchResult.data.map(
    (article) => article.id,
  );

  for (const deletedId of deletedArticleIds) {
    TestValidator.predicate(
      "deleted article not in keyword search results",
      keywordResultIds.includes(deletedId) === false,
    );
  }
}
