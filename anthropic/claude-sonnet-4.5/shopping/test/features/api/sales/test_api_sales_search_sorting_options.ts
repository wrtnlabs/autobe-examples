import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSale";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test all sorting options for product sales search.
 *
 * This test validates that the sales search API correctly orders results
 * according to all supported sorting options. The API provides five sorting
 * modes: created_at (default, newest first), price_asc (lowest to highest),
 * price_desc (highest to lowest), title_asc (alphabetical A-Z), and title_desc
 * (reverse alphabetical Z-A).
 *
 * Test workflow:
 *
 * 1. Search with sort_by="created_at" to verify newest products appear first
 * 2. Search with sort_by="price_asc" to verify ascending price order
 * 3. Search with sort_by="price_desc" to verify descending price order
 * 4. Search with sort_by="title_asc" to verify alphabetical A-Z order
 * 5. Search with sort_by="title_desc" to verify reverse alphabetical order
 * 6. Search without sort_by parameter to verify default created_at sorting
 * 7. Test sorting with pagination to ensure correct ordering across pages
 */
export async function test_api_sales_search_sorting_options(
  connection: api.IConnection,
) {
  // Test sorting by created_at (newest first)
  const createdAtResult = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        sort_by: "created_at",
        limit: 100,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(createdAtResult);

  // Verify created_at descending order (newest first)
  for (let i = 0; i < createdAtResult.data.length - 1; i++) {
    const current = new Date(createdAtResult.data[i].created_at).getTime();
    const next = new Date(createdAtResult.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      "created_at sorting should order newest first",
      current >= next,
    );
  }

  // Test sorting by price_asc (lowest to highest)
  const priceAscResult = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        sort_by: "price_asc",
        limit: 100,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(priceAscResult);

  // Verify price ascending order
  for (let i = 0; i < priceAscResult.data.length - 1; i++) {
    TestValidator.predicate(
      "price_asc sorting should order from lowest to highest price",
      priceAscResult.data[i].price <= priceAscResult.data[i + 1].price,
    );
  }

  // Test sorting by price_desc (highest to lowest)
  const priceDescResult = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        sort_by: "price_desc",
        limit: 100,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(priceDescResult);

  // Verify price descending order
  for (let i = 0; i < priceDescResult.data.length - 1; i++) {
    TestValidator.predicate(
      "price_desc sorting should order from highest to lowest price",
      priceDescResult.data[i].price >= priceDescResult.data[i + 1].price,
    );
  }

  // Test sorting by title_asc (alphabetical A-Z)
  const titleAscResult = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        sort_by: "title_asc",
        limit: 100,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(titleAscResult);

  // Verify title ascending order (A-Z)
  for (let i = 0; i < titleAscResult.data.length - 1; i++) {
    TestValidator.predicate(
      "title_asc sorting should order alphabetically A-Z",
      titleAscResult.data[i].title.toLowerCase() <=
        titleAscResult.data[i + 1].title.toLowerCase(),
    );
  }

  // Test sorting by title_desc (reverse alphabetical Z-A)
  const titleDescResult = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        sort_by: "title_desc",
        limit: 100,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(titleDescResult);

  // Verify title descending order (Z-A)
  for (let i = 0; i < titleDescResult.data.length - 1; i++) {
    TestValidator.predicate(
      "title_desc sorting should order reverse alphabetically Z-A",
      titleDescResult.data[i].title.toLowerCase() >=
        titleDescResult.data[i + 1].title.toLowerCase(),
    );
  }

  // Test default sorting (should default to created_at when sort_by not specified)
  const defaultSortResult = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        limit: 100,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(defaultSortResult);

  // Verify default is created_at descending
  for (let i = 0; i < defaultSortResult.data.length - 1; i++) {
    const current = new Date(defaultSortResult.data[i].created_at).getTime();
    const next = new Date(defaultSortResult.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      "default sorting should use created_at (newest first)",
      current >= next,
    );
  }

  // Test sorting with pagination
  const paginatedPage1 = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        sort_by: "price_asc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(paginatedPage1);

  const paginatedPage2 = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        sort_by: "price_asc",
        page: 2,
        limit: 10,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(paginatedPage2);

  // Verify sorting consistency across pages
  if (paginatedPage1.data.length > 0 && paginatedPage2.data.length > 0) {
    const lastPriceOfPage1 =
      paginatedPage1.data[paginatedPage1.data.length - 1].price;
    const firstPriceOfPage2 = paginatedPage2.data[0].price;
    TestValidator.predicate(
      "sorting should respect pagination boundaries",
      lastPriceOfPage1 <= firstPriceOfPage2,
    );
  }
}
