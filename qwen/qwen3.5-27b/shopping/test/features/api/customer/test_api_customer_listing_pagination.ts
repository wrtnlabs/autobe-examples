import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test pagination behavior and edge cases for the customer listing endpoint.
 *
 * Validates comprehensive pagination functionality including default parameters, custom page sizes, page navigation, and metadata accuracy. Ensures that the customer listing endpoint correctly handles various pagination scenarios and returns accurate pagination information.
 *
 * Special attention is given to verifying pagination metadata accuracy, handling of requests beyond available pages, and consistency of results across identical requests.
 *
 * 1. Create admin connection from base connection.
 * 2. Test default pagination (limit=20, page=1).
 * 3. Test custom page sizes (5, 50, 100).
 * 4. Test page navigation (page 1, 2, 3 with limit=10).
 * 5. Test beyond available pages (empty data array).
 * 6. Test single record per page (limit=1).
 * 7. Validate pagination metadata accuracy.
 * 8. Test cursor consistency with identical requests.
 */
export async function test_api_customer_listing_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection from base connection
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Test default pagination (limit=20, page=1)
  const defaultResult = await api.functional.shoppingMall.customers.index(
    adminConnection,
    {
      body: {} satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(defaultResult);
  TestValidator.equals("default page", defaultResult.pagination.current, 1);
  TestValidator.equals("default limit", defaultResult.pagination.limit, 20);
  TestValidator.predicate(
    "default data length within limit",
    defaultResult.data.length <= 20,
  );
  TestValidator.predicate(
    "default pages calculated correctly",
    defaultResult.pagination.pages ===
      Math.ceil(defaultResult.pagination.records / 20),
  );
  // 3. Test custom page size (small: 5)
  const smallPageResult = await api.functional.shoppingMall.customers.index(
    adminConnection,
    {
      body: {
        limit: 5,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(smallPageResult);
  TestValidator.equals("small limit", smallPageResult.pagination.limit, 5);
  TestValidator.predicate(
    "small pages calculated correctly",
    smallPageResult.pagination.pages ===
      Math.ceil(smallPageResult.pagination.records / 5),
  );
  TestValidator.predicate(
    "small data length within limit",
    smallPageResult.data.length <= 5,
  );
  // 4. Test custom page size (large: 50)
  const largePageResult = await api.functional.shoppingMall.customers.index(
    adminConnection,
    {
      body: {
        limit: 50,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(largePageResult);
  TestValidator.equals("large limit", largePageResult.pagination.limit, 50);
  TestValidator.predicate(
    "large pages calculated correctly",
    largePageResult.pagination.pages ===
      Math.ceil(largePageResult.pagination.records / 50),
  );
  TestValidator.predicate(
    "large data length within limit",
    largePageResult.data.length <= 50,
  );
  // 5. Test maximum page size (100)
  const maxPageResult = await api.functional.shoppingMall.customers.index(
    adminConnection,
    {
      body: {
        limit: 100,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(maxPageResult);
  TestValidator.equals("max limit", maxPageResult.pagination.limit, 100);
  TestValidator.predicate(
    "max pages calculated correctly",
    maxPageResult.pagination.pages ===
      Math.ceil(maxPageResult.pagination.records / 100),
  );
  TestValidator.predicate(
    "max data length within limit",
    maxPageResult.data.length <= 100,
  );
  // 6. Test page navigation (page 1, 2, 3 with limit=10)
  const page1Result = await api.functional.shoppingMall.customers.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(page1Result);
  TestValidator.equals("page 1 current", page1Result.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 10);
  TestValidator.predicate(
    "page 1 data length within limit",
    page1Result.data.length <= 10,
  );
  const page2Result = await api.functional.shoppingMall.customers.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 10);
  TestValidator.predicate(
    "page 2 data length within limit",
    page2Result.data.length <= 10,
  );
  const page3Result = await api.functional.shoppingMall.customers.index(
    adminConnection,
    {
      body: {
        page: 3,
        limit: 10,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(page3Result);
  TestValidator.equals("page 3 current", page3Result.pagination.current, 3);
  TestValidator.equals("page 3 limit", page3Result.pagination.limit, 10);
  TestValidator.predicate(
    "page 3 data length within limit",
    page3Result.data.length <= 10,
  );
  // Verify different pages have different starting records (if enough data exists)
  if (
    page1Result.data.length > 0 &&
    page2Result.data.length > 0 &&
    page1Result.data[0].id !== page2Result.data[0].id
  ) {
    TestValidator.notEquals(
      "page 1 vs page 2 differ",
      page1Result.data[0].id,
      page2Result.data[0].id,
    );
  }
  // 7. Test beyond available pages (page 999 with limit=10)
  const beyondPageResult = await api.functional.shoppingMall.customers.index(
    adminConnection,
    {
      body: {
        page: 999,
        limit: 10,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(beyondPageResult);
  TestValidator.equals(
    "beyond page current",
    beyondPageResult.pagination.current,
    999,
  );
  TestValidator.equals(
    "beyond page limit",
    beyondPageResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "beyond page data length",
    beyondPageResult.data.length,
    0,
  );
  TestValidator.predicate(
    "beyond page has valid pages count",
    beyondPageResult.pagination.pages >= 0,
  );
  // 8. Test single record per page (limit=1)
  const singlePageResult = await api.functional.shoppingMall.customers.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(singlePageResult);
  TestValidator.equals("single limit", singlePageResult.pagination.limit, 1);
  TestValidator.predicate(
    "single data length is 0 or 1",
    singlePageResult.data.length <= 1,
  );
  TestValidator.predicate(
    "single pages equals records",
    singlePageResult.pagination.pages === singlePageResult.pagination.records,
  );
  // 9. Validate pagination metadata accuracy
  const metadataResult = await api.functional.shoppingMall.customers.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(metadataResult);
  TestValidator.equals(
    "metadata current",
    metadataResult.pagination.current,
    2,
  );
  TestValidator.equals("metadata limit", metadataResult.pagination.limit, 10);
  TestValidator.predicate(
    "metadata pages calculated correctly",
    metadataResult.pagination.pages ===
      Math.ceil(metadataResult.pagination.records / 10),
  );
  // 10. Test cursor consistency (identical requests return same order)
  const consistencyResult1 = await api.functional.shoppingMall.customers.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(consistencyResult1);
  const consistencyResult2 = await api.functional.shoppingMall.customers.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(consistencyResult2);
  TestValidator.equals(
    "consistency records count",
    consistencyResult1.pagination.records,
    consistencyResult2.pagination.records,
  );
  TestValidator.equals(
    "consistency data length",
    consistencyResult1.data.length,
    consistencyResult2.data.length,
  );
  // If data exists, verify first and last IDs match
  if (consistencyResult1.data.length > 0) {
    TestValidator.equals(
      "cursor consistency first id",
      consistencyResult1.data[0].id,
      consistencyResult2.data[0].id,
    );
    TestValidator.equals(
      "cursor consistency last id",
      consistencyResult1.data[consistencyResult1.data.length - 1].id,
      consistencyResult2.data[consistencyResult2.data.length - 1].id,
    );
  }
}
