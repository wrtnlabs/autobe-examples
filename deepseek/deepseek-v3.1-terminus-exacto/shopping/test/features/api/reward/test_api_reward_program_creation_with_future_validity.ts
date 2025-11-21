import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallReward } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReward";

/**
 * Test creation of a reward program with future validity period to validate
 * scheduled activation functionality.
 *
 * This test validates that administrators can create reward programs with
 * future start dates, ensuring the program remains inactive until the specified
 * activation time while maintaining all program configuration integrity. The
 * API should automatically handle activation status based on the valid_from
 * date rather than requiring manual is_active setting.
 */
export async function test_api_reward_program_creation_with_future_validity(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({ manage_rewards: true }),
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create reward program with future validity period
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const rewardProgram = await api.functional.shoppingMall.admin.rewards.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        reward_type: "purchase_based",
        earning_rules: JSON.stringify({
          rate_per_dollar: 10,
          eligible_categories: ["electronics", "clothing"],
        }),
        redemption_rules: JSON.stringify({
          minimum_coins: 100,
          discount_percentage: 10,
        }),
        coin_value: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
        minimum_purchase: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        maximum_coins: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<10000>
        >(),
        valid_from: tomorrow,
        valid_until: nextWeek,
        is_active: true, // Let API handle activation logic based on valid_from
      } satisfies IShoppingMallReward.ICreate,
    },
  );
  typia.assert(rewardProgram);

  // Step 3: Validate program creation and future scheduling
  TestValidator.equals(
    "program ID should be generated",
    typeof rewardProgram.id,
    "string",
  );
  TestValidator.equals(
    "program name should not be empty",
    rewardProgram.name.length > 0,
    true,
  );
  TestValidator.equals(
    "program should be inactive due to future start date",
    rewardProgram.is_active,
    false,
  );
  TestValidator.equals(
    "valid_from should be set to tomorrow",
    rewardProgram.valid_from,
    tomorrow,
  );
  TestValidator.equals(
    "valid_until should be set to next week",
    rewardProgram.valid_until,
    nextWeek,
  );
  TestValidator.predicate(
    "created_at should be recent",
    new Date(rewardProgram.created_at).getTime() > Date.now() - 60000,
  );
  TestValidator.predicate(
    "updated_at should match created_at for new program",
    rewardProgram.updated_at === rewardProgram.created_at,
  );
  TestValidator.equals(
    "deleted_at should be undefined for new program",
    rewardProgram.deleted_at,
    undefined,
  );

  // Step 4: Validate business logic for future activation
  const currentTime = new Date().toISOString();
  TestValidator.predicate(
    "valid_from should be in the future",
    rewardProgram.valid_from > currentTime,
  );
  TestValidator.predicate(
    "valid_until should be after valid_from",
    rewardProgram.valid_until! > rewardProgram.valid_from,
  );

  // Step 5: Validate JSON rule configurations with proper error handling
  try {
    const earningRules = JSON.parse(rewardProgram.earning_rules);
    TestValidator.equals(
      "earning rules should contain rate_per_dollar",
      typeof earningRules.rate_per_dollar,
      "number",
    );
    TestValidator.predicate(
      "earning rules should contain eligible_categories array",
      Array.isArray(earningRules.eligible_categories),
    );
  } catch {
    throw new Error("Failed to parse earning_rules JSON");
  }

  try {
    const redemptionRules = JSON.parse(rewardProgram.redemption_rules);
    TestValidator.equals(
      "redemption rules should contain minimum_coins",
      typeof redemptionRules.minimum_coins,
      "number",
    );
    TestValidator.equals(
      "redemption rules should contain discount_percentage",
      typeof redemptionRules.discount_percentage,
      "number",
    );
  } catch {
    throw new Error("Failed to parse redemption_rules JSON");
  }

  // Step 6: Validate scheduling functionality
  TestValidator.predicate(
    "program creation timestamp should be before valid_from",
    rewardProgram.created_at < rewardProgram.valid_from,
  );
  TestValidator.predicate(
    "program should have valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      rewardProgram.id,
    ),
  );
}
