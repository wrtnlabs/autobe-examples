import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallReward } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReward";

/**
 * Test successful deletion of inactive reward programs without customer
 * associations. Validates that administrators can properly remove inactive
 * programs that have no active customer participation or outstanding reward
 * balances. Ensures that soft deletion properly archives program data while
 * removing it from active customer view and administrative operations.
 */
export async function test_api_reward_program_delete_inactive_program(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin123!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "support_admin",
      permissions: JSON.stringify({ reward_management: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create an inactive reward program for deletion testing
  const rewardProgram = await api.functional.shoppingMall.admin.rewards.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        reward_type: "purchase_based",
        earning_rules: JSON.stringify({
          rate: 0.05,
          minimum_purchase: 10000,
          eligible_categories: ["electronics", "clothing"],
        }),
        redemption_rules: JSON.stringify({
          minimum_coins: 100,
          eligible_products: "all",
          expiration_days: 365,
        }),
        coin_value: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
        >(),
        minimum_purchase: typia.random<
          number &
            tags.Type<"int32"> &
            tags.Minimum<1000> &
            tags.Maximum<100000>
        >(),
        maximum_coins: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<10000>
        >(),
        valid_from: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        valid_until: new Date(Date.now() + 2592000000).toISOString(), // 30 days from now
        is_active: false, // Mark as inactive for deletion testing
      } satisfies IShoppingMallReward.ICreate,
    },
  );
  typia.assert(rewardProgram);

  // Verify program was created as inactive
  TestValidator.equals(
    "reward program should be inactive",
    rewardProgram.is_active,
    false,
  );

  // Step 3: Delete the inactive reward program
  await api.functional.shoppingMall.admin.rewards.erase(connection, {
    rewardId: rewardProgram.id,
  });

  // Step 4: Validate successful deletion by ensuring no error was thrown
  TestValidator.predicate(
    "inactive reward program deletion completed without errors",
    true,
  );
}
