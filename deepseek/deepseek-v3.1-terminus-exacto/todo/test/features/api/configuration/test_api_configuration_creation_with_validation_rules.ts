import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test configuration creation with comprehensive validation rules to ensure
 * proper validation constraint handling. This test validates that users can
 * create configurations with specific validation rules such as minimum/maximum
 * values, pattern matching, or custom validation logic. It verifies that
 * validation rules are properly stored and can be enforced when configuration
 * values are set. The test also covers edge cases like sensitive configuration
 * flags and required configuration settings that must have values in all
 * environments.
 */
export async function test_api_configuration_creation_with_validation_rules(
  connection: api.IConnection,
) {
  // Step 1: Create a user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "TestPassword123!",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create multiple configuration definitions with different validation rules

  // Boolean configuration with default value
  const booleanConfig = await api.functional.todoApp.user.configurations.create(
    connection,
    {
      body: {
        config_key: "feature_toggle.enable_advanced_features",
        name: "Enable Advanced Features",
        description: "Toggle for enabling advanced features in the application",
        data_type: "boolean",
        default_value: "false",
        validation_rules: JSON.stringify({
          type: "boolean",
        }),
        category: "feature",
        is_sensitive: false,
        is_required: false,
      } satisfies ITodoAppConfiguration.ICreate,
    },
  );
  typia.assert(booleanConfig);
  TestValidator.equals(
    "boolean config key matches input",
    booleanConfig.config_key,
    "feature_toggle.enable_advanced_features",
  );
  TestValidator.equals(
    "boolean config has correct data type",
    booleanConfig.data_type,
    "boolean",
  );
  TestValidator.equals(
    "boolean config has correct default value",
    booleanConfig.default_value,
    "false",
  );

  // Number configuration with minimum/maximum constraints
  const numberConfig = await api.functional.todoApp.user.configurations.create(
    connection,
    {
      body: {
        config_key: "performance.max_concurrent_requests",
        name: "Maximum Concurrent Requests",
        description: "Maximum number of concurrent requests allowed",
        data_type: "number",
        default_value: "10",
        validation_rules: JSON.stringify({
          minimum: 1,
          maximum: 100,
        }),
        category: "performance",
        is_sensitive: false,
        is_required: true,
      } satisfies ITodoAppConfiguration.ICreate,
    },
  );
  typia.assert(numberConfig);
  TestValidator.equals(
    "number config key matches input",
    numberConfig.config_key,
    "performance.max_concurrent_requests",
  );
  TestValidator.equals(
    "number config has correct data type",
    numberConfig.data_type,
    "number",
  );
  TestValidator.equals(
    "number config is marked as required",
    numberConfig.is_required,
    true,
  );

  // String configuration with pattern validation
  const stringConfig = await api.functional.todoApp.user.configurations.create(
    connection,
    {
      body: {
        config_key: "security.allowed_email_domains",
        name: "Allowed Email Domains",
        description: "Regex pattern for allowed email domains",
        data_type: "string",
        default_value: "@example.com$",
        validation_rules: JSON.stringify({
          pattern: "^@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
        }),
        category: "security",
        is_sensitive: false,
        is_required: false,
      } satisfies ITodoAppConfiguration.ICreate,
    },
  );
  typia.assert(stringConfig);
  TestValidator.equals(
    "string config key matches input",
    stringConfig.config_key,
    "security.allowed_email_domains",
  );
  TestValidator.equals(
    "string config has correct data type",
    stringConfig.data_type,
    "string",
  );

  // JSON configuration with custom validation logic
  const jsonConfig = await api.functional.todoApp.user.configurations.create(
    connection,
    {
      body: {
        config_key: "ui.theme_settings",
        name: "Theme Settings",
        description: "JSON configuration for UI theme settings",
        data_type: "json",
        default_value: JSON.stringify({
          primaryColor: "#007bff",
          secondaryColor: "#6c757d",
          fontSize: "14px",
        }),
        validation_rules: JSON.stringify({
          type: "object",
          properties: {
            primaryColor: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
            secondaryColor: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
            fontSize: { type: "string" },
          },
        }),
        category: "ui",
        is_sensitive: false,
        is_required: false,
      } satisfies ITodoAppConfiguration.ICreate,
    },
  );
  typia.assert(jsonConfig);
  TestValidator.equals(
    "json config key matches input",
    jsonConfig.config_key,
    "ui.theme_settings",
  );
  TestValidator.equals(
    "json config has correct data type",
    jsonConfig.data_type,
    "json",
  );

  // Sensitive configuration that requires encryption
  const sensitiveConfig =
    await api.functional.todoApp.user.configurations.create(connection, {
      body: {
        config_key: "security.api_key",
        name: "API Key",
        description: "Sensitive API key for external service integration",
        data_type: "string",
        default_value: "",
        validation_rules: JSON.stringify({
          minLength: 32,
          maxLength: 256,
        }),
        category: "security",
        is_sensitive: true,
        is_required: true,
      } satisfies ITodoAppConfiguration.ICreate,
    });
  typia.assert(sensitiveConfig);
  TestValidator.equals(
    "sensitive config key matches input",
    sensitiveConfig.config_key,
    "security.api_key",
  );
  TestValidator.equals(
    "sensitive config is marked as sensitive",
    sensitiveConfig.is_sensitive,
    true,
  );
  TestValidator.equals(
    "sensitive config is marked as required",
    sensitiveConfig.is_required,
    true,
  );

  // Configuration with null validation rules (edge case)
  const nullValidationConfig =
    await api.functional.todoApp.user.configurations.create(connection, {
      body: {
        config_key: "general.application_name",
        name: "Application Name",
        description: "General application name setting",
        data_type: "string",
        default_value: "Todo Application",
        validation_rules: null,
        category: "general",
        is_sensitive: false,
        is_required: false,
      } satisfies ITodoAppConfiguration.ICreate,
    });
  typia.assert(nullValidationConfig);
  TestValidator.equals(
    "null validation config key matches input",
    nullValidationConfig.config_key,
    "general.application_name",
  );
  TestValidator.equals(
    "null validation config has null validation rules",
    nullValidationConfig.validation_rules,
    null,
  );

  // Step 3: Verify all configurations have unique IDs and proper timestamps
  const configs = [
    booleanConfig,
    numberConfig,
    stringConfig,
    jsonConfig,
    sensitiveConfig,
    nullValidationConfig,
  ];

  // Verify unique IDs
  const configIds = configs.map((config) => config.id);
  const uniqueIds = new Set(configIds);
  TestValidator.equals(
    "all configuration IDs should be unique",
    uniqueIds.size,
    configIds.length,
  );

  // Verify timestamps are set
  configs.forEach((config, index) => {
    TestValidator.predicate(
      `config ${index} should have creation timestamp`,
      config.created_at !== undefined && config.created_at.length > 0,
    );
    TestValidator.predicate(
      `config ${index} should have update timestamp`,
      config.updated_at !== undefined && config.updated_at.length > 0,
    );
  });

  // Step 4: Verify category organization
  const categories = configs.map((config) => config.category);
  TestValidator.predicate(
    "all configurations should have non-empty categories",
    categories.every((category) => category.length > 0),
  );

  // Step 5: Test validation rule parsing (verify JSON parsing works)
  configs.forEach((config, index) => {
    if (
      config.validation_rules !== null &&
      config.validation_rules !== undefined
    ) {
      TestValidator.predicate(
        `config ${index} validation rules should be valid JSON`,
        () => {
          try {
            JSON.parse(config.validation_rules!);
            return true;
          } catch {
            return false;
          }
        },
      );
    }
  });

  // Step 6: Test version numbers are properly assigned
  configs.forEach((config, index) => {
    TestValidator.predicate(
      `config ${index} should have version number`,
      config.version >= 1,
    );
  });

  // Step 7: Test that sensitive configurations are properly flagged
  const sensitiveConfigs = configs.filter((config) => config.is_sensitive);
  TestValidator.equals(
    "should have exactly one sensitive configuration",
    sensitiveConfigs.length,
    1,
  );
  TestValidator.equals(
    "sensitive configuration should be the API key",
    sensitiveConfigs[0].config_key,
    "security.api_key",
  );

  // Step 8: Test that required configurations are properly flagged
  const requiredConfigs = configs.filter((config) => config.is_required);
  TestValidator.equals(
    "should have exactly two required configurations",
    requiredConfigs.length,
    2,
  );
  TestValidator.predicate(
    "required configurations should include performance config",
    requiredConfigs.some(
      (config) => config.config_key === "performance.max_concurrent_requests",
    ),
  );
  TestValidator.predicate(
    "required configurations should include security config",
    requiredConfigs.some((config) => config.config_key === "security.api_key"),
  );
}
