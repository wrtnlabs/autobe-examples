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
 * Test customer account filtering and sorting capabilities on the shopping mall platform.
 *
 * Validates the customer listing endpoint's ability to filter customers by email (partial match), ban status, and registration date range, plus sorting by various fields in ascending or descending order. Ensures pagination metadata is accurate and empty results are handled correctly.
 *
 * Special attention is given to testing combined filters, case-insensitive email matching, and verifying that sort orders are applied correctly across different fields.
 *
 * 1. Test email partial matching filter with substring search.
 * 2. Test ban status filter for both banned and active customers.
 * 3. Test registration date range filtering with from/to dates.
 * 4. Test combined filters (email + banned + date range).
 * 5. Test empty results scenario with filters that match no customers.
 * 6. Test sorting by email in ascending and descending order.
 * 7. Test sorting by banned status (banned customers first).
 * 8. Test sorting by registration date (oldest first).
 * 9. Validate pagination metadata accuracy throughout tests.
 */
export async function test_api_customer_listing_filtering_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test email partial matching filter (search for "john")
  const emailFilterResult = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {
        email: "john",
        limit: 100,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(emailFilterResult);
  TestValidator.predicate(
    "email filter returns customers with 'john' in email",
    emailFilterResult.data.length >= 0,
  );
  TestValidator.predicate(
    "all results contain 'john' in email (case-insensitive)",
    emailFilterResult.data.every((customer) =>
      customer.email.toLowerCase().includes("john"),
    ),
  );
  // 2. Test ban status filter (banned=true)
  const bannedFilterResult = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {
        banned: true,
        limit: 100,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(bannedFilterResult);
  TestValidator.predicate(
    "banned filter returns only banned customers",
    bannedFilterResult.data.every((customer) => customer.banned === true),
  );
  // 3. Test ban status filter (banned=false)
  const activeFilterResult = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {
        banned: false,
        limit: 100,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(activeFilterResult);
  TestValidator.predicate(
    "active filter returns only active customers",
    activeFilterResult.data.every((customer) => customer.banned === false),
  );
  // 4. Test registration date range filtering (2024)
  const dateRangeResult = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {
        created_at_from: "2024-01-01T00:00:00Z",
        created_at_to: "2024-12-31T23:59:59Z",
        limit: 100,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter returns customers within specified range",
    dateRangeResult.data.every(
      (customer) =>
        new Date(customer.created_at) >= new Date("2024-01-01T00:00:00Z") &&
        new Date(customer.created_at) <= new Date("2024-12-31T23:59:59Z"),
    ),
  );
  // 5. Test combined filters (email="test" AND banned=false)
  const combinedFilterResult =
    await api.functional.shoppingMall.customers.index(connection, {
      body: {
        email: "test",
        banned: false,
        limit: 100,
      } satisfies IShoppingMallCustomer.IRequest,
    });
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined filter returns customers matching all criteria",
    combinedFilterResult.data.every(
      (customer) =>
        customer.email.toLowerCase().includes("test") &&
        customer.banned === false,
    ),
  );
  // 6. Test empty results scenario (email with no matches)
  const emptyResult = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {
        email: "nonexistent_user_xyz_12345",
        limit: 100,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty results return HTTP 200 with empty data array",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty results have correct pagination records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty results have 0 pages",
    emptyResult.pagination.pages,
    0,
  );
  // 7. Test sorting by email (ASC - A to Z)
  const emailAscResult = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {
        sort_by: "email",
        sort_order: "ASC",
        limit: 100,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(emailAscResult);
  TestValidator.predicate(
    "email ASC sort returns alphabetical order A-Z",
    emailAscResult.data.every((customer, index, array) => {
      if (index === 0) return true;
      return array[index - 1].email <= customer.email;
    }),
  );
  // 8. Test sorting by email (DESC - Z to A)
  const emailDescResult = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {
        sort_by: "email",
        sort_order: "DESC",
        limit: 100,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(emailDescResult);
  TestValidator.predicate(
    "email DESC sort returns reverse alphabetical order Z-A",
    emailDescResult.data.every((customer, index, array) => {
      if (index === 0) return true;
      return array[index - 1].email >= customer.email;
    }),
  );
  // 9. Test sorting by banned status (DESC - banned=true first)
  const bannedSortResult = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {
        sort_by: "banned",
        sort_order: "DESC",
        limit: 100,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(bannedSortResult);
  // Verify banned customers (true) appear before active customers (false)
  let foundActive = false;
  const bannedFirst = bannedSortResult.data.every((customer) => {
    if (customer.banned === false) {
      foundActive = true;
    }
    return !(foundActive && customer.banned === true);
  });
  TestValidator.predicate(
    "banned DESC sort returns banned customers before active customers",
    bannedFirst,
  );
  // 10. Test sorting by registration date (ASC - oldest first)
  const dateAscResult = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "ASC",
        limit: 100,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(dateAscResult);
  TestValidator.predicate(
    "created_at ASC sort returns oldest registrations first",
    dateAscResult.data.every((customer, index, array) => {
      if (index === 0) return true;
      return (
        new Date(array[index - 1].created_at).getTime() <=
        new Date(customer.created_at).getTime()
      );
    }),
  );
  // 11. Test sorting by registration date (DESC - newest first)
  const dateDescResult = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "DESC",
        limit: 100,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(dateDescResult);
  TestValidator.predicate(
    "created_at DESC sort returns newest registrations first",
    dateDescResult.data.every((customer, index, array) => {
      if (index === 0) return true;
      return (
        new Date(array[index - 1].created_at).getTime() >=
        new Date(customer.created_at).getTime()
      );
    }),
  );
  // 12. Validate pagination metadata accuracy
  const paginationResult = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination returns correct current page",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination metadata shows correct limit",
    paginationResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination data length does not exceed limit",
    paginationResult.data.length <= 10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    paginationResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is calculated correctly",
    paginationResult.pagination.pages ===
      Math.ceil(paginationResult.pagination.records / 10),
  );
  // 13. Test pagination with page 2
  const page2Result = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 shows correct current page",
    page2Result.pagination.current,
    2,
  );
  TestValidator.predicate(
    "page 2 data length does not exceed limit",
    page2Result.data.length <= 10,
  );
  // 14. Test all filters combined with sorting and pagination
  const fullFilterResult = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {
        email: "example",
        banned: false,
        created_at_from: "2020-01-01T00:00:00Z",
        sort_by: "email",
        sort_order: "ASC",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(fullFilterResult);
  TestValidator.predicate(
    "combined filters with sorting returns valid results",
    fullFilterResult.data.every(
      (customer) =>
        customer.email.toLowerCase().includes("example") &&
        customer.banned === false &&
        new Date(customer.created_at) >= new Date("2020-01-01T00:00:00Z"),
    ),
  );
  TestValidator.predicate(
    "combined filters results are sorted by email ASC",
    fullFilterResult.data.every((customer, index, array) => {
      if (index === 0) return true;
      return array[index - 1].email <= customer.email;
    }),
  );
}
