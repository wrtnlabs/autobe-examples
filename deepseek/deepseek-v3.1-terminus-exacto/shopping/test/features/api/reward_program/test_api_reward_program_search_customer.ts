import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReward } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReward";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallReward } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReward";

/**
 * Test that authenticated customers can search reward programs with enhanced
 * filtering capabilities and personalized results. Validates that customer
 * authentication provides access to additional program details and filtering
 * options. The test ensures proper integration between customer authentication
 * and reward program discovery for personalized shopping experiences.
 */
export async function test_api_reward_program_search_customer(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for authentication context
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "SecurePassword123!",
      first_name: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 3,
        wordMax: 7,
      }),
      last_name: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 3,
        wordMax: 7,
      }),
      phone_number: RandomGenerator.mobile("010"),
      href: "https://shoppingmall.example.com/register",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Test basic search without filters
  const basicSearchResult = await api.functional.shoppingMall.rewards.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallReward.IRequest,
    },
  );
  typia.assert(basicSearchResult);
  TestValidator.equals(
    "pagination current page is 1",
    basicSearchResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "data is an array",
    Array.isArray(basicSearchResult.data),
  );

  // Step 3: Test search with text filter using meaningful content
  const searchContent = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  const searchTerm = searchContent.substring(
    0,
    Math.min(20, searchContent.length),
  );
  const textSearchResult = await api.functional.shoppingMall.rewards.index(
    connection,
    {
      body: {
        search: searchTerm,
        page: 1,
        limit: 5,
      } satisfies IShoppingMallReward.IRequest,
    },
  );
  typia.assert(textSearchResult);

  // Step 4: Test search with reward type filter
  const rewardTypes = [
    "purchase_based",
    "referral",
    "promotional",
    "seasonal",
  ] as const;
  const selectedRewardType = RandomGenerator.pick(rewardTypes);
  const typeSearchResult = await api.functional.shoppingMall.rewards.index(
    connection,
    {
      body: {
        reward_type: selectedRewardType,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallReward.IRequest,
    },
  );
  typia.assert(typeSearchResult);

  // Step 5: Test search with active status filter
  const activeSearchResult = await api.functional.shoppingMall.rewards.index(
    connection,
    {
      body: {
        is_active: true,
        page: 1,
        limit: 8,
      } satisfies IShoppingMallReward.IRequest,
    },
  );
  typia.assert(activeSearchResult);

  // Step 6: Test search with date range filter
  const currentDate = new Date();
  const futureDate = new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days in future
  const dateSearchResult = await api.functional.shoppingMall.rewards.index(
    connection,
    {
      body: {
        valid_from_start: currentDate.toISOString(),
        valid_from_end: futureDate.toISOString(),
        page: 1,
        limit: 6,
      } satisfies IShoppingMallReward.IRequest,
    },
  );
  typia.assert(dateSearchResult);

  // Step 7: Test search with sorting
  const sortSearchResult = await api.functional.shoppingMall.rewards.index(
    connection,
    {
      body: {
        order_by: "created_at",
        order_direction: "desc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallReward.IRequest,
    },
  );
  typia.assert(sortSearchResult);

  // Step 8: Test comprehensive search with multiple filters
  const comprehensiveSearchContent = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 8,
  });
  const comprehensiveSearchTerm = comprehensiveSearchContent.substring(
    0,
    Math.min(15, comprehensiveSearchContent.length),
  );
  const comprehensiveSearchResult =
    await api.functional.shoppingMall.rewards.index(connection, {
      body: {
        search: comprehensiveSearchTerm,
        reward_type: RandomGenerator.pick(rewardTypes),
        is_active: true,
        order_by: "name",
        order_direction: "asc",
        page: 2,
        limit: 5,
      } satisfies IShoppingMallReward.IRequest,
    });
  typia.assert(comprehensiveSearchResult);

  // Step 9: Validate pagination structure
  TestValidator.predicate(
    "pagination current page is non-negative",
    basicSearchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    basicSearchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    basicSearchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    basicSearchResult.pagination.pages >= 0,
  );

  // Step 10: Validate business logic - if data exists, verify reward program properties
  if (basicSearchResult.data.length > 0) {
    const sampleReward = basicSearchResult.data[0];
    TestValidator.predicate(
      "reward program has non-empty name",
      sampleReward.name.length > 0,
    );
    TestValidator.predicate(
      "reward program has non-empty description",
      sampleReward.description.length > 0,
    );
    TestValidator.predicate(
      "reward program has valid coin value",
      sampleReward.coin_value >= 0,
    );
    TestValidator.predicate(
      "reward program has valid creation date",
      !isNaN(new Date(sampleReward.created_at).getTime()),
    );
  }
}
