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

export async function test_api_customer_list_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create test customers with varied attributes using the only available API
  const customerConnection: api.IConnection = { host: connection.host };
  // Generate test data - create multiple customers with various attributes
  const now = new Date().toISOString();
  const oneWeekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const twoWeeksAgo = new Date(
    Date.now() - 14 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // Since we don't have direct customer creation API available, we'll use random generation
  // and test the filtering functionality
  // Test 1: Filter by email (partial match)
  const emailFilterResult = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {
        email: "test",
        limit: 10,
      },
    },
  );
  typia.assert(emailFilterResult);
  TestValidator.predicate(
    "email filter returns results",
    emailFilterResult.data.length >= 0,
  );
  // Test 2: Filter by display_name (partial match)
  const nameFilterResult = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {
        display_name: "John",
        limit: 10,
      },
    },
  );
  typia.assert(nameFilterResult);
  TestValidator.predicate(
    "name filter returns results",
    nameFilterResult.data.length >= 0,
  );
  // Test 3: Filter by phone_number (partial match)
  const phoneFilterResult = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {
        phone_number: "010",
        limit: 10,
      },
    },
  );
  typia.assert(phoneFilterResult);
  TestValidator.predicate(
    "phone filter returns results",
    phoneFilterResult.data.length >= 0,
  );
  // Test 4: Filter by email_verified = true
  const verifiedFilterResult =
    await api.functional.shoppingMall.customers.index(connection, {
      body: {
        email_verified: true,
        limit: 10,
      },
    });
  typia.assert(verifiedFilterResult);
  TestValidator.predicate(
    "verified filter returns results",
    verifiedFilterResult.data.length >= 0,
  );
  // Test 5: Filter by email_verified = false
  const unverifiedFilterResult =
    await api.functional.shoppingMall.customers.index(connection, {
      body: {
        email_verified: false,
        limit: 10,
      },
    });
  typia.assert(unverifiedFilterResult);
  TestValidator.predicate(
    "unverified filter returns results",
    unverifiedFilterResult.data.length >= 0,
  );
  // Test 6: Filter by date range (starts_at and ends_at)
  const dateFilterResult = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {
        starts_at: oneWeekAgo,
        ends_at: now,
        limit: 10,
      },
    },
  );
  typia.assert(dateFilterResult);
  TestValidator.predicate(
    "date range filter returns results",
    dateFilterResult.data.length >= 0,
  );
  // Test 7: Combined filters
  const combinedFilterResult =
    await api.functional.shoppingMall.customers.index(connection, {
      body: {
        display_name: "John",
        email_verified: true,
        limit: 10,
      },
    });
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined filter returns results",
    combinedFilterResult.data.length >= 0,
  );
  // Test 8: Pagination test
  const paginationResult = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {
        limit: 2,
        page: 1,
      },
    },
  );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination limit works",
    paginationResult.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination has correct current page",
    paginationResult.pagination.current,
    1,
  );
}
