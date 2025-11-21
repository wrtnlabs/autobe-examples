import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallReward } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReward";

/**
 * Test partial field updates to existing reward programs.
 *
 * Validates that administrators can update specific fields without affecting
 * unchanged properties. Tests selective modification of program attributes like
 * coin value adjustments, rule configuration updates, or validity period
 * extensions while preserving other program settings.
 */
export async function test_api_reward_program_update_partial_fields(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({ manage_rewards: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create initial reward program for testing
  const tomorrow = new Date(Date.now() + 86400000);
  const thirtyDaysLater = new Date(Date.now() + 2592000000);

  const initialRewardProgram =
    await api.functional.shoppingMall.admin.rewards.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        reward_type: "purchase_based",
        earning_rules: JSON.stringify({
          earning_rate: 0.1,
          minimum_purchase: 10000,
          eligible_categories: ["electronics", "clothing"],
        }),
        redemption_rules: JSON.stringify({
          minimum_redemption: 100,
          max_redemption_per_order: 1000,
          eligible_products: "all",
        }),
        coin_value: 10,
        minimum_purchase: 10000,
        maximum_coins: 1000,
        valid_from: tomorrow.toISOString(),
        valid_until: thirtyDaysLater.toISOString(),
        is_active: true,
      } satisfies IShoppingMallReward.ICreate,
    });
  typia.assert(initialRewardProgram);

  // Step 3: Test partial update - coin value adjustment only
  const updatedCoinValue =
    await api.functional.shoppingMall.admin.rewards.update(connection, {
      rewardId: initialRewardProgram.id,
      body: {
        coin_value: 20, // Double the coin value
      } satisfies IShoppingMallReward.IUpdate,
    });
  typia.assert(updatedCoinValue);

  // Validate only coin_value changed, other properties remain unchanged
  TestValidator.equals(
    "coin value should be updated",
    updatedCoinValue.coin_value,
    20,
  );
  TestValidator.equals(
    "name should remain unchanged",
    updatedCoinValue.name,
    initialRewardProgram.name,
  );
  TestValidator.equals(
    "description should remain unchanged",
    updatedCoinValue.description,
    initialRewardProgram.description,
  );
  TestValidator.equals(
    "reward type should remain unchanged",
    updatedCoinValue.reward_type,
    initialRewardProgram.reward_type,
  );
  TestValidator.equals(
    "minimum purchase should remain unchanged",
    updatedCoinValue.minimum_purchase,
    initialRewardProgram.minimum_purchase,
  );
  TestValidator.equals(
    "is_active should remain unchanged",
    updatedCoinValue.is_active,
    initialRewardProgram.is_active,
  );

  // Step 4: Test partial update - description modification only
  const newDescription = RandomGenerator.content({ paragraphs: 3 });
  const updatedDescription =
    await api.functional.shoppingMall.admin.rewards.update(connection, {
      rewardId: initialRewardProgram.id,
      body: {
        description: newDescription,
      } satisfies IShoppingMallReward.IUpdate,
    });
  typia.assert(updatedDescription);

  // Validate only description changed, coin value and other properties remain
  TestValidator.equals(
    "description should be updated",
    updatedDescription.description,
    newDescription,
  );
  TestValidator.equals(
    "coin value should remain at previous update",
    updatedDescription.coin_value,
    20,
  );
  TestValidator.equals(
    "name should remain unchanged",
    updatedDescription.name,
    initialRewardProgram.name,
  );
  TestValidator.equals(
    "reward type should remain unchanged",
    updatedDescription.reward_type,
    initialRewardProgram.reward_type,
  );

  // Step 5: Test partial update - status toggle only
  const updatedStatus = await api.functional.shoppingMall.admin.rewards.update(
    connection,
    {
      rewardId: initialRewardProgram.id,
      body: {
        is_active: false,
      } satisfies IShoppingMallReward.IUpdate,
    },
  );
  typia.assert(updatedStatus);

  // Validate only is_active changed, all other properties remain
  TestValidator.equals(
    "is_active should be updated to false",
    updatedStatus.is_active,
    false,
  );
  TestValidator.equals(
    "description should remain at previous update",
    updatedStatus.description,
    newDescription,
  );
  TestValidator.equals(
    "coin value should remain at previous update",
    updatedStatus.coin_value,
    20,
  );
  TestValidator.equals(
    "name should remain unchanged",
    updatedStatus.name,
    initialRewardProgram.name,
  );

  // Step 6: Test partial update with multiple fields
  const finalUpdateName = RandomGenerator.paragraph({ sentences: 2 });
  const finalUpdate = await api.functional.shoppingMall.admin.rewards.update(
    connection,
    {
      rewardId: initialRewardProgram.id,
      body: {
        name: finalUpdateName,
        coin_value: 15,
        is_active: true,
      } satisfies IShoppingMallReward.IUpdate,
    },
  );
  typia.assert(finalUpdate);

  // Validate multiple field updates
  TestValidator.equals(
    "name should be updated",
    finalUpdate.name,
    finalUpdateName,
  );
  TestValidator.equals(
    "coin value should be updated to 15",
    finalUpdate.coin_value,
    15,
  );
  TestValidator.equals(
    "is_active should be updated to true",
    finalUpdate.is_active,
    true,
  );
  TestValidator.equals(
    "description should remain unchanged from previous update",
    finalUpdate.description,
    newDescription,
  );
  TestValidator.equals(
    "reward type should remain unchanged",
    finalUpdate.reward_type,
    initialRewardProgram.reward_type,
  );

  // Step 7: Test updating optional fields to undefined
  const updateWithUndefined =
    await api.functional.shoppingMall.admin.rewards.update(connection, {
      rewardId: initialRewardProgram.id,
      body: {
        minimum_purchase: undefined,
        maximum_coins: undefined,
      } satisfies IShoppingMallReward.IUpdate,
    });
  typia.assert(updateWithUndefined);

  // Validate that undefined values don't break the update
  TestValidator.equals(
    "name should remain unchanged",
    updateWithUndefined.name,
    finalUpdateName,
  );
  TestValidator.equals(
    "coin value should remain unchanged",
    updateWithUndefined.coin_value,
    15,
  );
}
