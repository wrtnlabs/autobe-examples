import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";

/**
 * Test creation of new system configuration settings with proper data type
 * validation and unique key enforcement. Validates that configuration settings
 * can be created with various data types including string, boolean, number, and
 * json formats.
 */
export async function test_api_configuration_creation_by_admin(
  connection: api.IConnection,
) {
  // Test 1: Create configuration with string data type
  const stringConfig = await api.functional.todoApp.configurations.create(
    connection,
    {
      body: {
        config_key: `test.string.config.${RandomGenerator.alphaNumeric(8)}`,
        config_value: "Test string configuration value",
        data_type: "string",
        description: "Test configuration for string data type validation",
        status: "active",
      } satisfies ITodoAppConfiguration.ICreate,
    },
  );
  typia.assert(stringConfig);
  TestValidator.equals(
    "string config data type",
    stringConfig.data_type,
    "string",
  );
  TestValidator.equals("string config status", stringConfig.status, "active");

  // Test 2: Create configuration with boolean data type
  const booleanConfig = await api.functional.todoApp.configurations.create(
    connection,
    {
      body: {
        config_key: `test.boolean.config.${RandomGenerator.alphaNumeric(8)}`,
        config_value: "true",
        data_type: "boolean",
        description: "Test configuration for boolean data type validation",
        status: "active",
      } satisfies ITodoAppConfiguration.ICreate,
    },
  );
  typia.assert(booleanConfig);
  TestValidator.equals(
    "boolean config data type",
    booleanConfig.data_type,
    "boolean",
  );

  // Test 3: Create configuration with number data type
  const numberConfig = await api.functional.todoApp.configurations.create(
    connection,
    {
      body: {
        config_key: `test.number.config.${RandomGenerator.alphaNumeric(8)}`,
        config_value: "42",
        data_type: "number",
        description: "Test configuration for number data type validation",
        status: "disabled",
      } satisfies ITodoAppConfiguration.ICreate,
    },
  );
  typia.assert(numberConfig);
  TestValidator.equals(
    "number config data type",
    numberConfig.data_type,
    "number",
  );
  TestValidator.equals("number config status", numberConfig.status, "disabled");

  // Test 4: Create configuration with json data type
  const jsonConfig = await api.functional.todoApp.configurations.create(
    connection,
    {
      body: {
        config_key: `test.json.config.${RandomGenerator.alphaNumeric(8)}`,
        config_value: '{"enabled": true, "maxRetries": 3}',
        data_type: "json",
        description: "Test configuration for json data type validation",
        status: "active",
      } satisfies ITodoAppConfiguration.ICreate,
    },
  );
  typia.assert(jsonConfig);
  TestValidator.equals("json config data type", jsonConfig.data_type, "json");

  // Test 5: Verify unique key constraint enforcement
  await TestValidator.error("duplicate config key should fail", async () => {
    await api.functional.todoApp.configurations.create(connection, {
      body: {
        config_key: stringConfig.config_key,
        config_value: "Duplicate key test",
        data_type: "string",
        description: "Attempt to create duplicate configuration key",
        status: "active",
      } satisfies ITodoAppConfiguration.ICreate,
    });
  });

  // Test 6: Create configuration with deprecated status
  const deprecatedConfig = await api.functional.todoApp.configurations.create(
    connection,
    {
      body: {
        config_key: `test.deprecated.config.${RandomGenerator.alphaNumeric(8)}`,
        config_value: "Deprecated configuration value",
        data_type: "string",
        description: "Test configuration with deprecated status",
        status: "deprecated",
      } satisfies ITodoAppConfiguration.ICreate,
    },
  );
  typia.assert(deprecatedConfig);
  TestValidator.equals(
    "deprecated config status",
    deprecatedConfig.status,
    "deprecated",
  );

  // Validate all configurations have proper structure
  const allConfigs = [
    stringConfig,
    booleanConfig,
    numberConfig,
    jsonConfig,
    deprecatedConfig,
  ];

  for (const config of allConfigs) {
    TestValidator.predicate(
      "config has UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        config.id,
      ),
    );
    TestValidator.predicate(
      "config has valid created_at timestamp",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(config.created_at),
    );
    TestValidator.predicate(
      "config has valid updated_at timestamp",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(config.updated_at),
    );
    TestValidator.predicate(
      "config has non-empty description",
      config.description.length > 0,
    );
    TestValidator.predicate(
      "config has non-empty config_key",
      config.config_key.length > 0,
    );
    TestValidator.predicate(
      "config has non-empty config_value",
      config.config_value.length > 0,
    );
  }
}
