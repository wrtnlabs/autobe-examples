import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test updating integer-type configuration values to different numeric
 * thresholds.
 *
 * This scenario validates that administrators can adjust numeric configuration
 * settings like rate limits and minimum karma requirements. The test creates an
 * integer configuration with an initial value, then updates it to different
 * numeric values and verifies each update is applied correctly.
 *
 * Steps:
 *
 * 1. Administrator authentication
 * 2. Create an integer configuration (max_posts_per_hour) with initial value '24'
 * 3. Update configuration to higher threshold '48'
 * 4. Verify the update was applied correctly
 * 5. Update configuration to lower threshold '12'
 * 6. Verify the final update was applied correctly
 * 7. Validate that integer values are stored as strings representing numeric
 *    values
 */
export async function test_api_platform_configuration_update_integer_value_modification(
  connection: api.IConnection,
) {
  // Step 1: Administrator authentication
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Create an integer configuration with initial value
  const configKey = "max_posts_per_hour";
  const initialValue = "24";

  const created =
    await api.functional.communityPlatform.administrator.configurations.create(
      connection,
      {
        body: {
          key: configKey,
          value: initialValue,
          description: "Maximum number of posts an user can create per hour",
          data_type: "integer",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(created);

  TestValidator.equals("created configuration key", created.key, configKey);
  TestValidator.equals(
    "created configuration value",
    created.value,
    initialValue,
  );
  TestValidator.equals(
    "created configuration data type",
    created.data_type,
    "integer",
  );

  // Step 3: Update configuration to higher threshold
  const highValue = "48";
  const updatedHigh =
    await api.functional.communityPlatform.administrator.configurations.update(
      connection,
      {
        configurationKey: configKey,
        body: {
          value: highValue,
          description: "Maximum posts per hour increased to handle higher load",
        } satisfies ICommunityPlatformConfiguration.IUpdate,
      },
    );
  typia.assert(updatedHigh);

  // Step 4: Verify the higher threshold update
  TestValidator.equals("updated configuration key", updatedHigh.key, configKey);
  TestValidator.equals(
    "updated configuration value to 48",
    updatedHigh.value,
    highValue,
  );
  TestValidator.notEquals(
    "updated timestamp changed",
    updatedHigh.updated_at,
    created.updated_at,
  );

  // Step 5: Update configuration to lower threshold
  const lowValue = "12";
  const updatedLow =
    await api.functional.communityPlatform.administrator.configurations.update(
      connection,
      {
        configurationKey: configKey,
        body: {
          value: lowValue,
          description: "Maximum posts per hour reduced to limit spam",
        } satisfies ICommunityPlatformConfiguration.IUpdate,
      },
    );
  typia.assert(updatedLow);

  // Step 6: Verify the lower threshold update
  TestValidator.equals(
    "final updated configuration key",
    updatedLow.key,
    configKey,
  );
  TestValidator.equals(
    "final updated configuration value to 12",
    updatedLow.value,
    lowValue,
  );
  TestValidator.notEquals(
    "final updated timestamp changed",
    updatedLow.updated_at,
    updatedHigh.updated_at,
  );

  // Step 7: Validate integer value storage and type
  TestValidator.predicate(
    "value is stored as string representing integer",
    () => {
      const numValue = parseInt(updatedLow.value, 10);
      return !isNaN(numValue) && numValue.toString() === updatedLow.value;
    },
  );

  TestValidator.predicate("all threshold values are valid integers", () => {
    const vals = [initialValue, highValue, lowValue].map((v) =>
      parseInt(v, 10),
    );
    return vals.every((v) => !isNaN(v) && v > 0);
  });
}
