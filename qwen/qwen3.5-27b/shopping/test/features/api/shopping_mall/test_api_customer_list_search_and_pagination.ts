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
 * Test text search functionality and pagination controls for customer list retrieval.
 *
 * This test validates:
 * 1. displayName partial match search
 * 2. email partial match search
 * 3. date range filtering
 * 4. pagination parameters and metadata accuracy
 * 5. sorting options (asc/desc by different fields)
 * 6. combined filter application
 */
export async function test_api_customer_list_search_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: displayName partial match search
  const displayNameSearch = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {
        displayName: "john",
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(displayNameSearch);
  TestValidator.predicate(
    "displayName search returns results",
    displayNameSearch.data.length > 0,
  );
  // Verify all returned customers have display_name containing 'john'
  await ArrayUtil.asyncForEach(displayNameSearch.data, async (customer) => {
    TestValidator.predicate(
      `customer ${customer.id} display_name contains 'john'`,
      customer.display_name.toLowerCase().includes("john"),
    );
  });
  // Test 2: email partial match search
  const emailSearch = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {
        email: "test@example",
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(emailSearch);
  // Verify all returned customers have email containing 'test@example'
  await ArrayUtil.asyncForEach(emailSearch.data, async (customer) => {
    TestValidator.predicate(
      `customer ${customer.id} email contains 'test@example'`,
      customer.email.toLowerCase().includes("test@example"),
    );
  });
  // Test 3: date range filtering
  const dateFrom = "2024-01-01T00:00:00Z";
  const dateTo = "2024-12-31T23:59:59Z";
  const dateRangeSearch = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {
        createdAtFrom: dateFrom,
        createdAtTo: dateTo,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(dateRangeSearch);
  const fromDate = new Date(dateFrom);
  const toDate = new Date(dateTo);
  // Verify all returned customers were created within the date range
  await ArrayUtil.asyncForEach(dateRangeSearch.data, async (customer) => {
    const createdAt = new Date(customer.created_at);
    TestValidator.predicate(
      `customer ${customer.id} created_at is within range`,
      createdAt >= fromDate && createdAt <= toDate,
    );
  });
  // Test 4: pagination parameters
  const page1 = await api.functional.shoppingMall.customers.index(connection, {
    body: {
      page: 1,
      limit: 10,
    } satisfies IShoppingMallCustomer.IRequest,
  });
  typia.assert(page1);
  TestValidator.equals("page 1 returns correct limit", page1.data.length, 10);
  TestValidator.equals(
    "pagination current page is 1",
    page1.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 10", page1.pagination.limit, 10);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination records >= data length",
    page1.pagination.records >= page1.data.length,
  );
  TestValidator.predicate(
    "pagination pages calculation is correct",
    page1.pagination.pages ===
      Math.ceil(page1.pagination.records / page1.pagination.limit),
  );
  const page2 = await api.functional.shoppingMall.customers.index(connection, {
    body: {
      page: 2,
      limit: 10,
    } satisfies IShoppingMallCustomer.IRequest,
  });
  typia.assert(page2);
  TestValidator.equals("page 2 returns correct limit", page2.data.length, 10);
  TestValidator.equals(
    "pagination current page is 2",
    page2.pagination.current,
    2,
  );
  // Verify page 2 has different customers than page 1
  const page1Ids = new Set(page1.data.map((c) => c.id));
  TestValidator.predicate(
    "page 2 contains different customers than page 1",
    !page2.data.some((c) => page1Ids.has(c.id)),
  );
  // Test 5: sorting options
  // Sort by display_name ascending
  const sortByDisplayNameAsc =
    await api.functional.shoppingMall.customers.index(connection, {
      body: {
        sortBy: "display_name",
        sortOrder: "asc",
        limit: 20,
      } satisfies IShoppingMallCustomer.IRequest,
    });
  typia.assert(sortByDisplayNameAsc);
  // Verify ascending alphabetical order
  for (let i = 1; i < sortByDisplayNameAsc.data.length; i++) {
    TestValidator.predicate(
      `display_name at index ${i} is >= previous`,
      sortByDisplayNameAsc.data[i].display_name.localeCompare(
        sortByDisplayNameAsc.data[i - 1].display_name,
      ) >= 0,
    );
  }
  // Sort by email descending
  const sortByEmailDesc = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {
        sortBy: "email",
        sortOrder: "desc",
        limit: 20,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(sortByEmailDesc);
  // Verify descending alphabetical order
  for (let i = 1; i < sortByEmailDesc.data.length; i++) {
    TestValidator.predicate(
      `email at index ${i} is <= previous`,
      sortByEmailDesc.data[i].email.localeCompare(
        sortByEmailDesc.data[i - 1].email,
      ) <= 0,
    );
  }
  // Sort by created_at ascending
  const sortByCreatedAtAsc = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {
        sortBy: "created_at",
        sortOrder: "asc",
        limit: 20,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(sortByCreatedAtAsc);
  // Verify oldest first
  for (let i = 1; i < sortByCreatedAtAsc.data.length; i++) {
    TestValidator.predicate(
      `created_at at index ${i} is >= previous`,
      new Date(sortByCreatedAtAsc.data[i].created_at).getTime() >=
        new Date(sortByCreatedAtAsc.data[i - 1].created_at).getTime(),
    );
  }
  // Test 6: combined filters
  const combinedSearch = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {
        status: "active",
        displayName: "test",
        page: 1,
        limit: 5,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(combinedSearch);
  TestValidator.equals(
    "combined filter returns correct limit or less",
    combinedSearch.data.length,
    Math.min(5, combinedSearch.pagination.records),
  );
  // Verify all results match combined criteria
  await ArrayUtil.asyncForEach(combinedSearch.data, async (customer) => {
    TestValidator.equals(
      `customer ${customer.id} status is 'active'`,
      customer.status,
      "active",
    );
    TestValidator.predicate(
      `customer ${customer.id} display_name contains 'test'`,
      customer.display_name.toLowerCase().includes("test"),
    );
  });
}