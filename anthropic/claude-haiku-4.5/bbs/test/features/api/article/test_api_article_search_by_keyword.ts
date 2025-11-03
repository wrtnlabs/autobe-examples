import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test article search functionality with keyword filtering.
 *
 * This test validates the article search API by:
 *
 * 1. Creating an authenticated member account for searching
 * 2. Creating multiple articles with different titles and content
 * 3. Searching articles using specific keywords
 * 4. Validating search results return only matching articles
 * 5. Testing search ranking (title matches ranked higher than content)
 * 6. Testing pagination to verify result set management
 */
export async function test_api_article_search_by_keyword(
  connection: api.IConnection,
) {
  // Step 1: Register a member account for article creation and searching
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPass123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);
  TestValidator.predicate("member registered successfully", member !== null);

  // Step 2: Create first article with keyword "economic" in title and "inflation" in content
  const article1: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Economic Impact of Global Trade",
        content:
          "This article discusses inflation rates and monetary policy implications for global trade. Inflation has been rising significantly.",
        category_code: "economics",
        attachments: [],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article1);
  TestValidator.equals(
    "article1 created with economic title",
    article1.title,
    "Economic Impact of Global Trade",
  );

  // Step 3: Create second article with keyword "inflation" in title and "economic" in content
  const article2: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Understanding Inflation Trends in Modern Markets",
        content:
          "Economic models show that inflation affects purchasing power. Central banks use economic tools to manage inflation.",
        category_code: "economics",
        attachments: [],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article2);
  TestValidator.equals(
    "article2 created with inflation title",
    article2.title,
    "Understanding Inflation Trends in Modern Markets",
  );

  // Step 4: Create third article with neither keyword
  const article3: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Political Discourse in Democratic Societies",
        content:
          "This article explores how political institutions function and evolve over time.",
        category_code: "politics",
        attachments: [],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article3);
  TestValidator.equals(
    "article3 created with political title",
    article3.title,
    "Political Discourse in Democratic Societies",
  );

  // Step 5: Search for "economic" keyword - should return articles 1 and 2
  const searchResult1: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        search: "economic",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResult1);
  TestValidator.predicate(
    "search results contain data",
    searchResult1.data.length > 0,
  );
  TestValidator.predicate(
    "article1 found in economic search results",
    searchResult1.data.some((a) => a.id === article1.id),
  );
  TestValidator.predicate(
    "article2 found in economic search results",
    searchResult1.data.some((a) => a.id === article2.id),
  );
  TestValidator.predicate(
    "article3 not found in economic search results",
    !searchResult1.data.some((a) => a.id === article3.id),
  );

  // Step 6: Search for "inflation" keyword - should return articles 1 and 2
  const searchResult2: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        search: "inflation",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResult2);
  TestValidator.predicate(
    "inflation search results contain data",
    searchResult2.data.length > 0,
  );
  TestValidator.predicate(
    "article1 found in inflation search results",
    searchResult2.data.some((a) => a.id === article1.id),
  );
  TestValidator.predicate(
    "article2 found in inflation search results",
    searchResult2.data.some((a) => a.id === article2.id),
  );

  // Step 7: Test search ranking - article with keyword in title should rank higher
  // Article 2 has "inflation" in title, Article 1 has "inflation" only in content
  const article2Index = searchResult2.data.findIndex(
    (a) => a.id === article2.id,
  );
  const article1Index = searchResult2.data.findIndex(
    (a) => a.id === article1.id,
  );
  TestValidator.predicate(
    "article2 (inflation in title) ranks higher than article1 (inflation in content)",
    article2Index <= article1Index,
  );

  // Step 8: Test pagination with limit=1
  const paginatedResult1: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        search: "economic",
        page: 1,
        limit: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(paginatedResult1);
  TestValidator.equals(
    "pagination limit=1 returns exactly 1 article",
    paginatedResult1.data.length,
    1,
  );
  TestValidator.equals(
    "pagination current page is 1",
    paginatedResult1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 1",
    paginatedResult1.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    paginatedResult1.pagination.pages > 0,
  );

  // Step 9: Test pagination with page=2
  const paginatedResult2: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        search: "economic",
        page: 2,
        limit: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(paginatedResult2);
  TestValidator.equals(
    "pagination page=2 returns 1 article",
    paginatedResult2.data.length,
    1,
  );
  TestValidator.equals(
    "pagination current page is 2",
    paginatedResult2.pagination.current,
    2,
  );

  // Step 10: Verify different articles returned on different pages
  const page1Article = paginatedResult1.data[0];
  const page2Article = paginatedResult2.data[0];
  TestValidator.notEquals(
    "different articles returned on different pages",
    page1Article.id,
    page2Article.id,
  );

  // Step 11: Test search with no results
  const emptySearchResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        search: "nonexistent_keyword_xyz",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(emptySearchResult);
  TestValidator.equals(
    "empty search returns no results",
    emptySearchResult.data.length,
    0,
  );

  // Step 12: Test category filtering with search
  const categoryFilteredSearch: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        search: "economic",
        category: "politics",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(categoryFilteredSearch);
  TestValidator.equals(
    "category filter excludes economics articles",
    categoryFilteredSearch.data.length,
    0,
  );

  // Step 13: Test author filtering combined with search
  const authorFilteredSearch: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        search: "economic",
        author_id: member.id,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(authorFilteredSearch);
  TestValidator.predicate(
    "author filter returns only member's articles",
    authorFilteredSearch.data.every((a) => a.author.id === member.id),
  );
}
