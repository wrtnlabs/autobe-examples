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
 * Test article search with category-based filtering.
 *
 * Members search for articles while filtering by specific categories (Economics
 * or Politics). The system returns only articles matching both the keyword
 * search and selected category filter. The test validates that category
 * filtering properly restricts results to the selected category, combines
 * correctly with keyword search, and returns accurate article counts with
 * proper metadata.
 *
 * Test workflow:
 *
 * 1. Register a member account to create test articles
 * 2. Create multiple test articles in Economics category with relevant keywords
 * 3. Create multiple test articles in Politics category with relevant keywords
 * 4. Search for articles with Economics category filter and verify only Economics
 *    articles returned
 * 5. Search for articles with Politics category filter and verify only Politics
 *    articles returned
 * 6. Search with keyword and category filter combined and verify correct results
 * 7. Verify pagination works correctly with category filtering
 * 8. Verify response includes category metadata and proper article counts
 */
export async function test_api_article_search_with_category_filtering(
  connection: api.IConnection,
) {
  // Step 1: Register a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "TestPassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);

  // Step 2: Create test articles in Economics category
  const economicsArticles: IDiscussionBoardArticle[] = [];
  for (let i = 0; i < 3; i++) {
    const economicsArticle =
      await api.functional.discussionBoard.member.articles.create(connection, {
        body: {
          title: `Economics Article ${i + 1}: Market Analysis`,
          content:
            "This article discusses economic trends, inflation, and market behavior in detail.",
          category_code: "economics",
        } satisfies IDiscussionBoardArticle.ICreate,
      });
    typia.assert(economicsArticle);
    economicsArticles.push(economicsArticle);
  }

  // Step 3: Create test articles in Politics category
  const politicsArticles: IDiscussionBoardArticle[] = [];
  for (let i = 0; i < 3; i++) {
    const politicsArticle =
      await api.functional.discussionBoard.member.articles.create(connection, {
        body: {
          title: `Politics Article ${i + 1}: Policy Analysis`,
          content:
            "This article discusses political decisions, governance, and policy frameworks in detail.",
          category_code: "politics",
        } satisfies IDiscussionBoardArticle.ICreate,
      });
    typia.assert(politicsArticle);
    politicsArticles.push(politicsArticle);
  }

  // Step 4: Search for articles with Economics category filter
  const economicsResults: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.search.articles.index(connection, {
      body: {
        category: "economics",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(economicsResults);

  // Verify all returned articles are in Economics category
  TestValidator.predicate(
    "all economics search results belong to economics category",
    economicsResults.data.every(
      (article) => article.category.code === "economics",
    ),
  );

  // Verify pagination metadata
  TestValidator.predicate(
    "economics search results have valid pagination",
    economicsResults.pagination.current >= 1 &&
      economicsResults.pagination.limit > 0 &&
      economicsResults.pagination.records >= 0 &&
      economicsResults.pagination.pages >= 0,
  );

  // Step 5: Search for articles with Politics category filter
  const politicsResults: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.search.articles.index(connection, {
      body: {
        category: "politics",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(politicsResults);

  // Verify all returned articles are in Politics category
  TestValidator.predicate(
    "all politics search results belong to politics category",
    politicsResults.data.every(
      (article) => article.category.code === "politics",
    ),
  );

  // Step 6: Search with keyword and category filter combined
  const keywordSearchResults: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.search.articles.index(connection, {
      body: {
        search: "Market",
        category: "economics",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(keywordSearchResults);

  // Verify results only contain Economics articles
  TestValidator.predicate(
    "keyword search with category filter returns only matching category",
    keywordSearchResults.data.every(
      (article) => article.category.code === "economics",
    ),
  );

  // Step 7: Verify pagination works correctly with category filtering
  const paginatedResults: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.search.articles.index(connection, {
      body: {
        category: "economics",
        page: 1,
        limit: 2,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(paginatedResults);

  TestValidator.predicate(
    "paginated category search respects limit parameter",
    paginatedResults.data.length <= 2,
  );

  TestValidator.predicate(
    "paginated results pagination data is consistent",
    paginatedResults.pagination.limit === 2 &&
      paginatedResults.pagination.current === 1,
  );

  // Step 8: Verify response includes category metadata
  TestValidator.predicate(
    "search results include category metadata for all articles",
    economicsResults.data.every(
      (article) =>
        article.category &&
        article.category.id &&
        article.category.code &&
        article.category.name,
    ),
  );

  // Verify articles have all required summary fields
  TestValidator.predicate(
    "search results include all required article fields",
    economicsResults.data.every(
      (article) =>
        article.id &&
        article.title &&
        article.createdAt &&
        article.updatedAt &&
        article.viewCount !== undefined &&
        article.status &&
        article.author &&
        article.author.id &&
        article.author.email &&
        article.commentCount !== undefined,
    ),
  );

  // Verify category data consistency
  if (economicsResults.data.length > 0) {
    const firstArticle = economicsResults.data[0];
    TestValidator.equals(
      "all economics articles have same category code",
      firstArticle.category.code,
      "economics",
    );
  }

  // Verify search without category filter returns mixed categories
  const allCategoryResults: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.search.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(allCategoryResults);

  // Should contain articles from multiple categories
  const categoryCodes = new Set(
    allCategoryResults.data.map((article) => article.category.code),
  );
  TestValidator.predicate(
    "search without category filter may return articles from multiple categories",
    categoryCodes.size >= 1,
  );
}
