import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";

export async function test_api_system_configuration_retrieve_float_value(
  connection: api.IConnection,
) {
  // Step 1: Create a float-type system configuration entry
  const configKey = "discount_rate";
  const configValue = "0.95";

  const createdConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: configKey,
        config_value: configValue,
        value_type: "float",
        description: "Discount rate configuration for applying discounts",
      } satisfies ITodoListSystemConfig.ICreate,
    });
  typia.assert(createdConfig);

  // Validate the created configuration has correct properties
  TestValidator.equals(
    "created config key matches input",
    createdConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "created config value matches input",
    createdConfig.config_value,
    configValue,
  );
  TestValidator.equals(
    "created config value_type is float",
    createdConfig.value_type,
    "float",
  );
  TestValidator.predicate(
    "created config has version 1",
    createdConfig.version === 1,
  );
  TestValidator.predicate(
    "created config has non-null id",
    createdConfig.id !== null && createdConfig.id !== undefined,
  );

  // Step 2: Retrieve the configuration by key
  const retrievedConfig = await api.functional.todoList.systemConfigurations.at(
    connection,
    {
      configKey: configKey,
    },
  );
  typia.assert(retrievedConfig);

  // Step 3: Validate retrieved configuration matches created configuration
  TestValidator.equals(
    "retrieved config id matches created config id",
    retrievedConfig.id,
    createdConfig.id,
  );
  TestValidator.equals(
    "retrieved config key matches",
    retrievedConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "retrieved config value matches",
    retrievedConfig.config_value,
    configValue,
  );
  TestValidator.equals(
    "retrieved config value_type is float",
    retrievedConfig.value_type,
    "float",
  );
  TestValidator.equals(
    "retrieved config version matches",
    retrievedConfig.version,
    createdConfig.version,
  );
  TestValidator.predicate(
    "retrieved config created_at is valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedConfig.created_at),
  );
  TestValidator.predicate(
    "retrieved config updated_at is valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedConfig.updated_at),
  );
}
