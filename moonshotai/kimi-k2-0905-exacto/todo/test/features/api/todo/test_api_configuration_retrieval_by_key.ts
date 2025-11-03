import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoConfiguration";

/**
 * Test successful retrieval of a configuration setting by key.
 *
 * This test validates that users can access both system-level and user-level
 * configurations through the key-based lookup endpoint. The test covers
 * different configuration types including string, number, boolean, and JSON
 * values, ensuring that configuration values match their expected types and
 * that the retrieval operation returns complete configuration data with proper
 * validation.
 *
 * Test flow:
 *
 * 1. Create multiple configuration settings with different types (string, number,
 *    boolean, json)
 * 2. Retrieve each configuration by its unique key
 * 3. Validate that retrieved configuration matches the original data
 * 4. Test access to both system and user-level configurations
 * 5. Verify configuration type and value consistency
 */
export async function test_api_configuration_retrieval_by_key(
  connection: api.IConnection,
) {
  // Create string configuration
  const stringConfig = {
    key: `app_name_${RandomGenerator.alphaNumeric(8)}`,
    value: "Todo Application",
    description: "Application display name",
    type: "string",
    is_system: true,
  } satisfies ITodoConfiguration.ICreate;

  const createdStringConfig = await api.functional.todo.configurations.create(
    connection,
    {
      body: stringConfig,
    },
  );
  typia.assert(createdStringConfig);

  // Create number configuration
  const numberConfig = {
    key: `max_items_${RandomGenerator.alphaNumeric(8)}`,
    value: "100",
    description: "Maximum number of items per page",
    type: "number",
    is_system: false,
  } satisfies ITodoConfiguration.ICreate;

  const createdNumberConfig = await api.functional.todo.configurations.create(
    connection,
    {
      body: numberConfig,
    },
  );
  typia.assert(createdNumberConfig);

  // Create boolean configuration
  const booleanConfig = {
    key: `enable_notifications_${RandomGenerator.alphaNumeric(8)}`,
    value: "true",
    description: "Enable push notifications",
    type: "boolean",
    is_system: true,
  } satisfies ITodoConfiguration.ICreate;

  const createdBooleanConfig = await api.functional.todo.configurations.create(
    connection,
    {
      body: booleanConfig,
    },
  );
  typia.assert(createdBooleanConfig);

  // Create JSON configuration
  const jsonConfig = {
    key: `feature_flags_${RandomGenerator.alphaNumeric(8)}`,
    value: JSON.stringify({
      darkMode: true,
      analytics: false,
      betaFeatures: ["calendar", "reminders"],
    }),
    description: "Feature flag configuration",
    type: "json",
    is_system: false,
  } satisfies ITodoConfiguration.ICreate;

  const createdJsonConfig = await api.functional.todo.configurations.create(
    connection,
    {
      body: jsonConfig,
    },
  );
  typia.assert(createdJsonConfig);

  // Test retrieval of string configuration
  const retrievedStringConfig = await api.functional.todo.configurations.at(
    connection,
    {
      key: createdStringConfig.key,
    },
  );
  typia.assert(retrievedStringConfig);

  TestValidator.equals(
    "string config key matches",
    retrievedStringConfig.key,
    createdStringConfig.key,
  );
  TestValidator.equals(
    "string config value matches",
    retrievedStringConfig.value,
    createdStringConfig.value,
  );
  TestValidator.equals(
    "string config type matches",
    retrievedStringConfig.type,
    createdStringConfig.type,
  );
  TestValidator.equals(
    "string config is_system matches",
    retrievedStringConfig.is_system,
    createdStringConfig.is_system,
  );

  // Test retrieval of number configuration
  const retrievedNumberConfig = await api.functional.todo.configurations.at(
    connection,
    {
      key: createdNumberConfig.key,
    },
  );
  typia.assert(retrievedNumberConfig);

  TestValidator.equals(
    "number config key matches",
    retrievedNumberConfig.key,
    createdNumberConfig.key,
  );
  TestValidator.equals(
    "number config value matches",
    retrievedNumberConfig.value,
    createdNumberConfig.value,
  );
  TestValidator.equals(
    "number config type matches",
    retrievedNumberConfig.type,
    createdNumberConfig.type,
  );
  TestValidator.equals(
    "number config is_system matches",
    retrievedNumberConfig.is_system,
    createdNumberConfig.is_system,
  );

  // Test retrieval of boolean configuration
  const retrievedBooleanConfig = await api.functional.todo.configurations.at(
    connection,
    {
      key: createdBooleanConfig.key,
    },
  );
  typia.assert(retrievedBooleanConfig);

  TestValidator.equals(
    "boolean config key matches",
    retrievedBooleanConfig.key,
    createdBooleanConfig.key,
  );
  TestValidator.equals(
    "boolean config value matches",
    retrievedBooleanConfig.value,
    createdBooleanConfig.value,
  );
  TestValidator.equals(
    "boolean config type matches",
    retrievedBooleanConfig.type,
    createdBooleanConfig.type,
  );
  TestValidator.equals(
    "boolean config is_system matches",
    retrievedBooleanConfig.is_system,
    createdBooleanConfig.is_system,
  );

  // Test retrieval of JSON configuration
  const retrievedJsonConfig = await api.functional.todo.configurations.at(
    connection,
    {
      key: createdJsonConfig.key,
    },
  );
  typia.assert(retrievedJsonConfig);

  TestValidator.equals(
    "json config key matches",
    retrievedJsonConfig.key,
    createdJsonConfig.key,
  );
  TestValidator.equals(
    "json config value matches",
    retrievedJsonConfig.value,
    createdJsonConfig.value,
  );
  TestValidator.equals(
    "json config type matches",
    retrievedJsonConfig.type,
    createdJsonConfig.type,
  );
  TestValidator.equals(
    "json config is_system matches",
    retrievedJsonConfig.is_system,
    createdJsonConfig.is_system,
  );

  // Test access to non-existent configuration
  await TestValidator.error(
    "should fail for non-existent configuration key",
    async () => {
      await api.functional.todo.configurations.at(connection, {
        key: `non_existent_${RandomGenerator.alphaNumeric(8)}`,
      });
    },
  );
}
