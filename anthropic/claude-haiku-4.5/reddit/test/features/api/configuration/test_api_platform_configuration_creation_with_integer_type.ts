import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test creation of integer-type platform configuration settings.
 *
 * This test validates that administrators can create configurations storing
 * numeric values with integer data type specification. The test verifies that
 * integer configurations are created with data_type set to 'integer', that
 * numeric values are stored as strings (e.g., '24', '100'), and that the
 * configuration correctly represents numeric thresholds like
 * 'max_posts_per_hour' or 'min_karma_to_post'.
 *
 * Test workflow:
 *
 * 1. Authenticate as platform administrator
 * 2. Create an integer-type configuration entry
 * 3. Verify the configuration response structure and data
 * 4. Validate that data_type is 'integer' and value is string-formatted
 * 5. Confirm the configuration is properly registered in the system
 */
export async function test_api_platform_configuration_creation_with_integer_type(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as platform administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "StrongPassword123!";
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminName = RandomGenerator.name();

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: adminName,
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000/admin",
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.equals(
    "administrator authenticated successfully",
    admin.account_status,
    "active",
  );

  // Step 2: Create an integer-type configuration
  const configKey = "max_posts_per_hour";
  const configValue = "24";
  const configDescription =
    "Maximum number of posts a user can create per hour";

  const configuration: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.create(
      connection,
      {
        body: {
          key: configKey,
          value: configValue,
          description: configDescription,
          data_type: "integer",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(configuration);

  // Step 3: Validate configuration response structure
  TestValidator.equals(
    "configuration key matches input",
    configuration.key,
    configKey,
  );
  TestValidator.equals(
    "configuration value stored as string",
    configuration.value,
    configValue,
  );
  TestValidator.equals(
    "configuration data_type is integer",
    configuration.data_type,
    "integer",
  );
  TestValidator.equals(
    "configuration description matches input",
    configuration.description,
    configDescription,
  );

  // Step 4: Verify configuration has all required fields
  TestValidator.predicate("configuration has valid UUID id", () => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(configuration.id);
  });

  TestValidator.predicate(
    "configuration created_at is valid ISO datetime",
    () => {
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
      return isoDateRegex.test(configuration.created_at);
    },
  );

  TestValidator.predicate(
    "configuration updated_at is valid ISO datetime",
    () => {
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
      return isoDateRegex.test(configuration.updated_at);
    },
  );

  // Step 5: Verify integer value representation
  TestValidator.predicate(
    "configuration value can be parsed as integer",
    () => {
      const parsedValue = parseInt(configuration.value, 10);
      return (
        !isNaN(parsedValue) && parsedValue.toString() === configuration.value
      );
    },
  );

  // Step 6: Create another integer configuration to verify consistency
  const secondConfigKey = "min_karma_to_post";
  const secondConfigValue = "100";
  const secondConfigDescription =
    "Minimum karma required to post in the community";

  const secondConfiguration: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.create(
      connection,
      {
        body: {
          key: secondConfigKey,
          value: secondConfigValue,
          description: secondConfigDescription,
          data_type: "integer",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(secondConfiguration);

  TestValidator.equals(
    "second configuration data_type is integer",
    secondConfiguration.data_type,
    "integer",
  );
  TestValidator.equals(
    "second configuration value is string",
    secondConfiguration.value,
    secondConfigValue,
  );
  TestValidator.notEquals(
    "configurations have different IDs",
    configuration.id,
    secondConfiguration.id,
  );
}
