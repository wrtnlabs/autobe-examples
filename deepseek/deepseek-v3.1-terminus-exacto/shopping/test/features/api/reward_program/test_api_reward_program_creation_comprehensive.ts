import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallReward } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReward";

/**
 * Comprehensive test for reward program creation with all optional
 * configuration parameters.
 *
 * This test validates that administrators can create reward programs with
 * complete configuration including optional fields such as minimum purchase
 * amount, maximum coin limits, and validity periods. It ensures that business
 * logic for purchase thresholds and coin limits is correctly implemented and
 * that all program features can be properly configured through the creation
 * API.
 */
export async function test_api_reward_program_creation_comprehensive(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({
        can_create_rewards: true,
        can_manage_rewards: true,
      }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create comprehensive reward program with all optional parameters
  const rewardProgramData = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 2, wordMax: 5 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    reward_type: "purchase_based",
    earning_rules: JSON.stringify({
      rate_per_dollar: 1,
      eligible_categories: ["electronics", "clothing", "home"],
      minimum_transaction: 50,
    }),
    redemption_rules: JSON.stringify({
      minimum_coins: 100,
      discount_percentage: 10,
      eligible_products: "all",
      max_redemption_per_order: 500,
    }),
    coin_value: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
    >(),
    minimum_purchase: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<1000>
    >(),
    maximum_coins: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<5000>
    >(),
    valid_from: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    valid_until: new Date(Date.now() + 2592000000).toISOString(), // 30 days from now
    is_active: true,
  } satisfies IShoppingMallReward.ICreate;

  const createdReward = await api.functional.shoppingMall.admin.rewards.create(
    connection,
    { body: rewardProgramData },
  );
  typia.assert(createdReward);

  // Step 3: Validate that all configuration parameters were properly stored
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
    "minimum purchase amount matches",
    createdReward.minimum_purchase,
    rewardProgramData.minimum_purchase,
  );
  TestValidator.equals(
    "maximum coins limit matches",
    createdReward.maximum_coins,
    rewardProgramData.maximum_coins,
  );
  TestValidator.equals(
    "valid from date matches",
    createdReward.valid_from,
    rewardProgramData.valid_from,
  );
  TestValidator.equals(
    "valid until date matches",
    createdReward.valid_until,
    rewardProgramData.valid_until,
  );
  TestValidator.equals(
    "active status matches",
    createdReward.is_active,
    rewardProgramData.is_active,
  );

  // Step 4: Validate business logic constraints
  TestValidator.predicate(
    "coin value should be positive",
    createdReward.coin_value > 0,
  );
  TestValidator.predicate(
    "minimum purchase should be reasonable",
    createdReward.minimum_purchase !== undefined &&
      createdReward.minimum_purchase >= 10,
  );
  TestValidator.predicate(
    "maximum coins should be reasonable",
    createdReward.maximum_coins !== undefined &&
      createdReward.maximum_coins >= createdReward.coin_value,
  );
  TestValidator.predicate(
    "valid from should be before valid until",
    new Date(createdReward.valid_from) < new Date(createdReward.valid_until!),
  );

  // Step 5: Validate system-generated fields (typia.assert already validates these)
  TestValidator.predicate(
    "created_at should be set",
    createdReward.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at should be set",
    createdReward.updated_at !== undefined,
  );
  TestValidator.equals(
    "deleted_at should be undefined for new program",
    createdReward.deleted_at,
    undefined,
  );
}
