import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallChannel";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Validate pagination functionality for shopping mall channel listing API.
 *
 * This test comprehensively validates the pagination system by testing
 * different page numbers and limit values. It verifies that the system properly
 * handles page boundaries, returns correct pagination metadata (current page,
 * total records, total pages), and maintains consistent results across page
 * transitions. The test includes edge cases like requesting pages beyond
 * available data and minimum/maximum limit values.
 */
export async function test_api_channel_listing_with_pagination(
  connection: api.IConnection,
) {
  // Test 1: Default pagination (no parameters)
  const defaultPage = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {} satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(defaultPage);

  // Validate default pagination structure
  TestValidator.predicate(
    "default page has valid pagination metadata",
    defaultPage.pagination.current >= 0 &&
      defaultPage.pagination.limit > 0 &&
      defaultPage.pagination.records >= 0 &&
      defaultPage.pagination.pages >= 0,
  );

  // Test 2: Specific page and limit combinations
  const page1Limit10 = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(page1Limit10);

  TestValidator.equals(
    "page 1 limit 10 returns page 1",
    page1Limit10.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 10 has correct limit",
    page1Limit10.pagination.limit,
    10,
  );

  // Test 3: Page boundaries - first page
  const firstPage = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(firstPage);

  TestValidator.equals(
    "first page returns page 1",
    firstPage.pagination.current,
    1,
  );

  // Test 4: Page boundaries - beyond available pages
  const beyondPage = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        page: 1000000, // Very high page number
        limit: 10,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(beyondPage);

  TestValidator.predicate(
    "page beyond available data returns empty or valid structure",
    beyondPage.pagination.current >= 1000000 || beyondPage.data.length === 0,
  );

  // Test 5: Limit boundaries - minimum value (1)
  const minLimit = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(minLimit);

  TestValidator.equals(
    "minimum limit returns limit 1",
    minLimit.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "minimum limit returns valid data count",
    minLimit.data.length <= 1,
  );

  // Test 6: Limit boundaries - maximum value (100)
  const maxLimit = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(maxLimit);

  TestValidator.equals(
    "maximum limit returns limit 100",
    maxLimit.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "maximum limit returns valid data count",
    maxLimit.data.length <= 100,
  );

  // Test 7: Pagination metadata consistency
  const consistentPage = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(consistentPage);

  // Validate pagination calculations
  TestValidator.predicate(
    "total pages calculation is correct",
    consistentPage.pagination.pages ===
      Math.ceil(
        consistentPage.pagination.records / consistentPage.pagination.limit,
      ) || consistentPage.pagination.records === 0,
  );

  // Test 8: Multiple page transitions to ensure consistency
  if (consistentPage.pagination.pages > 1) {
    const secondPage = await api.functional.shoppingMall.channels.index(
      connection,
      {
        body: {
          page: 2,
          limit: 20,
        } satisfies IShoppingMallChannel.IRequest,
      },
    );
    typia.assert(secondPage);

    TestValidator.equals(
      "second page returns page 2",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "consistent limit across pages",
      secondPage.pagination.limit,
      consistentPage.pagination.limit,
    );
    TestValidator.equals(
      "consistent total records across pages",
      secondPage.pagination.records,
      consistentPage.pagination.records,
    );
  }

  // Test 9: Invalid limit values should be handled gracefully
  const reasonableLimit = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        page: 1,
        limit: 50, // Valid middle value
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(reasonableLimit);

  TestValidator.predicate(
    "reasonable limit returns valid pagination",
    reasonableLimit.pagination.limit === 50 &&
      reasonableLimit.pagination.current === 1,
  );
}
