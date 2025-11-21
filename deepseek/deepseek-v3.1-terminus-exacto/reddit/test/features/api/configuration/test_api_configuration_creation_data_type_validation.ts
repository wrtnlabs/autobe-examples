import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";

/**
 * Test comprehensive data type validation during configuration creation.
 *
 * This test validates that the system properly enforces data type constraints
 * for configuration values, including string format validation, numeric range
 * checking, boolean value parsing, and JSON structure validation. The test
 * verifies that invalid data types are rejected while valid configurations are
 * successfully created, ensuring platform stability by preventing malformed
 * configuration values.
 */
export async function test_api_configuration_creation_data_type_validation(
  connection: api.IConnection,
) {
  // Step 1: Establish administrator authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Test string data type configuration creation
  const stringConfig =
    await api.functional.communityPlatform.admin.configurations.create(
      connection,
      {
        body: {
          key: "app.name",
          value: "My Community Platform",
          data_type: "string",
          description: "Application display name",
          category: "general",
          is_sensitive: false,
          is_editable: true,
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(stringConfig);
  TestValidator.equals(
    "string configuration key matches",
    stringConfig.key,
    "app.name",
  );
  TestValidator.equals(
    "string configuration value matches",
    stringConfig.value,
    "My Community Platform",
  );
  TestValidator.equals(
    "string configuration data type",
    stringConfig.data_type,
    "string",
  );

  // Step 3: Test number data type configuration creation with valid range
  const numberConfig =
    await api.functional.communityPlatform.admin.configurations.create(
      connection,
      {
        body: {
          key: "max.login.attempts",
          value: "5",
          data_type: "number",
          description: "Maximum allowed login attempts before lockout",
          category: "security",
          is_sensitive: false,
          is_editable: true,
          min_value: "1",
          max_value: "10",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(numberConfig);
  TestValidator.equals(
    "number configuration key matches",
    numberConfig.key,
    "max.login.attempts",
  );
  TestValidator.equals(
    "number configuration value matches",
    numberConfig.value,
    "5",
  );
  TestValidator.equals(
    "number configuration data type",
    numberConfig.data_type,
    "number",
  );

  // Step 4: Test boolean data type configuration creation
  const booleanConfig =
    await api.functional.communityPlatform.admin.configurations.create(
      connection,
      {
        body: {
          key: "feature.registration.enabled",
          value: "true",
          data_type: "boolean",
          description: "Enable user registration feature",
          category: "features",
          is_sensitive: false,
          is_editable: true,
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(booleanConfig);
  TestValidator.equals(
    "boolean configuration key matches",
    booleanConfig.key,
    "feature.registration.enabled",
  );
  TestValidator.equals(
    "boolean configuration value matches",
    booleanConfig.value,
    "true",
  );
  TestValidator.equals(
    "boolean configuration data type",
    booleanConfig.data_type,
    "boolean",
  );

  // Step 5: Test JSON data type configuration creation
  const jsonConfig =
    await api.functional.communityPlatform.admin.configurations.create(
      connection,
      {
        body: {
          key: "ui.theme.settings",
          value:
            '{"primary": "#007bff", "secondary": "#6c757d", "darkMode": false}',
          data_type: "json",
          description: "UI theme configuration settings",
          category: "ui",
          is_sensitive: false,
          is_editable: true,
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(jsonConfig);
  TestValidator.equals(
    "json configuration key matches",
    jsonConfig.key,
    "ui.theme.settings",
  );
  TestValidator.equals(
    "json configuration data type",
    jsonConfig.data_type,
    "json",
  );

  // Step 6: Test out-of-range number value rejection (business logic error)
  await TestValidator.error(
    "should reject number value outside specified range",
    async () => {
      await api.functional.communityPlatform.admin.configurations.create(
        connection,
        {
          body: {
            key: "invalid.range.config",
            value: "15", // Outside 1-10 range - business logic violation
            data_type: "number",
            description: "This should fail due to range violation",
            category: "test",
            is_sensitive: false,
            is_editable: true,
            min_value: "1",
            max_value: "10",
          } satisfies ICommunityPlatformConfiguration.ICreate,
        },
      );
    },
  );

  // Step 7: Test invalid JSON value rejection (business logic error)
  await TestValidator.error("should reject invalid JSON value", async () => {
    await api.functional.communityPlatform.admin.configurations.create(
      connection,
      {
        body: {
          key: "invalid.json.config",
          value: "{invalid: json}", // Invalid JSON syntax - business logic error
          data_type: "json",
          description: "This should fail due to invalid JSON format",
          category: "test",
          is_sensitive: false,
          is_editable: true,
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  });

  // Step 8: Test duplicate key rejection (business logic error)
  await TestValidator.error(
    "should reject duplicate configuration key",
    async () => {
      await api.functional.communityPlatform.admin.configurations.create(
        connection,
        {
          body: {
            key: "app.name", // Duplicate key from Step 2
            value: "Duplicate App Name",
            data_type: "string",
            description: "This should fail due to duplicate key",
            category: "general",
            is_sensitive: false,
            is_editable: true,
          } satisfies ICommunityPlatformConfiguration.ICreate,
        },
      );
    },
  );

  // Step 9: Verify all created configurations are retrievable and valid
  const configurations = [
    stringConfig,
    numberConfig,
    booleanConfig,
    jsonConfig,
  ];

  for (const config of configurations) {
    TestValidator.predicate(
      `configuration ${config.key} should have valid ID`,
      config.id.length > 0,
    );
    TestValidator.predicate(
      `configuration ${config.key} should have creation timestamp`,
      config.created_at !== null && config.created_at !== undefined,
    );
    TestValidator.predicate(
      `configuration ${config.key} should have update timestamp`,
      config.updated_at !== null && config.updated_at !== undefined,
    );
  }

  // Step 10: Test sensitive configuration creation
  const sensitiveConfig =
    await api.functional.communityPlatform.admin.configurations.create(
      connection,
      {
        body: {
          key: "api.secret.key",
          value: "super-secret-api-key-12345",
          data_type: "string",
          description: "API secret key for external integrations",
          category: "security",
          is_sensitive: true,
          is_editable: false,
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(sensitiveConfig);
  TestValidator.equals(
    "sensitive configuration is marked as sensitive",
    sensitiveConfig.is_sensitive,
    true,
  );
  TestValidator.equals(
    "sensitive configuration is not editable",
    sensitiveConfig.is_editable,
    false,
  );
}
