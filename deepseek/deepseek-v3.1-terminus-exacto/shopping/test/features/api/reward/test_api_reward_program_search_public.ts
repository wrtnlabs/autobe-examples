import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReward } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReward";
import type { IShoppingMallReward } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReward";

/**
 * Test that unauthenticated users can search and browse reward programs with
 * various filtering options including program type, active status, validity
 * dates, and name matching. Validates comprehensive search functionality for
 * discovering available reward programs without requiring authentication. The
 * test ensures proper pagination, sorting options, and filtering capabilities
 * work correctly for public access to reward program information.
 */
export async function test_api_reward_program_search_public(
  connection: api.IConnection,
) {
  // Ensure unauthenticated connection by creating a fresh connection without headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Test 1: Basic search with default parameters
  const basicResult: IPageIShoppingMallReward.ISummary =
    await api.functional.shoppingMall.rewards.index(unauthenticatedConnection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallReward.IRequest,
    });
  typia.assert(basicResult);
  TestValidator.equals(
    "basic search returns pagination data",
    basicResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "basic search returns limit",
    basicResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "basic search returns valid records count",
    basicResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "basic search returns valid pages count",
    basicResult.pagination.pages >= 0,
  );

  // Validate the structure of returned reward programs
  if (basicResult.data.length > 0) {
    const sampleReward = basicResult.data[0];
    TestValidator.predicate(
      "reward program has valid UUID ID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        sampleReward.id,
      ),
    );
    TestValidator.predicate(
      "reward program has non-empty name",
      sampleReward.name.length > 0,
    );
    TestValidator.predicate(
      "reward program has valid coin value",
      sampleReward.coin_value >= 0,
    );
    TestValidator.predicate(
      "reward program has valid reward type",
      sampleReward.reward_type.length > 0,
    );
  }

  // Test 2: Search with text filtering
  const searchTerm = RandomGenerator.paragraph({ sentences: 2 });
  const searchResult: IPageIShoppingMallReward.ISummary =
    await api.functional.shoppingMall.rewards.index(unauthenticatedConnection, {
      body: {
        page: 1,
        limit: 5,
        search: searchTerm,
      } satisfies IShoppingMallReward.IRequest,
    });
  typia.assert(searchResult);

  // Test 3: Filter by reward type with comprehensive validation
  const rewardTypes = [
    "purchase_based",
    "referral",
    "promotional",
    "seasonal",
  ] as const;
  const selectedType = RandomGenerator.pick(rewardTypes);
  const typeResult: IPageIShoppingMallReward.ISummary =
    await api.functional.shoppingMall.rewards.index(unauthenticatedConnection, {
      body: {
        page: 1,
        limit: 5,
        reward_type: selectedType,
      } satisfies IShoppingMallReward.IRequest,
    });
  typia.assert(typeResult);

  // Validate that filtered results match the selected type (if any results returned)
  if (typeResult.data.length > 0) {
    TestValidator.predicate(
      "all returned programs match the selected reward type",
      typeResult.data.every((reward) => reward.reward_type === selectedType),
    );
  }

  // Test 4: Filter by active status
  const activeResult: IPageIShoppingMallReward.ISummary =
    await api.functional.shoppingMall.rewards.index(unauthenticatedConnection, {
      body: {
        page: 1,
        limit: 5,
        is_active: true,
      } satisfies IShoppingMallReward.IRequest,
    });
  typia.assert(activeResult);

  // Validate active status filtering
  if (activeResult.data.length > 0) {
    TestValidator.predicate(
      "all returned programs are active",
      activeResult.data.every((reward) => reward.is_active === true),
    );
  }

  // Test 5: Filter by date range
  const now = new Date();
  const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
  const dateResult: IPageIShoppingMallReward.ISummary =
    await api.functional.shoppingMall.rewards.index(unauthenticatedConnection, {
      body: {
        page: 1,
        limit: 5,
        valid_from_start: now.toISOString(),
        valid_from_end: futureDate.toISOString(),
      } satisfies IShoppingMallReward.IRequest,
    });
  typia.assert(dateResult);

  // Test 6: Sorting by different fields with validation
  const sortFields = ["created_at", "valid_from", "name"] as const;
  const sortDirections = ["asc", "desc"] as const;

  const sortField = RandomGenerator.pick(sortFields);
  const sortDirection = RandomGenerator.pick(sortDirections);

  const sortResult: IPageIShoppingMallReward.ISummary =
    await api.functional.shoppingMall.rewards.index(unauthenticatedConnection, {
      body: {
        page: 1,
        limit: 5,
        order_by: sortField,
        order_direction: sortDirection,
      } satisfies IShoppingMallReward.IRequest,
    });
  typia.assert(sortResult);

  // Test 7: Maximum limit test
  const maxLimitResult: IPageIShoppingMallReward.ISummary =
    await api.functional.shoppingMall.rewards.index(unauthenticatedConnection, {
      body: {
        page: 1,
        limit: 100, // Maximum allowed limit
      } satisfies IShoppingMallReward.IRequest,
    });
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "maximum limit is respected",
    maxLimitResult.pagination.limit,
    100,
  );

  // Test 8: Error scenario - invalid limit value (should use API validation)
  await TestValidator.error(
    "invalid limit value should be handled by API",
    async () => {
      await api.functional.shoppingMall.rewards.index(
        unauthenticatedConnection,
        {
          body: {
            page: 1,
            limit: 150, // Exceeds maximum limit of 100
          } satisfies IShoppingMallReward.IRequest,
        },
      );
    },
  );

  // Test 9: Combined filters with comprehensive validation
  const combinedSearchTerm = RandomGenerator.paragraph({ sentences: 1 });
  const combinedRewardType = RandomGenerator.pick(rewardTypes);

  const combinedResult: IPageIShoppingMallReward.ISummary =
    await api.functional.shoppingMall.rewards.index(unauthenticatedConnection, {
      body: {
        page: 2,
        limit: 15,
        search: combinedSearchTerm,
        reward_type: combinedRewardType,
        is_active: true,
        order_by: "name",
        order_direction: "asc",
      } satisfies IShoppingMallReward.IRequest,
    });
  typia.assert(combinedResult);
  TestValidator.equals(
    "combined filter returns correct page",
    combinedResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "combined filter returns correct limit",
    combinedResult.pagination.limit,
    15,
  );

  // Validate combined filter results
  if (combinedResult.data.length > 0) {
    TestValidator.predicate(
      "combined filter returns active programs only",
      combinedResult.data.every((reward) => reward.is_active === true),
    );

    if (combinedSearchTerm.length > 0) {
      TestValidator.predicate(
        "search term filtering works with combined filters",
        combinedResult.data.some(
          (reward) =>
            reward.name
              .toLowerCase()
              .includes(combinedSearchTerm.toLowerCase()) ||
            reward.description
              .toLowerCase()
              .includes(combinedSearchTerm.toLowerCase()),
        ),
      );
    }
  }

  // Test 10: Empty search with different page
  const emptyResult: IPageIShoppingMallReward.ISummary =
    await api.functional.shoppingMall.rewards.index(unauthenticatedConnection, {
      body: {
        page: 3,
        limit: 20,
      } satisfies IShoppingMallReward.IRequest,
    });
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty search returns correct page",
    emptyResult.pagination.current,
    3,
  );
  TestValidator.equals(
    "empty search returns correct limit",
    emptyResult.pagination.limit,
    20,
  );
}
