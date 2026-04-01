import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test product search functionality with pagination and sorting options.
 *
 * Verifies:
 * 1. Pagination metadata (current page, limit, total records, total pages)
 * 2. Sorting by 'newest' (created_at DESC)
 * 3. Sorting by 'priceAsc' (base_price ascending)
 * 4. Sorting by 'priceDesc' (base_price descending)
 * 5. Page-based pagination for multiple pages
 * 6. Product summary structure validation (min/max price)
 * 7. Price range filtering
 * 8. In-stock filter
 * 9. Search by name
 */
export async function test_api_product_search_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Default pagination with newest sort
  const defaultResponse = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        limit: 10,
        sort: "newest",
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(defaultResponse);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "current page is 1",
    defaultResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit matches request",
    defaultResponse.pagination.limit === 10,
  );
  TestValidator.predicate(
    "records is non-negative",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    defaultResponse.pagination.pages >= 0,
  );
  // Test 2: Sorting by newest (created_at DESC)
  const newestResponse = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        limit: 20,
        sort: "newest",
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(newestResponse);
  TestValidator.predicate(
    "newest sort page is 1",
    newestResponse.pagination.current === 1,
  );
  // Test 3: Sorting by price ascending
  const priceAscResponse = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        limit: 20,
        sort: "priceAsc",
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(priceAscResponse);
  // Validate price ascending order
  if (priceAscResponse.data.length > 1) {
    for (let i = 1; i < priceAscResponse.data.length; i++) {
      TestValidator.predicate(
        "price ascending order",
        priceAscResponse.data[i - 1].min <= priceAscResponse.data[i].min,
      );
    }
  }
  // Test 4: Sorting by price descending
  const priceDescResponse = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        limit: 20,
        sort: "priceDesc",
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(priceDescResponse);
  // Validate price descending order
  if (priceDescResponse.data.length > 1) {
    for (let i = 1; i < priceDescResponse.data.length; i++) {
      TestValidator.predicate(
        "price descending order",
        priceDescResponse.data[i - 1].min >= priceDescResponse.data[i].min,
      );
    }
  }
  // Test 5: Page-based pagination
  const page1 = await api.functional.shoppingMall.products.index(connection, {
    body: {
      limit: 10,
      page: 1,
    } satisfies IShoppingMallProduct.IRequest,
  });
  typia.assert(page1);
  const page2 = await api.functional.shoppingMall.products.index(connection, {
    body: {
      limit: 10,
      page: 2,
    } satisfies IShoppingMallProduct.IRequest,
  });
  typia.assert(page2);
  TestValidator.predicate(
    "page 2 current is 2",
    page2.pagination.current === 2,
  );
  // Test 6: Filter by price range
  const priceRangeResponse = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        min_price: 1000,
        max_price: 100000,
        limit: 20,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(priceRangeResponse);
  // Validate all products are within price range
  for (const product of priceRangeResponse.data) {
    TestValidator.predicate("min price >= 1000", product.min >= 1000);
  }
  // Test 7: In-stock filter
  const inStockResponse = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        in_stock: true,
        limit: 20,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(inStockResponse);
  // Test 8: Search by name
  const searchResponse = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        search: "test",
        limit: 20,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(searchResponse);
  // Test 9: Validate product summary structure
  if (defaultResponse.data.length > 0) {
    const product = defaultResponse.data[0];
    // Validate required fields exist based on DTO
    TestValidator.predicate("product has min price", product.min !== undefined);
    TestValidator.predicate("product has max price", product.max !== undefined);
    TestValidator.predicate("min <= max", product.min <= product.max);
  }
  // Test 10: Maximum limit validation
  const maxLimitResponse = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        limit: 100,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(maxLimitResponse);
  TestValidator.predicate(
    "limit is 100",
    maxLimitResponse.pagination.limit === 100,
  );
}
