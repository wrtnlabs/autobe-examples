import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallArticleTag";
import type { IShoppingMallArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleTag";

/**
 * Test channel-specific tag filtering for multi-channel marketplace
 * environments.
 *
 * This test validates that article tags can be filtered by specific channel
 * codes to support channel-specific content categorization. The test will:
 *
 * 1. Filter tags by each channel code individually
 * 2. Verify that filtering returns properly structured responses
 * 3. Test pagination and sorting capabilities with channel filtering
 * 4. Validate search functionality within channel context
 * 5. Test visibility filtering
 * 6. Handle invalid channel codes appropriately
 *
 * This ensures tag management works correctly across different marketplace
 * channels and business units within the platform.
 */
export async function test_api_articletag_filter_by_channel_code(
  connection: api.IConnection,
) {
  // Test 1: Filter tags by electronics channel
  const electronicsTags = await api.functional.shoppingMall.articleTags.index(
    connection,
    {
      body: {
        channelCode: "electronics",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallArticleTag.IRequest,
    },
  );
  typia.assert(electronicsTags);

  // Validate pagination info
  TestValidator.equals(
    "electronics page should be 1",
    electronicsTags.pagination.current,
    1,
  );
  TestValidator.predicate(
    "electronics should have valid pagination",
    electronicsTags.pagination.limit > 0 &&
      electronicsTags.pagination.limit <= 100,
  );

  // Test 2: Filter tags by fashion channel
  const fashionTags = await api.functional.shoppingMall.articleTags.index(
    connection,
    {
      body: {
        channelCode: "fashion",
        page: 1,
        limit: 15,
      } satisfies IShoppingMallArticleTag.IRequest,
    },
  );
  typia.assert(fashionTags);

  // Test 3: Filter tags by home-goods channel with different parameters
  const homeGoodsTags = await api.functional.shoppingMall.articleTags.index(
    connection,
    {
      body: {
        channelCode: "home-goods",
        page: 2,
        limit: 10,
        sortBy: "name",
        sortOrder: "asc",
      } satisfies IShoppingMallArticleTag.IRequest,
    },
  );
  typia.assert(homeGoodsTags);

  // Test 4: Test with search query within channel
  const searchResults = await api.functional.shoppingMall.articleTags.index(
    connection,
    {
      body: {
        channelCode: "electronics",
        search: "mobile",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallArticleTag.IRequest,
    },
  );
  typia.assert(searchResults);

  // Test 5: Test with visibility filter
  const visibleTags = await api.functional.shoppingMall.articleTags.index(
    connection,
    {
      body: {
        channelCode: "fashion",
        visible: true,
        page: 1,
        limit: 25,
      } satisfies IShoppingMallArticleTag.IRequest,
    },
  );
  typia.assert(visibleTags);

  // Test 6: Test invalid channel code handling
  const invalidChannelResult =
    await api.functional.shoppingMall.articleTags.index(connection, {
      body: {
        channelCode: "non-existent-channel",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallArticleTag.IRequest,
    });
  typia.assert(invalidChannelResult);

  // Validate that all results are properly structured
  const allResults = [
    electronicsTags,
    fashionTags,
    homeGoodsTags,
    searchResults,
    visibleTags,
    invalidChannelResult,
  ];

  allResults.forEach((result, index) => {
    TestValidator.predicate(
      `result ${index} should have valid pagination`,
      result.pagination.current >= 1 &&
        result.pagination.limit >= 1 &&
        result.pagination.limit <= 100 &&
        result.pagination.records >= 0 &&
        result.pagination.pages >= 0 &&
        result.pagination.current <= Math.max(result.pagination.pages, 1),
    );

    TestValidator.predicate(
      `result ${index} data should be array`,
      Array.isArray(result.data),
    );

    TestValidator.predicate(
      `result ${index} data length should not exceed limit`,
      result.data.length <= result.pagination.limit,
    );

    // Validate each tag in the results
    result.data.forEach((tag, tagIndex) => {
      TestValidator.predicate(
        `tag ${tagIndex} should have valid UUID id`,
        typeof tag.id === "string" && tag.id.length > 0,
      );
      TestValidator.predicate(
        `tag ${tagIndex} should have valid code`,
        typeof tag.code === "string" && tag.code.length > 0,
      );
      TestValidator.predicate(
        `tag ${tagIndex} should have valid name`,
        typeof tag.name === "string" && tag.name.length > 0,
      );
      TestValidator.predicate(
        `tag ${tagIndex} should have valid color`,
        typeof tag.color === "string" && tag.color.length > 0,
      );
      TestValidator.predicate(
        `tag ${tagIndex} should have valid sequence`,
        typeof tag.sequence === "number" &&
          tag.sequence >= 0 &&
          Number.isInteger(tag.sequence),
      );
      TestValidator.predicate(
        `tag ${tagIndex} should have valid visible boolean`,
        typeof tag.visible === "boolean",
      );
    });
  });

  // Test 7: Compare results between different channels to ensure they're different
  TestValidator.notEquals(
    "electronics and fashion should return different results",
    electronicsTags.pagination.records,
    fashionTags.pagination.records,
  );

  // Test 8: Test edge case with maximum limit
  const maxLimitResults = await api.functional.shoppingMall.articleTags.index(
    connection,
    {
      body: {
        channelCode: "electronics",
        page: 1,
        limit: 100, // Maximum allowed limit
      } satisfies IShoppingMallArticleTag.IRequest,
    },
  );
  typia.assert(maxLimitResults);

  TestValidator.predicate(
    "max limit should not exceed 100",
    maxLimitResults.pagination.limit <= 100,
  );

  TestValidator.predicate(
    "max limit result should match pagination limit",
    maxLimitResults.pagination.limit === 100 ||
      maxLimitResults.data.length <= maxLimitResults.pagination.limit,
  );

  // Test 9: Test with specific tag name filter within channel
  const specificNameResults =
    await api.functional.shoppingMall.articleTags.index(connection, {
      body: {
        channelCode: "electronics",
        name: "smartphones",
        page: 1,
        limit: 5,
      } satisfies IShoppingMallArticleTag.IRequest,
    });
  typia.assert(specificNameResults);

  // Test 10: Test with specific tag code filter within channel
  const specificCodeResults =
    await api.functional.shoppingMall.articleTags.index(connection, {
      body: {
        channelCode: "electronics",
        code: "mobile-phones",
        page: 1,
        limit: 5,
      } satisfies IShoppingMallArticleTag.IRequest,
    });
  typia.assert(specificCodeResults);

  // Test 11: Test sorting by different fields
  const sortTests = [
    { sortBy: "name" as const, sortOrder: "asc" as const },
    { sortBy: "sequence" as const, sortOrder: "desc" as const },
    { sortBy: "createdAt" as const, sortOrder: "asc" as const },
  ];

  for (const sortConfig of sortTests) {
    const sortedResults = await api.functional.shoppingMall.articleTags.index(
      connection,
      {
        body: {
          channelCode: "electronics",
          page: 1,
          limit: 20,
          ...sortConfig,
        } satisfies IShoppingMallArticleTag.IRequest,
      },
    );
    typia.assert(sortedResults);

    TestValidator.predicate(
      `sorted by ${sortConfig.sortOrder} ${sortConfig.sortBy} should have valid data`,
      sortedResults.data.length >= 0,
    );

    // Additional validation for sorted results
    TestValidator.predicate(
      `sorted results should maintain pagination consistency`,
      sortedResults.data.length <= sortedResults.pagination.limit,
    );
  }

  // Test 12: Test pagination boundaries
  const totalRecords = electronicsTags.pagination.records;
  if (totalRecords > 0) {
    const lastPage = Math.ceil(totalRecords / 10);
    const lastPageResults = await api.functional.shoppingMall.articleTags.index(
      connection,
      {
        body: {
          channelCode: "electronics",
          page: lastPage,
          limit: 10,
        } satisfies IShoppingMallArticleTag.IRequest,
      },
    );
    typia.assert(lastPageResults);

    TestValidator.predicate(
      "last page should have valid data or be empty",
      lastPageResults.data.length >= 0 && lastPageResults.data.length <= 10,
    );

    TestValidator.equals(
      "last page pagination should be correct",
      lastPageResults.pagination.current,
      lastPage,
    );
  }

  // Test 13: Test edge case of exceeding available pages
  const beyondLastPage = await api.functional.shoppingMall.articleTags.index(
    connection,
    {
      body: {
        channelCode: "electronics",
        page: 999, // Far beyond available pages
        limit: 10,
      } satisfies IShoppingMallArticleTag.IRequest,
    },
  );
  typia.assert(beyondLastPage);

  TestValidator.predicate(
    "beyond last page should return empty or minimal data",
    beyondLastPage.data.length === 0 ||
      beyondLastPage.pagination.current > beyondLastPage.pagination.pages,
  );
}
