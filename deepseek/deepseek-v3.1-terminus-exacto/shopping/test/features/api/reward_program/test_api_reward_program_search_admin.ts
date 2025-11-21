import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReward } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReward";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallReward } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReward";

/**
 * Comprehensive E2E test for administrative reward program search
 * functionality.
 *
 * Validates that administrators can perform advanced searches with full access
 * to all program details including inactive and expired programs. Tests various
 * search parameters, pagination, filtering, and sorting capabilities to ensure
 * proper administrative program management and analysis functionality.
 */
export async function test_api_reward_program_search_admin(
  connection: api.IConnection,
) {
  // 1. Create administrator account for authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(2),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({
        reward_programs: ["read", "write", "delete"],
        users: ["read", "manage"],
        analytics: ["read"],
      }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // 2. Test basic pagination search
  const basicSearch = await api.functional.shoppingMall.rewards.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        order_by: "created_at",
        order_direction: "desc",
      } satisfies IShoppingMallReward.IRequest,
    },
  );
  typia.assert(basicSearch);

  TestValidator.predicate(
    "pagination metadata should exist",
    basicSearch.pagination !== undefined,
  );
  TestValidator.equals(
    "current page should be 1",
    basicSearch.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit should be positive",
    basicSearch.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count should be non-negative",
    basicSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count should be non-negative",
    basicSearch.pagination.pages >= 0,
  );

  // 3. Test text-based search filtering
  const searchTerm = RandomGenerator.alphabets(5);
  const textSearch = await api.functional.shoppingMall.rewards.index(
    connection,
    {
      body: {
        search: searchTerm,
        page: 1,
        limit: 5,
      } satisfies IShoppingMallReward.IRequest,
    },
  );
  typia.assert(textSearch);

  // 4. Test reward type filtering
  const rewardTypes = [
    "purchase_based",
    "referral",
    "promotional",
    "seasonal",
  ] as const;
  const randomType = RandomGenerator.pick(rewardTypes);

  const typeSearch = await api.functional.shoppingMall.rewards.index(
    connection,
    {
      body: {
        reward_type: randomType,
        page: 1,
        limit: 5,
      } satisfies IShoppingMallReward.IRequest,
    },
  );
  typia.assert(typeSearch);

  // 5. Test active/inactive status filtering
  const activeSearch = await api.functional.shoppingMall.rewards.index(
    connection,
    {
      body: {
        is_active: true,
        page: 1,
        limit: 5,
      } satisfies IShoppingMallReward.IRequest,
    },
  );
  typia.assert(activeSearch);

  const inactiveSearch = await api.functional.shoppingMall.rewards.index(
    connection,
    {
      body: {
        is_active: false,
        page: 1,
        limit: 5,
      } satisfies IShoppingMallReward.IRequest,
    },
  );
  typia.assert(inactiveSearch);

  // 6. Test date range filtering
  const currentDate = new Date().toISOString();
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow

  const dateRangeSearch = await api.functional.shoppingMall.rewards.index(
    connection,
    {
      body: {
        valid_from_start: currentDate,
        valid_from_end: futureDate,
        page: 1,
        limit: 5,
      } satisfies IShoppingMallReward.IRequest,
    },
  );
  typia.assert(dateRangeSearch);

  // 7. Test sorting by different fields
  const sortFields = ["created_at", "valid_from", "name"] as const;
  const sortDirections = ["asc", "desc"] as const;

  for (const field of sortFields) {
    for (const direction of sortDirections) {
      const sortedSearch = await api.functional.shoppingMall.rewards.index(
        connection,
        {
          body: {
            order_by: field,
            order_direction: direction,
            page: 1,
            limit: 3,
          } satisfies IShoppingMallReward.IRequest,
        },
      );
      typia.assert(sortedSearch);

      TestValidator.predicate(
        `sorted search should return array data for ${field} ${direction}`,
        Array.isArray(sortedSearch.data),
      );
    }
  }

  // 8. Test combined search parameters
  const combinedSearch = await api.functional.shoppingMall.rewards.index(
    connection,
    {
      body: {
        search: "reward",
        reward_type: "purchase_based",
        is_active: true,
        order_by: "name",
        order_direction: "asc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallReward.IRequest,
    },
  );
  typia.assert(combinedSearch);

  // 9. Validate reward program data structure (only basic business logic validation)
  if (combinedSearch.data.length > 0) {
    const sampleReward = combinedSearch.data[0];

    // Only validate business logic, not type formats (typia.assert already handles type validation)
    TestValidator.predicate(
      "reward program name should not be empty",
      sampleReward.name.length > 0,
    );
    TestValidator.predicate(
      "reward program description should not be empty",
      sampleReward.description.length > 0,
    );
    TestValidator.predicate(
      "coin value should be positive",
      sampleReward.coin_value > 0,
    );
    TestValidator.predicate(
      "is_active should be boolean",
      typeof sampleReward.is_active === "boolean",
    );
  }

  // 10. Test edge case: empty search with all optional parameters
  const emptySearch = await api.functional.shoppingMall.rewards.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IShoppingMallReward.IRequest,
    },
  );
  typia.assert(emptySearch);

  TestValidator.predicate(
    "empty search should return valid pagination structure",
    emptySearch.pagination !== undefined,
  );
}
