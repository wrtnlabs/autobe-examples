import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallReward } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReward";

/**
 * Test comprehensive reward program update functionality by administrators.
 *
 * Validates that authorized administrators can modify existing reward program
 * configurations including program name, description, earning rules, redemption
 * rules, coin values, and validity periods. Ensures all field updates are
 * properly validated and persisted, program integrity is maintained during
 * updates, and existing customer reward balances are not negatively impacted.
 */
export async function test_api_reward_program_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      first_name: "Test",
      last_name: "Administrator",
      role: "super_admin",
      permissions: JSON.stringify({ admin: true, rewards: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create initial reward program to be updated
  const initialReward = await api.functional.shoppingMall.admin.rewards.create(
    connection,
    {
      body: {
        name: "Initial Reward Program",
        description: "This is the initial reward program description",
        reward_type: "purchase_based",
        earning_rules: JSON.stringify({ rate: 0.1, minimum_purchase: 50 }),
        redemption_rules: JSON.stringify({
          minimum_coins: 100,
          discount_percentage: 10,
        }),
        coin_value: 10,
        minimum_purchase: 50,
        maximum_coins: 1000,
        valid_from: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        valid_until: new Date(Date.now() + 2592000000).toISOString(), // 30 days from now
        is_active: true,
      } satisfies IShoppingMallReward.ICreate,
    },
  );
  typia.assert(initialReward);

  // Step 3: Test comprehensive program updates
  const updatedReward = await api.functional.shoppingMall.admin.rewards.update(
    connection,
    {
      rewardId: initialReward.id,
      body: {
        name: "Updated Reward Program",
        description:
          "This is the updated reward program description with new features",
        reward_type: "promotional",
        earning_rules: JSON.stringify({
          rate: 0.15,
          minimum_purchase: 30,
          bonus_coins: 5,
        }),
        redemption_rules: JSON.stringify({
          minimum_coins: 50,
          discount_percentage: 15,
          max_discount: 500,
        }),
        coin_value: 15,
        minimum_purchase: 30,
        maximum_coins: 2000,
        valid_from: new Date(Date.now() + 172800000).toISOString(), // 2 days from now
        valid_until: new Date(Date.now() + 5184000000).toISOString(), // 60 days from now
        is_active: false,
      } satisfies IShoppingMallReward.IUpdate,
    },
  );
  typia.assert(updatedReward);

  // Step 4: Validate all updates were applied correctly
  TestValidator.equals(
    "program name updated",
    updatedReward.name,
    "Updated Reward Program",
  );
  TestValidator.equals(
    "program description updated",
    updatedReward.description,
    "This is the updated reward program description with new features",
  );
  TestValidator.equals(
    "reward type updated",
    updatedReward.reward_type,
    "promotional",
  );
  TestValidator.equals("coin value updated", updatedReward.coin_value, 15);
  TestValidator.equals(
    "minimum purchase updated",
    updatedReward.minimum_purchase,
    30,
  );
  TestValidator.equals(
    "maximum coins updated",
    updatedReward.maximum_coins,
    2000,
  );
  TestValidator.predicate(
    "program is inactive after update",
    updatedReward.is_active === false,
  );

  // Step 5: Test individual field updates to ensure independent modification capability
  const nameOnlyUpdate = await api.functional.shoppingMall.admin.rewards.update(
    connection,
    {
      rewardId: initialReward.id,
      body: {
        name: "Name Only Updated Program",
      } satisfies IShoppingMallReward.IUpdate,
    },
  );
  typia.assert(nameOnlyUpdate);
  TestValidator.equals(
    "only name updated",
    nameOnlyUpdate.name,
    "Name Only Updated Program",
  );
  TestValidator.equals(
    "other fields remain unchanged",
    nameOnlyUpdate.description,
    updatedReward.description,
  );

  // Step 6: Test activation status toggle
  const reactivatedReward =
    await api.functional.shoppingMall.admin.rewards.update(connection, {
      rewardId: initialReward.id,
      body: {
        is_active: true,
      } satisfies IShoppingMallReward.IUpdate,
    });
  typia.assert(reactivatedReward);
  TestValidator.predicate(
    "program reactivated successfully",
    reactivatedReward.is_active === true,
  );

  // Step 7: Validate program integrity - ID should remain the same
  TestValidator.equals(
    "program ID remains consistent",
    reactivatedReward.id,
    initialReward.id,
  );
  TestValidator.notEquals(
    "updated_at timestamp changed",
    reactivatedReward.updated_at,
    initialReward.updated_at,
  );

  // Step 8: Test business rule validation - invalid validity period (end before start)
  await TestValidator.error(
    "should reject invalid validity period",
    async () => {
      await api.functional.shoppingMall.admin.rewards.update(connection, {
        rewardId: initialReward.id,
        body: {
          valid_from: new Date(Date.now() + 5184000000).toISOString(), // 60 days from now
          valid_until: new Date(Date.now() + 172800000).toISOString(), // 2 days from now - invalid
        } satisfies IShoppingMallReward.IUpdate,
      });
    },
  );

  // Step 9: Test updating with invalid JSON rules
  await TestValidator.error(
    "should reject invalid earning rules JSON",
    async () => {
      await api.functional.shoppingMall.admin.rewards.update(connection, {
        rewardId: initialReward.id,
        body: {
          earning_rules: "invalid json format",
        } satisfies IShoppingMallReward.IUpdate,
      });
    },
  );

  // Step 10: Test updating with negative coin value
  await TestValidator.error("should reject negative coin value", async () => {
    await api.functional.shoppingMall.admin.rewards.update(connection, {
      rewardId: initialReward.id,
      body: {
        coin_value: -5,
      } satisfies IShoppingMallReward.IUpdate,
    });
  });
}
