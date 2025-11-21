import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallReward } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReward";

/**
 * Test successful retrieval of reward program details by authenticated
 * administrator.
 *
 * Validates the complete administrative workflow for reward program management:
 *
 * 1. Administrator authentication and authorization establishment
 * 2. Creation of comprehensive reward program configuration
 * 3. Accurate retrieval and validation of all program details
 * 4. Data integrity verification between creation and retrieval operations
 */
export async function test_api_reward_program_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const administrator = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "super_admin",
      permissions: JSON.stringify({
        reward_management: true,
        user_management: true,
        system_configuration: true,
      }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(administrator);

  // Step 2: Create comprehensive reward program
  const rewardProgramData = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    reward_type: "purchase_based",
    earning_rules: JSON.stringify({
      earning_rate: 0.1,
      minimum_purchase: 10000,
      eligible_categories: ["electronics", "clothing", "home"],
      max_earning_per_transaction: 1000,
    }),
    redemption_rules: JSON.stringify({
      minimum_redemption: 100,
      redemption_rate: 0.01,
      eligible_products: "all",
      max_discount_per_order: 5000,
    }),
    coin_value: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
    >(),
    minimum_purchase: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<50000>
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
    {
      body: rewardProgramData,
    },
  );
  typia.assert(createdReward);

  // Step 3: Retrieve the created reward program
  const retrievedReward = await api.functional.shoppingMall.admin.rewards.at(
    connection,
    {
      rewardId: createdReward.id,
    },
  );
  typia.assert(retrievedReward);

  // Step 4: Validate all program details are accurately preserved
  TestValidator.equals(
    "program ID matches",
    retrievedReward.id,
    createdReward.id,
  );
  TestValidator.equals(
    "program name matches",
    retrievedReward.name,
    rewardProgramData.name,
  );
  TestValidator.equals(
    "program description matches",
    retrievedReward.description,
    rewardProgramData.description,
  );
  TestValidator.equals(
    "reward type matches",
    retrievedReward.reward_type,
    rewardProgramData.reward_type,
  );
  TestValidator.equals(
    "earning rules JSON matches",
    retrievedReward.earning_rules,
    rewardProgramData.earning_rules,
  );
  TestValidator.equals(
    "redemption rules JSON matches",
    retrievedReward.redemption_rules,
    rewardProgramData.redemption_rules,
  );
  TestValidator.equals(
    "coin value matches",
    retrievedReward.coin_value,
    rewardProgramData.coin_value,
  );
  TestValidator.equals(
    "minimum purchase matches",
    retrievedReward.minimum_purchase,
    rewardProgramData.minimum_purchase,
  );
  TestValidator.equals(
    "maximum coins matches",
    retrievedReward.maximum_coins,
    rewardProgramData.maximum_coins,
  );
  TestValidator.equals(
    "valid from date matches",
    retrievedReward.valid_from,
    rewardProgramData.valid_from,
  );
  TestValidator.equals(
    "valid until date matches",
    retrievedReward.valid_until,
    rewardProgramData.valid_until,
  );
  TestValidator.equals(
    "active status matches",
    retrievedReward.is_active,
    rewardProgramData.is_active,
  );

  // Validate system-generated timestamps
  TestValidator.predicate(
    "created_at timestamp exists",
    retrievedReward.created_at !== null &&
      retrievedReward.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    retrievedReward.updated_at !== null &&
      retrievedReward.updated_at !== undefined,
  );
  TestValidator.predicate(
    "deleted_at is null for active program",
    retrievedReward.deleted_at === null ||
      retrievedReward.deleted_at === undefined,
  );
}
