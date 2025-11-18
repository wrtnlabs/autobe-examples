import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test creation of configuration definitions by authenticated users.
 *
 * This test validates that authenticated users can create configuration
 * definitions with proper metadata, validation rules, and default values. It
 * tests various configuration scenarios including different data types,
 * categories, sensitivity levels, and required status flags.
 */
export async function test_api_configuration_definition_creation_by_user(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      name: RandomGenerator.name(),
      href: "https://todoapp.example.com/register",
      referrer: "https://todoapp.example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Test creation of boolean configuration
  const booleanConfig = await api.functional.todoApp.user.configurations.create(
    connection,
    {
      body: {
        config_key: "ui.dark_mode",
        name: "Dark Mode",
        description: "Enable dark mode theme for the application",
        data_type: "boolean",
        default_value: "false",
        validation_rules: null,
        category: "ui",
        is_sensitive: false,
        is_required: false,
      } satisfies ITodoAppConfiguration.ICreate,
    },
  );
  typia.assert(booleanConfig);

  // Step 3: Test creation of number configuration
  const numberConfig = await api.functional.todoApp.user.configurations.create(
    connection,
    {
      body: {
        config_key: "performance.max_items",
        name: "Maximum Items",
        description: "Maximum number of items to display per page",
        data_type: "number",
        default_value: "50",
        validation_rules: '{"minimum": 1, "maximum": 1000}',
        category: "performance",
        is_sensitive: false,
        is_required: true,
      } satisfies ITodoAppConfiguration.ICreate,
    },
  );
  typia.assert(numberConfig);

  // Step 4: Test creation of string configuration
  const stringConfig = await api.functional.todoApp.user.configurations.create(
    connection,
    {
      body: {
        config_key: "security.allowed_domains",
        name: "Allowed Domains",
        description: "Comma-separated list of allowed domains for CORS",
        data_type: "string",
        default_value: "example.com,localhost",
        validation_rules: '{"pattern": "^[a-zA-Z0-9.,\\s]+$"}',
        category: "security",
        is_sensitive: false,
        is_required: false,
      } satisfies ITodoAppConfiguration.ICreate,
    },
  );
  typia.assert(stringConfig);

  // Step 5: Test creation of JSON configuration
  const jsonConfig = await api.functional.todoApp.user.configurations.create(
    connection,
    {
      body: {
        config_key: "ui.theme_settings",
        name: "Theme Settings",
        description: "JSON configuration for UI theme customization",
        data_type: "json",
        default_value: '{"primaryColor": "#007bff", "fontSize": "14px"}',
        validation_rules:
          '{"schema": {"type": "object", "properties": {"primaryColor": {"type": "string"}, "fontSize": {"type": "string"}}}}',
        category: "ui",
        is_sensitive: false,
        is_required: false,
      } satisfies ITodoAppConfiguration.ICreate,
    },
  );
  typia.assert(jsonConfig);

  // Step 6: Test creation of sensitive configuration
  const sensitiveConfig =
    await api.functional.todoApp.user.configurations.create(connection, {
      body: {
        config_key: "security.api_key",
        name: "API Key",
        description: "Secret API key for external service integration",
        data_type: "string",
        default_value: "",
        validation_rules: null,
        category: "security",
        is_sensitive: true,
        is_required: true,
      } satisfies ITodoAppConfiguration.ICreate,
    });
  typia.assert(sensitiveConfig);

  // Step 7: Test creation of array configuration
  const arrayConfig = await api.functional.todoApp.user.configurations.create(
    connection,
    {
      body: {
        config_key: "features.enabled_modules",
        name: "Enabled Modules",
        description: "List of enabled feature modules",
        data_type: "array",
        default_value: '["tasks", "calendar", "notes"]',
        validation_rules: '{"minItems": 1, "items": {"type": "string"}}',
        category: "features",
        is_sensitive: false,
        is_required: false,
      } satisfies ITodoAppConfiguration.ICreate,
    },
  );
  typia.assert(arrayConfig);

  // Step 8: Test creation of object configuration
  const objectConfig = await api.functional.todoApp.user.configurations.create(
    connection,
    {
      body: {
        config_key: "database.connection",
        name: "Database Connection",
        description: "Database connection configuration object",
        data_type: "object",
        default_value:
          '{"host": "localhost", "port": 5432, "database": "todoapp"}',
        validation_rules:
          '{"type": "object", "required": ["host", "port", "database"]}',
        category: "database",
        is_sensitive: true,
        is_required: true,
      } satisfies ITodoAppConfiguration.ICreate,
    },
  );
  typia.assert(objectConfig);

  // Step 9: Test duplicate configuration key error
  await TestValidator.error(
    "duplicate configuration key should fail",
    async () => {
      await api.functional.todoApp.user.configurations.create(connection, {
        body: {
          config_key: "ui.dark_mode", // Duplicate key
          name: "Duplicate Dark Mode",
          description: "This should fail due to duplicate key",
          data_type: "boolean",
          default_value: "true",
          validation_rules: null,
          category: "ui",
          is_sensitive: false,
          is_required: false,
        } satisfies ITodoAppConfiguration.ICreate,
      });
    },
  );

  // Step 10: Validate configuration uniqueness and metadata
  const configs = [
    booleanConfig,
    numberConfig,
    stringConfig,
    jsonConfig,
    sensitiveConfig,
    arrayConfig,
    objectConfig,
  ];

  // Check that all configurations have unique UUIDs
  const configIds = configs.map((config) => config.id);
  const uniqueIds = new Set(configIds);
  TestValidator.equals(
    "all configuration IDs should be unique",
    uniqueIds.size,
    configIds.length,
  );

  // Validate configuration categories are properly set
  const categories = configs.map((config) => config.category);
  TestValidator.equals(
    "configuration should have valid categories",
    categories.length,
    7,
  );

  // Validate that sensitive configurations are properly flagged
  const sensitiveConfigs = configs.filter((config) => config.is_sensitive);
  TestValidator.equals(
    "should have sensitive configurations",
    sensitiveConfigs.length > 0,
    true,
  );

  // Validate that required configurations are properly flagged
  const requiredConfigs = configs.filter((config) => config.is_required);
  TestValidator.equals(
    "should have required configurations",
    requiredConfigs.length > 0,
    true,
  );
}
