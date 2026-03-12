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

export async function test_api_customer_list_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test filtering customer accounts by their status (active, suspended, banned).
   *
   * This test validates that the customer list endpoint correctly filters results
   * based on account status. It tests all three status values (active, suspended,
   * banned) and verifies that only customers matching the specified status are
   * returned. Pagination functionality is also verified with status filters applied.
   */
  // Create customer connection for authenticated access
  const customerConnection: api.IConnection = { host: connection.host };
  // Test 1: Filter by status='active'
  const activeResponse = await api.functional.shoppingMall.customers.index(
    customerConnection,
    {
      body: {
        status: "active",
        limit: 20,
        page: 1,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(activeResponse);
  // Verify all returned customers have status='active'
  for (const customer of activeResponse.data) {
    TestValidator.equals(
      `customer ${customer.id} has active status`,
      customer.status,
      "active",
    );
  }
  // Verify pagination metadata
  TestValidator.predicate(
    "active customers pagination current page is 1",
    activeResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "active customers pagination limit is 20",
    activeResponse.pagination.limit === 20,
  );
  // Test 2: Filter by status='suspended'
  const suspendedResponse = await api.functional.shoppingMall.customers.index(
    customerConnection,
    {
      body: {
        status: "suspended",
        limit: 20,
        page: 1,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(suspendedResponse);
  // Verify all returned customers have status='suspended'
  for (const customer of suspendedResponse.data) {
    TestValidator.equals(
      `customer ${customer.id} has suspended status`,
      customer.status,
      "suspended",
    );
  }
  // Verify pagination metadata
  TestValidator.predicate(
    "suspended customers pagination current page is 1",
    suspendedResponse.pagination.current === 1,
  );
  // Test 3: Filter by status='banned'
  const bannedResponse = await api.functional.shoppingMall.customers.index(
    customerConnection,
    {
      body: {
        status: "banned",
        limit: 20,
        page: 1,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(bannedResponse);
  // Verify all returned customers have status='banned'
  for (const customer of bannedResponse.data) {
    TestValidator.equals(
      `customer ${customer.id} has banned status`,
      customer.status,
      "banned",
    );
  }
  // Verify pagination metadata
  TestValidator.predicate(
    "banned customers pagination current page is 1",
    bannedResponse.pagination.current === 1,
  );
  // Test 4: Verify pagination works with status filter (page 2)
  const activePage2Response = await api.functional.shoppingMall.customers.index(
    customerConnection,
    {
      body: {
        status: "active",
        limit: 10,
        page: 2,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(activePage2Response);
  // Verify pagination metadata for page 2
  TestValidator.equals(
    "active customers page 2 pagination current is 2",
    activePage2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "active customers page 2 pagination limit is 10",
    activePage2Response.pagination.limit,
    10,
  );
  // Verify all customers on page 2 still have active status
  for (const customer of activePage2Response.data) {
    TestValidator.equals(
      `customer ${customer.id} on page 2 has active status`,
      customer.status,
      "active",
    );
  }
  // Test 5: Verify status filter excludes other statuses
  // Compare total counts to ensure filters are working
  const allCustomersResponse =
    await api.functional.shoppingMall.customers.index(customerConnection, {
      body: {
        limit: 100,
        page: 1,
      } satisfies IShoppingMallCustomer.IRequest,
    });
  typia.assert(allCustomersResponse);
  // The sum of filtered counts should be <= total count
  const totalFiltered =
    activeResponse.pagination.records +
    suspendedResponse.pagination.records +
    bannedResponse.pagination.records;
  TestValidator.predicate(
    "filtered customers count is less than or equal to total",
    totalFiltered <= allCustomersResponse.pagination.records,
  );
}
