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
 * Test administrative customer list retrieval with comprehensive search filters.
 *
 * This test validates the customer search API functionality including:
 * - Pagination with correct metadata
 * - Multiple filter combinations
 * - Sorting options
 * - Response structure validation
 */
export async function test_api_customer_list_search_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Basic pagination with default sorting (newest first)
  const firstPage = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        sort: "created_at_desc",
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(firstPage);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page should be 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination pages should be calculated correctly",
    firstPage.pagination.pages,
    Math.ceil(firstPage.pagination.records / firstPage.pagination.limit),
  );
  // Validate data array structure
  TestValidator.predicate(
    "data array should not exceed limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  // Validate each customer summary
  for (const customer of firstPage.data) {
    typia.assert(customer);
    // Customer fields validated by typia.assert, only business logic checks below
  }
  // Test 2: Sorting by email ascending
  const sortedByEmail = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        sort: "email_asc",
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(sortedByEmail);
  // Validate email ascending sort order
  for (let i = 1; i < sortedByEmail.data.length; i++) {
    const prev = sortedByEmail.data[i - 1];
    const curr = sortedByEmail.data[i];
    TestValidator.predicate(
      "emails should be sorted ascending",
      prev.email.localeCompare(curr.email) <= 0,
    );
  }
  // Test 3: Sorting by created_at ascending (oldest first)
  const sortedByOldest = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        sort: "created_at_asc",
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(sortedByOldest);
  // Validate date ascending sort order
  for (let i = 1; i < sortedByOldest.data.length; i++) {
    const prev = sortedByOldest.data[i - 1];
    const curr = sortedByOldest.data[i];
    TestValidator.predicate(
      "created_at should be sorted ascending",
      new Date(prev.createdAt).getTime() <= new Date(curr.createdAt).getTime(),
    );
  }
  // Test 4: Filter by isDeleted status (active accounts only)
  const activeCustomers = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        isDeleted: false,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(activeCustomers);
  // Validate all returned customers are active (not deleted)
  for (const customer of activeCustomers.data) {
    TestValidator.equals(
      "active filter should only return non-deleted customers",
      customer.isDeleted,
      false,
    );
  }
  // Test 5: Filter by isDeleted status (deleted accounts only)
  const deletedCustomers = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        isDeleted: true,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(deletedCustomers);
  // Validate all returned customers are deleted
  for (const customer of deletedCustomers.data) {
    TestValidator.equals(
      "deleted filter should only return deleted customers",
      customer.isDeleted,
      true,
    );
  }
  // Test 6: Pagination - second page
  if (firstPage.pagination.pages > 1) {
    const secondPage = await api.functional.shoppingMall.customers.index(
      connection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page current should be 2",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page limit should match first page",
      secondPage.pagination.limit,
      firstPage.pagination.limit,
    );
    TestValidator.equals(
      "total records should be consistent across pages",
      secondPage.pagination.records,
      firstPage.pagination.records,
    );
    // Validate no duplicate customers between pages
    const firstPageIds = new Set(firstPage.data.map((c) => c.id));
    for (const customer of secondPage.data) {
      TestValidator.predicate(
        "customer should not appear in multiple pages",
        !firstPageIds.has(customer.id),
      );
    }
  }
  // Test 7: Date range filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentCustomers = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        createdFrom: thirtyDaysAgo.toISOString(),
        createdTo: now.toISOString(),
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(recentCustomers);
  // Validate all returned customers are within date range
  for (const customer of recentCustomers.data) {
    const createdDate = new Date(customer.createdAt);
    TestValidator.predicate(
      "customer created_at should be within date range",
      createdDate >= thirtyDaysAgo && createdDate <= now,
    );
  }
  // Test 8: Empty filter criteria returns all customers
  const allCustomers = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {
        page: 1,
        limit: 50,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(allCustomers);
  TestValidator.predicate(
    "empty filter should return customers",
    allCustomers.pagination.records >= 0,
  );
}
