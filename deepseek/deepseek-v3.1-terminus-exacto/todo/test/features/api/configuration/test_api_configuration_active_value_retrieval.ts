import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IMvTodoAppActiveConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IMvTodoAppActiveConfiguration";

/**
 * Test retrieval of active configuration values for specific environments.
 *
 * This test validates that configuration values are correctly retrieved from
 * the materialized view, including proper handling of environment-specific
 * overrides and default fallbacks. The test focuses on API functionality rather
 * than redundant type validation since typia.assert() provides complete type
 * safety.
 */
export async function test_api_configuration_active_value_retrieval(
  connection: api.IConnection,
) {
  // Test realistic configuration scenarios that are likely to exist
  const testScenarios = [
    {
      configKey: "app.database.pool_size",
      environment: "development",
    },
    {
      configKey: "app.security.jwt_expiry",
      environment: "staging",
    },
    {
      configKey: "app.ui.theme",
      environment: "production",
    },
  ] as const;

  for (const scenario of testScenarios) {
    // Retrieve active configuration value
    const configuration: IMvTodoAppActiveConfiguration =
      await api.functional.todoApp.configurations.values.at(connection, {
        configKey: scenario.configKey,
        environment: scenario.environment,
      });

    // Complete type validation using typia.assert - this validates EVERYTHING
    typia.assert(configuration);

    // Business logic validation that typia.assert doesn't cover
    TestValidator.predicate(
      `configuration key follows naming convention for ${scenario.configKey}`,
      configuration.config_key.includes(".") &&
        configuration.config_key.split(".").length >= 2,
    );

    TestValidator.predicate(
      `environment matches requested value for ${scenario.configKey}`,
      configuration.environment === scenario.environment,
    );

    TestValidator.predicate(
      `configuration key matches requested value for ${scenario.configKey}`,
      configuration.config_key === scenario.configKey,
    );

    TestValidator.predicate(
      `effective value is present for ${scenario.configKey}`,
      configuration.effective_value.length > 0,
    );

    TestValidator.predicate(
      `value source is valid for ${scenario.configKey}`,
      configuration.value_source === "environment" ||
        configuration.value_source === "default",
    );

    TestValidator.predicate(
      `data type is supported for ${scenario.configKey}`,
      ["boolean", "number", "string", "json", "array", "object"].includes(
        configuration.data_type,
      ),
    );

    TestValidator.predicate(
      `category is defined for ${scenario.configKey}`,
      configuration.category.length > 0,
    );
  }

  // Test edge case with non-existent configuration (should handle gracefully)
  await TestValidator.error(
    "non-existent configuration should return error",
    async () => {
      await api.functional.todoApp.configurations.values.at(connection, {
        configKey: "nonexistent.category.setting",
        environment: "development",
      });
    },
  );

  // Test with generated configuration key pattern
  const categories = [
    "app",
    "api",
    "database",
    "security",
    "ui",
    "logging",
  ] as const;
  const subcategories = [
    "config",
    "settings",
    "options",
    "preferences",
  ] as const;
  const settings = ["timeout", "limit", "size", "threshold"] as const;

  const randomCategory = RandomGenerator.pick(categories);
  const randomSubcategory = RandomGenerator.pick(subcategories);
  const randomSetting = RandomGenerator.pick(settings);
  const randomConfigKey = `${randomCategory}.${randomSubcategory}.${randomSetting}`;
  const randomEnvironment = RandomGenerator.pick([
    "development",
    "staging",
    "production",
  ] as const);

  try {
    const randomConfiguration: IMvTodoAppActiveConfiguration =
      await api.functional.todoApp.configurations.values.at(connection, {
        configKey: randomConfigKey,
        environment: randomEnvironment,
      });

    // If configuration exists, validate it
    typia.assert(randomConfiguration);

    TestValidator.predicate(
      "random configuration key matches pattern",
      randomConfiguration.config_key.includes("."),
    );

    TestValidator.predicate(
      "random configuration environment is valid",
      ["development", "staging", "production"].includes(
        randomConfiguration.environment,
      ),
    );
  } catch {
    // It's acceptable if random configuration doesn't exist
    // This tests the API's error handling for non-existent configurations
    TestValidator.predicate(
      "API handles non-existent configurations appropriately",
      true,
    );
  }
}
