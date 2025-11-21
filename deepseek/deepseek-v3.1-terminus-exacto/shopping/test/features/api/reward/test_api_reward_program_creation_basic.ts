import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallReward } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReward";

/**
 * Test successful creation of a basic reward program with essential
 * configuration parameters. Administrator authenticates and creates a new
 * reward program with minimum required fields: program name, description,
 * reward type, earning rules JSON, redemption rules JSON, coin value, validity
 * start date, and active status. Validates that the program is created
 * successfully with system-generated UUID, creation timestamp, and proper
 * persistence of all configuration details. Ensures that the program is
 * immediately available for customer participation after creation.
 */
export async function test_api_reward_program_creation_basic(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "super_admin",
      permissions: JSON.stringify({
        rewards: ["create", "read", "update", "delete"],
      }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create reward program with realistic configuration
  const rewardProgramData = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    reward_type: "purchase_based",
    earning_rules: JSON.stringify({
      earning_rate: 0.1,
      minimum_purchase: 5000,
      eligible_categories: ["electronics", "clothing", "home"],
      max_coins_per_transaction: 1000,
    }),
    redemption_rules: JSON.stringify({
      minimum_redemption: 100,
      eligible_products: "all",
      max_discount_percentage: 50,
      validity_period: "30 days",
    }),
    coin_value: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
    >(),
    minimum_purchase: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<100000>
    >(),
    maximum_coins: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<5000>
    >(),
    valid_from: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    valid_until: new Date(Date.now() + 2592000000).toISOString(), // 30 days from now
    is_active: true,
  } satisfies IShoppingMallReward.ICreate;

  // Step 3: Create the reward program
  const createdReward = await api.functional.shoppingMall.admin.rewards.create(
    connection,
    {
      body: rewardProgramData,
    },
  );
  typia.assert(createdReward);

  // Step 4: Validate response data matches input
  TestValidator.equals(
    "reward program name matches",
    createdReward.name,
    rewardProgramData.name,
  );
  TestValidator.equals(
    "reward program description matches",
    createdReward.description,
    rewardProgramData.description,
  );
  TestValidator.equals(
    "reward type matches",
    createdReward.reward_type,
    rewardProgramData.reward_type,
  );
  TestValidator.equals(
    "earning rules match",
    createdReward.earning_rules,
    rewardProgramData.earning_rules,
  );
  TestValidator.equals(
    "redemption rules match",
    createdReward.redemption_rules,
    rewardProgramData.redemption_rules,
  );
  TestValidator.equals(
    "coin value matches",
    createdReward.coin_value,
    rewardProgramData.coin_value,
  );
  TestValidator.equals(
    "minimum purchase matches",
    createdReward.minimum_purchase,
    rewardProgramData.minimum_purchase,
  );
  TestValidator.equals(
    "maximum coins matches",
    createdReward.maximum_coins,
    rewardProgramData.maximum_coins,
  );
  TestValidator.equals(
    "valid from matches",
    createdReward.valid_from,
    rewardProgramData.valid_from,
  );
  TestValidator.equals(
    "valid until matches",
    createdReward.valid_until,
    rewardProgramData.valid_until,
  );
  TestValidator.equals(
    "active status matches",
    createdReward.is_active,
    rewardProgramData.is_active,
  );

  // Step 5: Validate system-generated fields (typia.assert already validates UUID and timestamps)
  TestValidator.predicate(
    "created at timestamp is set",
    createdReward.created_at !== null && createdReward.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated at timestamp is set",
    createdReward.updated_at !== null && createdReward.updated_at !== undefined,
  );
  TestValidator.equals(
    "deleted at is undefined for new program",
    createdReward.deleted_at,
    undefined,
  );

  // Step 6: Validate timestamps are properly set
  const createdAt = new Date(createdReward.created_at);
  const updatedAt = new Date(createdReward.updated_at);

  TestValidator.predicate(
    "created at is valid date",
    !isNaN(createdAt.getTime()),
  );
  TestValidator.predicate(
    "updated at is valid date",
    !isNaN(updatedAt.getTime()),
  );
}
