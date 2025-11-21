import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";

/**
 * Test retrieval of individual configuration settings by administrators.
 *
 * This E2E test validates that administrators can access specific configuration
 * details using exact key matching. It verifies that the complete configuration
 * object is returned including value, data type, description, and metadata. The
 * test also validates proper handling of configuration key validation and error
 * responses for non-existent keys.
 */
export async function test_api_configuration_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      display_name: RandomGenerator.paragraph({ sentences: 2 }),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a test configuration
  const testConfig =
    await api.functional.communityPlatform.admin.configurations.create(
      connection,
      {
        body: {
          key: `test.config.${RandomGenerator.alphaNumeric(8)}`,
          value: "test-value-123",
          data_type: "string",
          description: "Test configuration for E2E testing",
          category: "testing",
          is_sensitive: false,
          is_editable: true,
          default_value: "default-test-value",
          min_value: undefined,
          max_value: undefined,
          validation_regex: undefined,
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(testConfig);

  // Step 3: Retrieve the configuration by key
  const retrievedConfig =
    await api.functional.communityPlatform.admin.configurations.at(connection, {
      configurationKey: testConfig.key,
    });
  typia.assert(retrievedConfig);

  // Step 4: Validate the retrieved configuration matches the created one
  TestValidator.equals(
    "configuration key matches",
    retrievedConfig.key,
    testConfig.key,
  );
  TestValidator.equals(
    "configuration value matches",
    retrievedConfig.value,
    testConfig.value,
  );
  TestValidator.equals(
    "configuration data type matches",
    retrievedConfig.data_type,
    testConfig.data_type,
  );
  TestValidator.equals(
    "configuration description matches",
    retrievedConfig.description,
    testConfig.description,
  );
  TestValidator.equals(
    "configuration category matches",
    retrievedConfig.category,
    testConfig.category,
  );
  TestValidator.equals(
    "configuration sensitive flag matches",
    retrievedConfig.is_sensitive,
    testConfig.is_sensitive,
  );
  TestValidator.equals(
    "configuration editable flag matches",
    retrievedConfig.is_editable,
    testConfig.is_editable,
  );

  // Step 5: Test error handling for non-existent configuration
  await TestValidator.error(
    "retrieving non-existent configuration key should fail",
    async () => {
      await api.functional.communityPlatform.admin.configurations.at(
        connection,
        {
          configurationKey: `nonexistent.config.${RandomGenerator.alphaNumeric(12)}`,
        },
      );
    },
  );
}
