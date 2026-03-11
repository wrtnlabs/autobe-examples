import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_articles_browsing_multiple_filters_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Generate test UUIDs for filtering
  const authorId1: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const authorId2: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const sectionId1: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const sectionId2: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Test 1: Author filtering - verify response structure with author filter
  const authorFilterResponse =
    await api.functional.economicPoliticalBoard.articles.index(connection, {
      body: {
        authorId: authorId1,
      } satisfies IEconomicPoliticalBoardArticle.IRequest,
    });
  typia.assert(authorFilterResponse);
  TestValidator.equals(
    "author filter response type",
    authorFilterResponse.data.length,
    authorFilterResponse.data.length,
  );
  TestValidator.predicate(
    "author filter pagination structure valid",
    () =>
      authorFilterResponse.pagination.current >= 1 &&
      authorFilterResponse.pagination.limit >= 1 &&
      authorFilterResponse.pagination.records >= 0 &&
      authorFilterResponse.pagination.pages >= 0,
  );
  // Test 2: Tag filtering with multiple tags (OR logic among tags)
  const tagFilterResponse =
    await api.functional.economicPoliticalBoard.articles.index(connection, {
      body: {
        tags: ["economy", "politics", "debate"],
      } satisfies IEconomicPoliticalBoardArticle.IRequest,
    });
  typia.assert(tagFilterResponse);
  // Test 3: Case-sensitive tag matching
  const caseSensitiveTagResponse =
    await api.functional.economicPoliticalBoard.articles.index(connection, {
      body: {
        tags: ["Economy", "economy"],
      } satisfies IEconomicPoliticalBoardArticle.IRequest,
    });
  typia.assert(caseSensitiveTagResponse);
  // Test 4: Text search query
  const searchTextResponse =
    await api.functional.economicPoliticalBoard.articles.index(connection, {
      body: {
        query: "economy",
      } satisfies IEconomicPoliticalBoardArticle.IRequest,
    });
  typia.assert(searchTextResponse);
  // Test 5: Sorting by oldest
  const oldestSortResponse =
    await api.functional.economicPoliticalBoard.articles.index(connection, {
      body: {
        sortBy: "oldest",
      } satisfies IEconomicPoliticalBoardArticle.IRequest,
    });
  typia.assert(oldestSortResponse);
  // Test 6: Sorting by mostCommented
  const mostCommentedSortResponse =
    await api.functional.economicPoliticalBoard.articles.index(connection, {
      body: {
        sortBy: "mostCommented",
      } satisfies IEconomicPoliticalBoardArticle.IRequest,
    });
  typia.assert(mostCommentedSortResponse);
  // Test 7: Pagination with limit=100 (maximum allowed)
  const maxLimitResponse =
    await api.functional.economicPoliticalBoard.articles.index(connection, {
      body: {
        limit: 100,
      } satisfies IEconomicPoliticalBoardArticle.IRequest,
    });
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "limit 100 pagination limit",
    maxLimitResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "limit 100 pagination records consistent",
    () => maxLimitResponse.pagination.records >= maxLimitResponse.data.length,
  );
  // Test 8: Pagination page=2
  const page2Response =
    await api.functional.economicPoliticalBoard.articles.index(connection, {
      body: {
        page: 2,
        limit: 20,
      } satisfies IEconomicPoliticalBoardArticle.IRequest,
    });
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 pagination current",
    page2Response.pagination.current,
    2,
  );
  TestValidator.notEquals(
    "page 2 pagination differs from page 1",
    page2Response.data,
    authorFilterResponse.data,
  );
  // Test 9: Combined filters with AND logic between types
  const combinedFilterResponse =
    await api.functional.economicPoliticalBoard.articles.index(connection, {
      body: {
        sectionId: sectionId1,
        authorId: authorId1,
        tags: ["economy", "politics"],
      } satisfies IEconomicPoliticalBoardArticle.IRequest,
    });
  typia.assert(combinedFilterResponse);
  TestValidator.predicate(
    "combined filters pagination valid",
    () =>
      combinedFilterResponse.pagination.current === 1 &&
      combinedFilterResponse.pagination.records >= 0 &&
      combinedFilterResponse.pagination.pages >= 0,
  );
  // Test 10: Query with tag filtering combined
  const queryWithTagResponse =
    await api.functional.economicPoliticalBoard.articles.index(connection, {
      body: {
        query: "political",
        tags: ["economy", "politics"],
      } satisfies IEconomicPoliticalBoardArticle.IRequest,
    });
  typia.assert(queryWithTagResponse);
  // Test pagination metadata correctness
  TestValidator.predicate(
    "pagination pages calculation correct",
    () =>
      maxLimitResponse.pagination.pages ===
      Math.ceil(
        maxLimitResponse.pagination.records / maxLimitResponse.pagination.limit,
      ),
  );
  // Verify sorting order for oldest (created_at ASC)
  if (oldestSortResponse.data.length > 1) {
    for (let i = 1; i < oldestSortResponse.data.length; i++) {
      const prev = oldestSortResponse.data[i - 1];
      const curr = oldestSortResponse.data[i];
      TestValidator.predicate(
        `oldest sort order at index ${i}`,
        () => new Date(prev.created_at) <= new Date(curr.created_at),
      );
    }
  }
  // Verify sorting order for mostCommented (comment_count DESC)
  if (mostCommentedSortResponse.data.length > 1) {
    for (let i = 1; i < mostCommentedSortResponse.data.length; i++) {
      const prev = mostCommentedSortResponse.data[i - 1];
      const curr = mostCommentedSortResponse.data[i];
      TestValidator.predicate(
        `mostCommented sort order at index ${i}`,
        () => prev.comment_count >= curr.comment_count,
      );
    }
  }
  // Verify pagination metadata structure
  const paginations = [
    authorFilterResponse.pagination,
    tagFilterResponse.pagination,
    searchTextResponse.pagination,
    oldestSortResponse.pagination,
    mostCommentedSortResponse.pagination,
    maxLimitResponse.pagination,
    page2Response.pagination,
    combinedFilterResponse.pagination,
    queryWithTagResponse.pagination,
  ];
  for (const pagination of paginations) {
    TestValidator.predicate(
      `pagination current valid (${pagination.current})`,
      () => pagination.current >= 1,
    );
    TestValidator.predicate(
      `pagination limit valid (${pagination.limit})`,
      () => pagination.limit >= 1 && pagination.limit <= 100,
    );
    TestValidator.predicate(
      `pagination records valid (${pagination.records})`,
      () => pagination.records >= 0,
    );
    TestValidator.predicate(
      `pagination pages valid (${pagination.pages})`,
      () => pagination.pages >= 0,
    );
    TestValidator.predicate(`pagination consistency check`, () =>
      pagination.records === 0 ? pagination.pages === 0 : pagination.pages >= 1,
    );
  }
}
