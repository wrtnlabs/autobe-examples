import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallReward } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReward";

/**
 * Test deletion validation for active reward programs with customer
 * associations. Validates that administrators cannot delete programs that are
 * currently active or have customer reward balances. Ensures proper error
 * handling and validation messages when attempting to delete programs that
 * should remain accessible for customer redemption purposes. Tests the business
 * rule enforcement that protects active programs from premature deletion.
 */
export async function test_api_reward_program_delete_active_program(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({ can_manage_rewards: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create an active reward program
  const rewardProgram = await api.functional.shoppingMall.admin.rewards.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        reward_type: "purchase_based",
        earning_rules: JSON.stringify({
          rate: 0.1,
          minimum_purchase: 1000,
          eligible_categories: ["electronics", "clothing"],
        }),
        redemption_rules: JSON.stringify({
          minimum_coins: 100,
          maximum_discount: 5000,
          eligible_products: "all",
        }),
        coin_value: 10,
        minimum_purchase: 1000,
        maximum_coins: 10000,
        valid_from: new Date().toISOString(),
        valid_until: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        is_active: true, // Critical: Program is active
      } satisfies IShoppingMallReward.ICreate,
    },
  );
  typia.assert(rewardProgram);

  // Step 3: Attempt to delete the active reward program (should fail)
  await TestValidator.error("cannot delete active reward program", async () => {
    await api.functional.shoppingMall.admin.rewards.erase(connection, {
      rewardId: rewardProgram.id,
    });
  });
}
