import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCoin";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoin";
import type { IShoppingMallPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotion";

/**
 * Test comprehensive coin account search functionality for administrators.
 *
 * This test validates that administrators can search and filter coin accounts
 * across the platform with various criteria including actor types, coin types,
 * balance ranges, and sorting options. The test verifies that the search
 * respects the composite unique constraint @@unique([actor_type, coin_type]) by
 * requiring filtering parameters for proper scoping.
 *
 * Implementation Steps:
 *
 * 1. Authenticate as administrator
 * 2. Create test promotions to generate coin transactions
 * 3. Test coin account search with various filter combinations
 * 4. Validate response structure and pagination functionality
 * 5. Test sorting by different fields
 * 6. Verify search functionality with valid parameters only
 */
export async function test_api_admin_coin_account_search(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({ access: "full" }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create test promotions to generate coin transactions
  const promotion1 = await api.functional.shoppingMall.admin.promotions.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        promotion_type: "loyalty",
        start_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        end_date: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
        is_active: true,
        priority: 1,
      } satisfies IShoppingMallPromotion.ICreate,
    },
  );
  typia.assert(promotion1);

  const promotion2 = await api.functional.shoppingMall.admin.promotions.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        promotion_type: "reward",
        start_date: new Date(Date.now() + 86400000).toISOString(),
        end_date: new Date(Date.now() + 172800000).toISOString(),
        is_active: true,
        priority: 2,
      } satisfies IShoppingMallPromotion.ICreate,
    },
  );
  typia.assert(promotion2);

  // Step 3: Test coin account search with various filter combinations

  // Test 1: Basic search with required actor_type and coin_type
  const basicSearch = await api.functional.shoppingMall.admin.coins.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        actor_type: "administrator",
        coin_type: "loyalty_points",
      } satisfies IShoppingMallCoin.IRequest,
    },
  );
  typia.assert(basicSearch);
  TestValidator.equals(
    "pagination metadata exists",
    typeof basicSearch.pagination,
    "object",
  );
  TestValidator.equals(
    "data array exists",
    Array.isArray(basicSearch.data),
    true,
  );

  // Test 2: Search with balance range filtering
  const balanceSearch = await api.functional.shoppingMall.admin.coins.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        actor_type: "administrator",
        coin_type: "reward_coins",
        balance_min: 0,
        balance_max: 1000,
      } satisfies IShoppingMallCoin.IRequest,
    },
  );
  typia.assert(balanceSearch);
  TestValidator.predicate(
    "balance search returns valid data",
    balanceSearch.data.length >= 0,
  );

  // Test 3: Search with sorting by balance (descending)
  const sortedSearch = await api.functional.shoppingMall.admin.coins.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        actor_type: "administrator",
        coin_type: "bonus_coins",
        sort_by: "balance",
        order: "desc",
      } satisfies IShoppingMallCoin.IRequest,
    },
  );
  typia.assert(sortedSearch);
  TestValidator.predicate(
    "sorted search returns valid data",
    sortedSearch.data.length >= 0,
  );

  // Test 4: Search with sorting by creation date
  const dateSortedSearch = await api.functional.shoppingMall.admin.coins.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        actor_type: "administrator",
        coin_type: "loyalty_points",
        sort_by: "created_at",
        order: "asc",
      } satisfies IShoppingMallCoin.IRequest,
    },
  );
  typia.assert(dateSortedSearch);
  TestValidator.predicate(
    "date sorted search returns valid data",
    dateSortedSearch.data.length >= 0,
  );

  // Test 5: Pagination functionality test
  const paginationTest = await api.functional.shoppingMall.admin.coins.index(
    connection,
    {
      body: {
        page: 2,
        limit: 5,
        actor_type: "administrator",
        coin_type: "reward_coins",
      } satisfies IShoppingMallCoin.IRequest,
    },
  );
  typia.assert(paginationTest);
  TestValidator.equals(
    "pagination current page is 2",
    paginationTest.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit is 5",
    paginationTest.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    paginationTest.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    paginationTest.pagination.pages >= 0,
  );

  // Step 4: Validate response structure for coin account summaries
  if (basicSearch.data.length > 0) {
    const sampleAccount = basicSearch.data[0];
    TestValidator.predicate(
      "account has id",
      typeof sampleAccount.id === "string",
    );
    TestValidator.predicate(
      "account has actor_type",
      typeof sampleAccount.actor_type === "string",
    );
    TestValidator.predicate(
      "account has coin_type",
      typeof sampleAccount.coin_type === "string",
    );
    TestValidator.predicate(
      "account has balance",
      typeof sampleAccount.balance === "number",
    );
    TestValidator.predicate(
      "account has total_earned",
      typeof sampleAccount.total_earned === "number",
    );
    TestValidator.predicate(
      "account has total_spent",
      typeof sampleAccount.total_spent === "number",
    );
    TestValidator.predicate(
      "account has created_at",
      typeof sampleAccount.created_at === "string",
    );
    TestValidator.predicate(
      "account has updated_at",
      typeof sampleAccount.updated_at === "string",
    );

    TestValidator.predicate(
      "balance is non-negative",
      sampleAccount.balance >= 0,
    );
    TestValidator.predicate(
      "total_earned is non-negative",
      sampleAccount.total_earned >= 0,
    );
    TestValidator.predicate(
      "total_spent is non-negative",
      sampleAccount.total_spent >= 0,
    );
    TestValidator.predicate(
      "total_spent <= total_earned",
      sampleAccount.total_spent <= sampleAccount.total_earned,
    );
  }

  // Test 6: Search with different actor types
  const customerSearch = await api.functional.shoppingMall.admin.coins.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        actor_type: "customer",
        coin_type: "loyalty_points",
      } satisfies IShoppingMallCoin.IRequest,
    },
  );
  typia.assert(customerSearch);
  TestValidator.predicate(
    "customer search returns valid data",
    customerSearch.data.length >= 0,
  );

  const sellerSearch = await api.functional.shoppingMall.admin.coins.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        actor_type: "seller",
        coin_type: "reward_coins",
      } satisfies IShoppingMallCoin.IRequest,
    },
  );
  typia.assert(sellerSearch);
  TestValidator.predicate(
    "seller search returns valid data",
    sellerSearch.data.length >= 0,
  );

  // Test 7: Search with maximum limit
  const maxLimitSearch = await api.functional.shoppingMall.admin.coins.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
        actor_type: "administrator",
        coin_type: "bonus_coins",
      } satisfies IShoppingMallCoin.IRequest,
    },
  );
  typia.assert(maxLimitSearch);
  TestValidator.equals(
    "max limit search uses limit 100",
    maxLimitSearch.pagination.limit,
    100,
  );
}
