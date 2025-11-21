import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";

/**
 * Test the system's ability to prevent duplicate configuration key creation.
 *
 * This E2E test validates the unique key constraint enforcement by attempting
 * to create a configuration with an existing key identifier. The test verifies
 * that the system properly rejects duplicate key entries with appropriate error
 * responses while maintaining data integrity.
 */
export async function test_api_configuration_creation_duplicate_key_prevention(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate an administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create initial configuration with unique key
  const configurationKey = RandomGenerator.alphaNumeric(10);
  const initialConfiguration: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.admin.configurations.create(
      connection,
      {
        body: {
          key: configurationKey,
          value: "initial configuration value",
          data_type: "string",
          description: "Initial configuration for duplicate key testing",
          category: "testing",
          is_sensitive: false,
          is_editable: true,
          default_value: "default value",
          min_value: "0",
          max_value: "100",
          validation_regex: "^[a-zA-Z0-9 ]+$",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(initialConfiguration);
  TestValidator.equals(
    "initial configuration key matches input",
    initialConfiguration.key,
    configurationKey,
  );

  // Step 3: Attempt to create duplicate configuration with same key but different values
  await TestValidator.error(
    "duplicate configuration key should be rejected",
    async () => {
      await api.functional.communityPlatform.admin.configurations.create(
        connection,
        {
          body: {
            key: configurationKey, // Same key as initial configuration
            value: "duplicate configuration value",
            data_type: "number", // Different data type to test constraint enforcement
            description:
              "Attempted duplicate configuration with different properties",
            category: "duplicate_test",
            is_sensitive: true,
            is_editable: false,
          } satisfies ICommunityPlatformConfiguration.ICreate,
        },
      );
    },
  );

  // Step 4: Create another configuration with different key to ensure system still works
  const differentKey = RandomGenerator.alphaNumeric(10);
  const differentConfiguration: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.admin.configurations.create(
      connection,
      {
        body: {
          key: differentKey,
          value: "different configuration value",
          data_type: "boolean",
          description:
            "Configuration with different key to verify system functionality",
          category: "verification",
          is_sensitive: false,
          is_editable: true,
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(differentConfiguration);
  TestValidator.equals(
    "different configuration key matches input",
    differentConfiguration.key,
    differentKey,
  );
  TestValidator.notEquals(
    "different configuration should have different key",
    differentConfiguration.key,
    configurationKey,
  );
}
