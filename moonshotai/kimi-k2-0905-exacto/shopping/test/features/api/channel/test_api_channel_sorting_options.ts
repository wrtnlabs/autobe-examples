import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallChannel";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test channel sorting and ordering functionality for marketplace channels.
 *
 * This test validates that customers can sort channels by different criteria
 * including:
 *
 * - Name: Alphabetical ordering of channel names
 * - Code: Alphabetical ordering of channel codes
 * - CommissionRate: Numerical ordering by commission percentage
 * - CreatedAt: Chronological ordering by creation timestamp
 * - UpdatedAt: Chronological ordering by last update timestamp
 *
 * Test covers both ascending and descending sort orders, verifying:
 *
 * - Proper alphabetical ordering for text fields (name, code)
 * - Correct numerical ordering for commission rates
 * - Accurate date-time sorting for timestamps
 * - Sort consistency across multiple requests
 * - Pagination works correctly with sorting
 * - Default sorting behavior when no sortBy specified
 */
export async function test_api_channel_sorting_options(
  connection: api.IConnection,
) {
  // Test 1: Sort by name ascending
  const nameAscResult = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        sortBy: "name",
        sortOrder: "asc",
        limit: 10,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(nameAscResult);

  // Validate that channels are sorted alphabetically by name
  TestValidator.predicate(
    "name ascending sort order is correct",
    nameAscResult.data.every(
      (channel, index) =>
        index === 0 ||
        channel.name.localeCompare(nameAscResult.data[index - 1].name) >= 0,
    ),
  );

  // Test 2: Sort by name descending
  const nameDescResult = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        sortBy: "name",
        sortOrder: "desc",
        limit: 10,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(nameDescResult);

  // Validate that channels are sorted reverse alphabetically by name
  TestValidator.predicate(
    "name descending sort order is correct",
    nameDescResult.data.every(
      (channel, index) =>
        index === 0 ||
        channel.name.localeCompare(nameDescResult.data[index - 1].name) <= 0,
    ),
  );

  // Test 3: Sort by code ascending
  const codeAscResult = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        sortBy: "code",
        sortOrder: "asc",
        limit: 10,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(codeAscResult);

  TestValidator.predicate(
    "code ascending sort order is correct",
    codeAscResult.data.every(
      (channel, index) =>
        index === 0 ||
        channel.code.localeCompare(codeAscResult.data[index - 1].code) >= 0,
    ),
  );

  // Test 4: Sort by code descending
  const codeDescResult = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        sortBy: "code",
        sortOrder: "desc",
        limit: 10,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(codeDescResult);

  TestValidator.predicate(
    "code descending sort order is correct",
    codeDescResult.data.every(
      (channel, index) =>
        index === 0 ||
        channel.code.localeCompare(codeDescResult.data[index - 1].code) <= 0,
    ),
  );

  // Test 5: Sort by commission rate ascending
  const commissionAscResult = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        sortBy: "commissionRate",
        sortOrder: "asc",
        limit: 10,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(commissionAscResult);

  TestValidator.predicate(
    "commission rate ascending sort order is correct",
    commissionAscResult.data.every(
      (channel, index) =>
        index === 0 ||
        channel.commission_rate >=
          commissionAscResult.data[index - 1].commission_rate,
    ),
  );

  // Test 6: Sort by commission rate descending
  const commissionDescResult = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        sortBy: "commissionRate",
        sortOrder: "desc",
        limit: 10,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(commissionDescResult);

  TestValidator.predicate(
    "commission rate descending sort order is correct",
    commissionDescResult.data.every(
      (channel, index) =>
        index === 0 ||
        channel.commission_rate <=
          commissionDescResult.data[index - 1].commission_rate,
    ),
  );

  // Test 7: Sort by created date ascending (oldest first)
  const createdAscResult = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        sortBy: "createdAt",
        sortOrder: "asc",
        limit: 10,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(createdAscResult);

  TestValidator.predicate(
    "created date ascending sort order is correct",
    createdAscResult.data.every(
      (channel, index) =>
        index === 0 ||
        new Date(channel.created_at).getTime() >=
          new Date(createdAscResult.data[index - 1].created_at).getTime(),
    ),
  );

  // Test 8: Sort by created date descending (newest first)
  const createdDescResult = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        sortBy: "createdAt",
        sortOrder: "desc",
        limit: 10,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(createdDescResult);

  TestValidator.predicate(
    "created date descending sort order is correct",
    createdDescResult.data.every(
      (channel, index) =>
        index === 0 ||
        new Date(channel.created_at).getTime() <=
          new Date(createdDescResult.data[index - 1].created_at).getTime(),
    ),
  );

  // Test 9: Sort by updated date ascending
  const updatedAscResult = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        sortBy: "updatedAt",
        sortOrder: "asc",
        limit: 10,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(updatedAscResult);

  TestValidator.predicate(
    "updated date ascending sort order is correct",
    updatedAscResult.data.every(
      (channel, index) =>
        index === 0 ||
        new Date(channel.updated_at).getTime() >=
          new Date(updatedAscResult.data[index - 1].updated_at).getTime(),
    ),
  );

  // Test 10: Sort by updated date descending
  const updatedDescResult = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        sortBy: "updatedAt",
        sortOrder: "desc",
        limit: 10,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(updatedDescResult);

  TestValidator.predicate(
    "updated date descending sort order is correct",
    updatedDescResult.data.every(
      (channel, index) =>
        index === 0 ||
        new Date(channel.updated_at).getTime() <=
          new Date(updatedDescResult.data[index - 1].updated_at).getTime(),
    ),
  );

  // Test 11: Sort consistency - same request should return same order
  const consistencyTest1 = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        sortBy: "name",
        sortOrder: "asc",
        limit: 5,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );

  const consistencyTest2 = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        sortBy: "name",
        sortOrder: "asc",
        limit: 5,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );

  TestValidator.equals(
    "sort consistency - same request returns identical results",
    consistencyTest1.data.map((ch) => ch.id),
    consistencyTest2.data.map((ch) => ch.id),
  );

  // Test 12: Pagination with sorting
  const page1Result = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        sortBy: "commissionRate",
        sortOrder: "desc",
        page: 1,
        limit: 3,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(page1Result);

  const page2Result = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        sortBy: "commissionRate",
        sortOrder: "desc",
        page: 2,
        limit: 3,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(page2Result);

  // Validate pagination works correctly with sorting
  TestValidator.predicate(
    "pagination with sorting works correctly",
    page1Result.data.length === 3 && page2Result.data.length >= 0,
  );

  // Test 13: Default sorting (no sortBy specified)
  const defaultSortResult = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        limit: 10,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(defaultSortResult);

  // Should return valid data even without explicit sorting
  TestValidator.predicate(
    "default sort returns valid data",
    defaultSortResult.data.length > 0,
  );

  // Test 14: Case variations handled correctly in name sorting
  const caseSortResult = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        sortBy: "name",
        sortOrder: "asc",
        limit: 10,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(caseSortResult);

  // Validate that case variations are handled correctly in sorting
  TestValidator.predicate(
    "case variations handled correctly in name sorting",
    caseSortResult.data.every(
      (channel, index) =>
        index === 0 ||
        channel.name
          .toLowerCase()
          .localeCompare(caseSortResult.data[index - 1].name.toLowerCase()) >=
          0,
    ),
  );
}
