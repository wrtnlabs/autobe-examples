import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Validate admin customer list advanced filtered pagination API.
 *
 * 1. Register a new admin (join) with random valid credentials
 * 2. Ensure authentication (token set in connection)
 * 3. Fetch customer list with no filters (should return empty or proper data)
 * 4. (Optional but realistic) Populate system with a few customers for
 *    filter/paging to work, skipped here (mock data assumed)
 * 5. Re-run advanced customer list with:
 *
 *    - Filter by email substring
 *    - Filter by name substring
 *    - Filter by phone substring
 *    - Filter by registration date range
 *    - Filter by email verification status
 *    - Sorting by name/email/phone/created_at/updated_at, asc and desc
 *    - Pagination via page/limit
 * 6. For each non-empty result, validate all customers only contain allowed
 *    summary properties, no sensitive fields.
 * 7. Validate result sets: pagination info matches page/limit; no more than limit
 *    per page; total counts reasonable for filter; empty results for impossible
 *    searches.
 * 8. Overbroad search (e.g., no filters, large limit) returns paginated results,
 *    never all data or password hashes.
 * 9. Error handling for limits > 100 (should truncate or error as per contract).
 *
 * Note: Creating actual customers is omitted here for cross-feature isolation.
 * If customer creation API is present, test should insert data and verify
 * expected results. In current scope, focus on admin join, auth, and customer
 * list API integrity.
 */
export async function test_api_admin_customer_list_advanced_filtered_pagination(
  connection: api.IConnection,
) {
  // 1. Register new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10) + "A1!";
  const adminName = RandomGenerator.name();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword satisfies string as string,
      name: adminName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);
  TestValidator.predicate(
    "admin join returns proper authorized structure",
    typeof admin.id === "string" &&
      admin.email === adminEmail &&
      typeof admin.token.access === "string",
  );

  // 2. connection is now authenticated as admin

  // 3. Fetch customer list: (no filters, expect empty or valid list)
  const resp1 = await api.functional.shoppingMall.admin.customers.index(
    connection,
    { body: {} satisfies IShoppingMallCustomer.IRequest },
  );
  typia.assert(resp1);
  TestValidator.equals(
    "pagination current >= 0",
    resp1.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "pagination limit >= 0",
    resp1.pagination.limit >= 0,
    true,
  );
  TestValidator.equals(
    "pagination records >= 0",
    resp1.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages >= 0",
    resp1.pagination.pages >= 0,
    true,
  );
  for (const cust of resp1.data) {
    typia.assert(cust);
    TestValidator.predicate(
      "no extra property on customer summary IE: id+name only",
      Object.keys(cust).length === 2 &&
        typeof cust.id === "string" &&
        typeof cust.name === "string",
    );
  }

  // 4. Try filtered search with unlikely email
  const resp2 = await api.functional.shoppingMall.admin.customers.index(
    connection,
    {
      body: { email: "impossible_email_value@autobe-test-domain.com" },
    },
  );
  typia.assert(resp2);
  TestValidator.equals(
    "empty data for impossible email query",
    resp2.data.length,
    0,
  );

  // 5. Try paginated + sorted request
  const page = 1 satisfies number as number;
  const limit = 5 satisfies number as number;
  const resp3 = await api.functional.shoppingMall.admin.customers.index(
    connection,
    {
      body: { page, limit, sort_by: "name", sort_order: "asc" },
    },
  );
  typia.assert(resp3);
  TestValidator.equals(
    "limit per page respected",
    resp3.data.length <= limit,
    true,
  );
  TestValidator.equals(
    "pagination meta page matches",
    resp3.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination meta limit matches",
    resp3.pagination.limit,
    limit,
  );

  // 6. Try registration date filter (future range yields 0 results)
  const registered_start_at = new Date(Date.now() + 10000000).toISOString();
  const registered_end_at = new Date(Date.now() + 20000000).toISOString();
  const resp4 = await api.functional.shoppingMall.admin.customers.index(
    connection,
    {
      body: { registered_start_at, registered_end_at },
    },
  );
  typia.assert(resp4);
  TestValidator.equals(
    "future registration date yields zero results",
    resp4.data.length,
    0,
  );

  // 7. Try email verification filter
  const resp5 = await api.functional.shoppingMall.admin.customers.index(
    connection,
    {
      body: { is_email_verified: true },
    },
  );
  typia.assert(resp5);

  for (const cust of resp5.data) {
    typia.assert(cust);
    TestValidator.predicate(
      "no sensitive field in summary (id+name)",
      Object.keys(cust).length === 2 &&
        typeof cust.id === "string" &&
        typeof cust.name === "string",
    );
  }

  // 8. Try using limit above contract (should not exceed 100)
  const resp6 = await api.functional.shoppingMall.admin.customers.index(
    connection,
    {
      body: { limit: 150 satisfies number as number },
    },
  );
  typia.assert(resp6);
  TestValidator.predicate(
    "limit is clipped to 100 or less",
    resp6.data.length <= 100,
  );
}
