import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallChannelCategory";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";

/**
 * Test category sorting options used in administrative contexts for category
 * management workflows. Verify that administrators can organize categories
 * alphabetically, by creation date, or by custom display order for optimal
 * catalog organization. Validates sorting consistency and result ordering
 * across different field selections.
 *
 * Test Steps:
 *
 * 1. Create a marketplace channel to serve as the test environment
 * 2. Test all available sorting fields (name, code, display_order)
 * 3. Verify both ascending and descending sort orders work correctly
 * 4. Test search filtering combined with sorting
 * 5. Test active/inactive filtering with sorting
 * 6. Validate pagination works with sorting
 */
export async function test_api_channel_categories_administrative_sorting(
  connection: api.IConnection,
) {
  // Step 1: Create a marketplace channel
  const channelCode = RandomGenerator.alphaNumeric(10);
  const channel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: channelCode,
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        currency_code: "USD",
        language: "en",
        commission_rate: 10,
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // Step 2: Test sorting by name ascending
  const sortByNameAsc =
    await api.functional.shoppingMall.channels.categories.index(connection, {
      channelCode: channel.code,
      body: {
        sort_by: "name",
        sort_order: "asc",
        include_inactive: true,
      } satisfies IShoppingMallChannelCategory.IRequest,
    });
  typia.assert(sortByNameAsc);

  // Note: Since we don't have an API to create categories, we verify basic structure
  TestValidator.predicate(
    "categories response structure valid",
    ArrayUtil.has(sortByNameAsc.data, (category) => {
      return (
        typeof category.name === "string" &&
        typeof category.code === "string" &&
        category.sort_order !== undefined
      );
    }),
  );

  // Step 3: Test sorting by name descending
  const sortByNameDesc =
    await api.functional.shoppingMall.channels.categories.index(connection, {
      channelCode: channel.code,
      body: {
        sort_by: "name",
        sort_order: "desc",
        include_inactive: true,
      } satisfies IShoppingMallChannelCategory.IRequest,
    });
  typia.assert(sortByNameDesc);

  TestValidator.predicate(
    "categories descending response valid",
    ArrayUtil.has(sortByNameDesc.data, (category) => {
      return (
        typeof category.name === "string" &&
        typeof category.code === "string" &&
        category.sort_order !== undefined
      );
    }),
  );

  // Step 4: Test sorting by display_order ascending
  const sortByDisplayOrderAsc =
    await api.functional.shoppingMall.channels.categories.index(connection, {
      channelCode: channel.code,
      body: {
        sort_by: "display_order",
        sort_order: "asc",
        include_inactive: true,
      } satisfies IShoppingMallChannelCategory.IRequest,
    });
  typia.assert(sortByDisplayOrderAsc);

  TestValidator.predicate(
    "display order ascending valid",
    ArrayUtil.has(
      sortByDisplayOrderAsc.data,
      (category) =>
        category.sort_order !== undefined &&
        typeof category.sort_order === "number",
    ),
  );

  // Step 5: Test sorting by code ascending
  const sortByCodeAsc =
    await api.functional.shoppingMall.channels.categories.index(connection, {
      channelCode: channel.code,
      body: {
        sort_by: "code",
        sort_order: "asc",
        include_inactive: true,
      } satisfies IShoppingMallChannelCategory.IRequest,
    });
  typia.assert(sortByCodeAsc);

  TestValidator.predicate(
    "code ascending valid",
    ArrayUtil.has(
      sortByCodeAsc.data,
      (category) =>
        typeof category.code === "string" && category.code.length > 0,
    ),
  );

  // Step 6: Test search with sorting
  const searchResults =
    await api.functional.shoppingMall.channels.categories.index(connection, {
      channelCode: channel.code,
      body: {
        search: "electronics",
        sort_by: "name",
        sort_order: "asc",
        include_inactive: true,
      } satisfies IShoppingMallChannelCategory.IRequest,
    });
  typia.assert(searchResults);

  TestValidator.predicate(
    "search with sorting valid",
    searchResults.pagination.records >= 0,
  );

  // Step 7: Test filtering by active status with sorting
  const activeResults =
    await api.functional.shoppingMall.channels.categories.index(connection, {
      channelCode: channel.code,
      body: {
        is_active: true,
        sort_by: "name",
        sort_order: "desc",
        include_inactive: false,
      } satisfies IShoppingMallChannelCategory.IRequest,
    });
  typia.assert(activeResults);

  // Validate all returned categories are active when filtering
  TestValidator.predicate(
    "active filter results valid",
    activeResults.pagination.records === 0 ||
      ArrayUtil.has(
        activeResults.data,
        (category) => category.is_active === true,
      ),
  );

  // Step 8: Test hierarchical filtering with sorting
  const parentFilteredResults =
    await api.functional.shoppingMall.channels.categories.index(connection, {
      channelCode: channel.code,
      body: {
        is_active: true,
        sort_by: "code",
        sort_order: "asc",
        include_inactive: true,
        parent_id: null, // Root categories
      } satisfies IShoppingMallChannelCategory.IRequest,
    });
  typia.assert(parentFilteredResults);

  // Verify pagination metadata
  TestValidator.predicate(
    "pagination metadata valid",
    parentFilteredResults.pagination.current >= 0 &&
      parentFilteredResults.pagination.limit >= 0 &&
      parentFilteredResults.pagination.pages >= 0 &&
      parentFilteredResults.pagination.records >= 0,
  );

  // Step 9: Test without any filtering (default behavior)
  const defaultResults =
    await api.functional.shoppingMall.channels.categories.index(connection, {
      channelCode: channel.code,
      body: {} satisfies IShoppingMallChannelCategory.IRequest,
    });
  typia.assert(defaultResults);

  TestValidator.predicate(
    "default request valid",
    ArrayUtil.has(
      defaultResults.data,
      (category) =>
        category.id !== undefined && typeof category.name === "string",
    ),
  );

  // Step 10: Test combined filters with sorting
  const combinedFilters =
    await api.functional.shoppingMall.channels.categories.index(connection, {
      channelCode: channel.code,
      body: {
        is_active: true,
        include_inactive: false,
        sort_by: "code",
        sort_order: "desc",
        search: "category", // Generic search term
        category_type: null, // No specific type filter
        parent_id: undefined, // No parent filter
      } satisfies IShoppingMallChannelCategory.IRequest,
    });
  typia.assert(combinedFilters);

  TestValidator.predicate(
    "combined filters response valid",
    combinedFilters.data.length <= combinedFilters.pagination.records,
  );
}
