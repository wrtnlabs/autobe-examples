import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCart";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";

/**
 * Test cart search functionality when no carts match the specified criteria.
 *
 * This test validates that the system returns empty data arrays with proper
 * pagination metadata when search filters yield no results. It ensures that
 * administrators receive appropriate empty responses rather than errors when
 * searching for non-existent cart statuses, date ranges without carts, or
 * coupon codes not applied to any carts.
 */
export async function test_api_admin_cart_search_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate an administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({ read: true, write: false }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Test search with non-existent cart status
  const emptyStatusSearch = await api.functional.shoppingMall.admin.carts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        status: "nonexistent_status",
      } satisfies IShoppingMallCart.IRequest,
    },
  );
  typia.assert(emptyStatusSearch);

  TestValidator.equals(
    "empty status search returns zero records",
    emptyStatusSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty status search returns zero pages",
    emptyStatusSearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty status search returns empty data array",
    emptyStatusSearch.data.length,
    0,
  );
  TestValidator.equals(
    "empty status search returns correct page number",
    emptyStatusSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty status search returns correct limit",
    emptyStatusSearch.pagination.limit,
    10,
  );

  // Step 3: Test search with future date range (no carts should exist)
  const futureDate = new Date(Date.now() + 86400000 * 30).toISOString(); // 30 days in future
  const emptyDateSearch = await api.functional.shoppingMall.admin.carts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        created_at_start: futureDate,
        created_at_end: futureDate,
      } satisfies IShoppingMallCart.IRequest,
    },
  );
  typia.assert(emptyDateSearch);

  TestValidator.equals(
    "future date search returns zero records",
    emptyDateSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "future date search returns zero pages",
    emptyDateSearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "future date search returns empty data array",
    emptyDateSearch.data.length,
    0,
  );

  // Step 4: Test search with non-existent coupon code
  const emptyCouponSearch = await api.functional.shoppingMall.admin.carts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        applied_coupon_code: "NONEXISTENT_COUPON_123",
      } satisfies IShoppingMallCart.IRequest,
    },
  );
  typia.assert(emptyCouponSearch);

  TestValidator.equals(
    "non-existent coupon search returns zero records",
    emptyCouponSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent coupon search returns zero pages",
    emptyCouponSearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "non-existent coupon search returns empty data array",
    emptyCouponSearch.data.length,
    0,
  );

  // Step 5: Test search with non-existent customer session ID
  const emptySessionSearch =
    await api.functional.shoppingMall.admin.carts.index(connection, {
      body: {
        page: 1,
        limit: 15,
        customer_session_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallCart.IRequest,
    });
  typia.assert(emptySessionSearch);

  TestValidator.equals(
    "non-existent session search returns zero records",
    emptySessionSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent session search returns zero pages",
    emptySessionSearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "non-existent session search returns empty data array",
    emptySessionSearch.data.length,
    0,
  );

  // Step 6: Test search with combination of non-matching filters
  const combinedEmptySearch =
    await api.functional.shoppingMall.admin.carts.index(connection, {
      body: {
        page: 2,
        limit: 25,
        status: "invalid_status",
        shipping_method: "nonexistent_shipping",
        applied_coupon_code: "ANOTHER_NONEXISTENT_COUPON",
      } satisfies IShoppingMallCart.IRequest,
    });
  typia.assert(combinedEmptySearch);

  TestValidator.equals(
    "combined empty search returns zero records",
    combinedEmptySearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "combined empty search returns zero pages",
    combinedEmptySearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "combined empty search returns empty data array",
    combinedEmptySearch.data.length,
    0,
  );
  TestValidator.equals(
    "combined empty search returns correct page number",
    combinedEmptySearch.pagination.current,
    2,
  );
  TestValidator.equals(
    "combined empty search returns correct limit",
    combinedEmptySearch.pagination.limit,
    25,
  );
}
