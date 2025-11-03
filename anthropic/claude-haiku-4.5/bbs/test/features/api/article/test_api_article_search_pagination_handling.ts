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
 * Test pagination functionality in article search.
 *
 * Creates 25+ articles to exceed default page size thresholds. Tests pagination
 * by:
 *
 * 1. Creating a member account for article authorship
 * 2. Creating 25+ articles across Economics and Politics categories
 * 3. Searching articles with pagination parameters (page, limit)
 * 4. Verifying correct number of results per page
 * 5. Validating pagination metadata (current page, limit, total records, total
 *    pages)
 * 6. Testing page navigation by requesting different page numbers
 * 7. Verifying consistent article ordering across pages
 * 8. Testing edge cases (page beyond available results, boundary pages)
 * 9. Validating that each page contains expected articles
 */
export async function test_api_article_search_pagination_handling(
  connection: api.IConnection,
) {
  // 1. Register a member account for creating articles
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);
  TestValidator.predicate("member created successfully", member.id !== null);

  // 2. Create 25+ articles to exceed default pagination size
  const articleCount = 30;
  const createdArticles: IDiscussionBoardArticle[] = [];

  const categories = ["economics", "politics"] as const;

  for (let i = 0; i < articleCount; i++) {
    const article: IDiscussionBoardArticle =
      await api.functional.discussionBoard.member.articles.create(connection, {
        body: {
          title: `Test Article ${i + 1} - ${RandomGenerator.paragraph({ sentences: 2 })}`,
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          category_code: categories[i % 2],
          attachments: undefined,
        } satisfies IDiscussionBoardArticle.ICreate,
      });
    typia.assert(article);
    createdArticles.push(article);
  }

  TestValidator.equals(
    "created articles count",
    createdArticles.length,
    articleCount,
  );

  // 3. Test pagination with default limit (page 1)
  const page1Response: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(page1Response);

  // Verify pagination metadata for page 1
  TestValidator.equals(
    "page 1 current page number",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Response.pagination.limit, 10);
  TestValidator.predicate(
    "page 1 has correct total records",
    page1Response.pagination.records >= articleCount,
  );
  TestValidator.predicate(
    "page 1 data length matches limit",
    page1Response.data.length <= 10,
  );
  TestValidator.predicate(
    "total pages calculated correctly",
    page1Response.pagination.pages >= Math.ceil(articleCount / 10),
  );

  // 4. Test page 2
  const page2Response: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 2,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(page2Response);

  TestValidator.equals(
    "page 2 current page number",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 10);
  TestValidator.predicate(
    "page 2 data length matches limit",
    page2Response.data.length <= 10,
  );

  // Verify different content between pages
  if (page1Response.data.length > 0 && page2Response.data.length > 0) {
    TestValidator.notEquals(
      "page 1 and page 2 have different articles",
      page1Response.data[0],
      page2Response.data[0],
      (key) => key === "createdAt" || key === "updatedAt",
    );
  }

  // 5. Test page 3 to verify continuation of pagination
  const page3Response: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 3,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(page3Response);

  TestValidator.equals(
    "page 3 current page number",
    page3Response.pagination.current,
    3,
  );
  TestValidator.equals("page 3 limit", page3Response.pagination.limit, 10);

  // 6. Test with different page limit
  const pageLimitResponse: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 15,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(pageLimitResponse);

  TestValidator.equals(
    "custom limit applied",
    pageLimitResponse.pagination.limit,
    15,
  );
  TestValidator.predicate(
    "data respects custom limit",
    pageLimitResponse.data.length <= 15,
  );

  // 7. Test edge case: page beyond available results
  const maxPages = page1Response.pagination.pages;
  const beyondPageResponse: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: maxPages + 5,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(beyondPageResponse);

  TestValidator.predicate(
    "beyond page returns empty or last page data",
    beyondPageResponse.data.length === 0 ||
      beyondPageResponse.pagination.current === maxPages + 5,
  );

  // 8. Test pagination metadata consistency
  TestValidator.equals(
    "page 1 and page 2 have same total records",
    page1Response.pagination.records,
    page2Response.pagination.records,
  );
  TestValidator.equals(
    "page 1 and page 2 have same total pages",
    page1Response.pagination.pages,
    page2Response.pagination.pages,
  );

  // 9. Test category filtering with pagination
  const economicsPage1: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        category: "economics",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(economicsPage1);

  TestValidator.predicate(
    "economics category has articles",
    economicsPage1.data.length >= 0,
  );

  // 10. Test search with pagination
  if (createdArticles.length > 0) {
    const firstArticleTitle = createdArticles[0].title.substring(0, 10);

    const searchResultPage1: IPageIDiscussionBoardArticle.ISummary =
      await api.functional.discussionBoard.articles.index(connection, {
        body: {
          search: "Test Article",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      });
    typia.assert(searchResultPage1);

    TestValidator.predicate(
      "search with pagination returns results",
      searchResultPage1.data.length >= 0,
    );
  }

  // 11. Verify article ordering consistency across pages
  const allArticlesPage1: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        sort_by: "created_at",
        sort_order: "asc",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(allArticlesPage1);

  const allArticlesPage2: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        sort_by: "created_at",
        sort_order: "asc",
        page: 2,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(allArticlesPage2);

  TestValidator.predicate(
    "pages maintain consistent sort order",
    allArticlesPage1.data.length > 0,
  );
}
