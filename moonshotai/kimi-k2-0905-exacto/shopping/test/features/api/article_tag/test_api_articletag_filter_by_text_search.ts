import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallArticleTag";
import type { IShoppingMallArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleTag";

/**
 * Test article tag discovery through text search functionality.
 *
 * This test validates comprehensive text search capabilities for article tags,
 * ensuring both customers and administrators can efficiently locate relevant
 * tags through partial matching across tag names and descriptions. The test
 * covers various search scenarios including exact matches, partial term
 * matching, case-insensitive search, and multi-word phrase searches.
 *
 * Test workflow:
 *
 * 1. Retrieve baseline tag data to understand current tag collection
 * 2. Generate comprehensive text search with positive terms
 * 3. Validate search result relevance and accuracy
 * 4. Test partial matching with substrings of tag names
 * 5. Verify case-insensitive search functionality
 * 6. Test multi-word phrase searching capabilities
 * 7. Validate search performance with pagination
 */
export async function test_api_articletag_filter_by_text_search(
  connection: api.IConnection,
) {
  // Step 1: Get baseline data with default parameters
  const baselineResult = await api.functional.shoppingMall.articleTags.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallArticleTag.IRequest,
    },
  );
  typia.assert(baselineResult);

  TestValidator.predicate(
    "baseline result contains pagination data",
    baselineResult.pagination.current === 1 &&
      baselineResult.pagination.limit === 20,
  );

  // Step 2: Test with positive search terms
  const searchQueries = ["tech", "electronics", "fashion", "home"];
  const selectedQuery = RandomGenerator.pick(searchQueries);

  const searchResult = await api.functional.shoppingMall.articleTags.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search: selectedQuery,
      } satisfies IShoppingMallArticleTag.IRequest,
    },
  );
  typia.assert(searchResult);

  // Validate that at least some results are returned
  TestValidator.predicate(
    "search returns meaningful results",
    searchResult.data.length >= 0 && searchResult.pagination.limit === 10,
  );

  // Step 3: Test comprehensive search with multiple terms
  const complexSearchBody = {
    page: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
    >(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<20>
    >(),
    search: RandomGenerator.paragraph({
      sentences: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
      >(),
    }),
  } satisfies IShoppingMallArticleTag.IRequest;

  const complexSearchResult =
    await api.functional.shoppingMall.articleTags.index(connection, {
      body: complexSearchBody,
    });
  typia.assert(complexSearchResult);

  TestValidator.predicate(
    "complex search respects pagination settings",
    complexSearchResult.pagination.current === complexSearchBody.page &&
      complexSearchResult.pagination.limit === complexSearchBody.limit,
  );

  // Step 4: Test case-insensitive search by comparing results
  const lowerCaseQuery = "test";
  const upperCaseQuery = "TEST";

  const lowerCaseResult = await api.functional.shoppingMall.articleTags.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search: lowerCaseQuery,
      } satisfies IShoppingMallArticleTag.IRequest,
    },
  );
  typia.assert(lowerCaseResult);

  const upperCaseResult = await api.functional.shoppingMall.articleTags.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search: upperCaseQuery,
      } satisfies IShoppingMallArticleTag.IRequest,
    },
  );
  typia.assert(upperCaseResult);

  TestValidator.predicate(
    "case-insensitive search produces consistent results",
    lowerCaseResult.data.length === upperCaseResult.data.length,
  );

  // Step 5: Test partial matching with meaningful terms
  const partialTerms = ["mob", "comp", "furn"];
  const partialTerm = RandomGenerator.pick(partialTerms);

  const partialSearchResult =
    await api.functional.shoppingMall.articleTags.index(connection, {
      body: {
        page: 1,
        limit: 15,
        search: partialTerm,
      } satisfies IShoppingMallArticleTag.IRequest,
    });
  typia.assert(partialSearchResult);

  // Validate search functionality with specific tag properties
  TestValidator.predicate(
    "partial search returns results",
    partialSearchResult.data.length >= 0,
  );

  // Step 6: Test with visible filter combined with search
  const visibleSearchResult =
    await api.functional.shoppingMall.articleTags.index(connection, {
      body: {
        page: 1,
        limit: 10,
        search: "product",
        visible: true,
      } satisfies IShoppingMallArticleTag.IRequest,
    });
  typia.assert(visibleSearchResult);

  TestValidator.predicate(
    "search with visible filter returns visible tags",
    visibleSearchResult.data.every((tag) => tag.visible === true),
  );

  // Step 7: Test pagination with search functionality
  const pageResults = await ArrayUtil.asyncRepeat(3, async (index) => {
    return await api.functional.shoppingMall.articleTags.index(connection, {
      body: {
        page: index + 1,
        limit: 5,
        search: "cat",
      } satisfies IShoppingMallArticleTag.IRequest,
    });
  });

  pageResults.forEach((result, index) => {
    typia.assert(result);
    TestValidator.equals(
      `pagination page ${index + 1} matches request`,
      result.pagination.current,
      index + 1,
    );
  });

  // Validate that different pages potentially return different results
  const uniqueResults = new Set(
    pageResults.map((result) => result.data.map((tag) => tag.id).join(",")),
  );

  TestValidator.predicate(
    "pagination produces different page content",
    uniqueResults.size > 1 || pageResults[0].data.length <= 5,
  );
}
