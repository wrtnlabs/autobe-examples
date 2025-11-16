import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test retrieving platform configurations with integer data type.
 *
 * This test validates that platform configurations with integer data types are
 * properly stored and retrieved by the administrator endpoint. The test
 * verifies that configuration values are returned as strings (not numeric
 * types) and that the data_type field correctly identifies integer
 * configurations.
 *
 * Test flow:
 *
 * 1. Create an administrator account with authentication
 * 2. Request an integer configuration with value '100'
 * 3. Validate that the value is returned as a string, not a number
 * 4. Confirm data_type field is set to 'integer'
 * 5. Retrieve another integer configuration with value '24'
 * 6. Test additional integer configuration with different numeric range
 * 7. Verify all configurations maintain proper type representation
 */
export async function test_api_platform_configuration_integer_value_format(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(10),
        username: RandomGenerator.alphabets(5),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2-4: Request integer configuration with value '100'
  const config100: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.at(
      connection,
      {
        configurationKey: "max_posts_per_hour",
      },
    );
  typia.assert(config100);
  TestValidator.equals(
    "configuration data_type should be integer",
    config100.data_type,
    "integer",
  );
  TestValidator.predicate(
    "configuration value should be string type",
    typeof config100.value === "string",
  );
  TestValidator.equals(
    "configuration value should represent integer 100",
    config100.value,
    "100",
  );

  // Step 5-6: Retrieve another integer configuration with value '24'
  const config24: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.at(
      connection,
      {
        configurationKey: "hours_in_day",
      },
    );
  typia.assert(config24);
  TestValidator.equals(
    "second configuration data_type should be integer",
    config24.data_type,
    "integer",
  );
  TestValidator.predicate(
    "second configuration value should be string type",
    typeof config24.value === "string",
  );
  TestValidator.equals(
    "second configuration value should represent integer 24",
    config24.value,
    "24",
  );

  // Step 7: Test additional integer configuration with different range
  const config50: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.at(
      connection,
      {
        configurationKey: "rate_limit_percentage",
      },
    );
  typia.assert(config50);
  TestValidator.equals(
    "third configuration data_type should be integer",
    config50.data_type,
    "integer",
  );
  TestValidator.predicate(
    "third configuration value should be string type",
    typeof config50.value === "string",
  );
  TestValidator.equals(
    "third configuration value should represent integer",
    config50.value,
    "50",
  );

  // Verify all configurations maintain proper type representation
  TestValidator.predicate(
    "all configuration values should be parseable as integers",
    () => {
      const val1 = parseInt(config100.value, 10);
      const val2 = parseInt(config24.value, 10);
      const val3 = parseInt(config50.value, 10);
      return !isNaN(val1) && !isNaN(val2) && !isNaN(val3);
    },
  );
}
