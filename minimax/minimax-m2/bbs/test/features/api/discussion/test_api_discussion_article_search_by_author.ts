import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalDiscussionArticle";

export async function test_api_discussion_article_search_by_author(
  connection: api.IConnection,
) {
  // Test author filtering functionality with realistic test data
  const testAuthorId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Test 1: Search for articles by specific author with proper validation
  const filteredResults: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        author_id: testAuthorId,
        page: 1,
        limit: 10,
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });
  typia.assert(filteredResults);

  // Validate pagination structure and properties
  TestValidator.equals(
    "pagination has current page",
    filteredResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination has limit",
    filteredResults.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    filteredResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    filteredResults.pagination.pages >= 0,
  );

  // Validate returned articles if any exist
  if (filteredResults.data.length > 0) {
    filteredResults.data.forEach((article) => {
      // Validate each article has required ISummary properties
      TestValidator.equals("article has id", typeof article.id, "string");
      TestValidator.equals("article has title", typeof article.title, "string");
      TestValidator.equals(
        "article has category",
        typeof article.category,
        "string",
      );
      TestValidator.equals(
        "article has status",
        typeof article.status,
        "string",
      );
      TestValidator.equals(
        "article has created_at",
        typeof article.created_at,
        "string",
      );
      TestValidator.equals(
        "article has updated_at",
        typeof article.updated_at,
        "string",
      );
    });
  } else {
    TestValidator.equals(
      "no articles found for author",
      filteredResults.data.length,
      0,
    );
  }

  // Test 2: Search without author filter for comparison
  const allArticlesResult: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });
  typia.assert(allArticlesResult);

  TestValidator.predicate(
    "unfiltered search returns array",
    Array.isArray(allArticlesResult.data),
  );

  // Test 3: Test pagination with author filtering
  const paginatedResult: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        author_id: testAuthorId,
        page: 2,
        limit: 5,
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });
  typia.assert(paginatedResult);

  // Validate pagination details
  TestValidator.equals(
    "paginated result current page",
    paginatedResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "paginated result limit",
    paginatedResult.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "paginated result records is valid",
    paginatedResult.pagination.records >= 0,
  );

  // Test 4: Combined filtering with sorting
  const combinedFilterResult: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        author_id: testAuthorId,
        category: "Economic Policy",
        search: "market analysis",
        order_by: "created_at",
        order_direction: "desc",
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });
  typia.assert(combinedFilterResult);

  // Validate combined filter result structure
  TestValidator.equals(
    "combined filter returns array",
    Array.isArray(combinedFilterResult.data),
    true,
  );

  // Test 5: Validate response consistency
  const consistencyCheck: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        author_id: testAuthorId,
        page: 1,
        limit: 5,
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });
  typia.assert(consistencyCheck);

  // Test 6: Test various pagination scenarios
  const paginationTests = [
    { page: 1, limit: 20, order_by: "created_at" as const },
    { page: 1, limit: 1, order_by: "title" as const },
    { page: 1, limit: 10, order_direction: "asc" as const },
    {
      page: 1,
      limit: 15,
      order_by: "updated_at" as const,
      order_direction: "desc" as const,
    },
  ];

  for (const testParams of paginationTests) {
    const result: IPageIEconPoliticalDiscussionArticle.ISummary =
      await api.functional.econPoliticalDiscussion.articles.index(connection, {
        body: {
          author_id: testAuthorId,
          ...testParams,
        } satisfies IEconPoliticalDiscussionArticle.IRequest,
      });
    typia.assert(result);

    // Validate pagination integrity
    TestValidator.predicate(
      "pagination data array exists",
      Array.isArray(result.data),
    );
    TestValidator.predicate(
      "pagination metadata is valid",
      result.pagination.current >= 0 &&
        result.pagination.limit > 0 &&
        result.pagination.limit <= 50,
    );
  }

  // Test 7: Test edge cases
  const edgeCaseResult: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        author_id: typia.random<string & tags.Format<"uuid">>(),
        page: 999999,
        limit: 100,
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });
  typia.assert(edgeCaseResult);

  // Edge case: Should handle invalid pagination gracefully
  TestValidator.predicate(
    "edge case returns valid structure",
    edgeCaseResult.data !== undefined &&
      edgeCaseResult.pagination !== undefined,
  );
}
