import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";

export async function test_api_system_configuration_create_float_type(
  connection: api.IConnection,
) {
  // Generate test data for a float-type system configuration
  const configKey = `discount_rate_${RandomGenerator.alphaNumeric(8)}`;
  const configValue = "0.95"; // String representation of a float value
  const description =
    "Discount rate for bulk orders - represents 5% off pricing";

  // Create the system configuration with float type
  const config = await api.functional.todoList.systemConfigurations.create(
    connection,
    {
      body: {
        config_key: configKey,
        config_value: configValue,
        value_type: "float",
        description: description,
      } satisfies ITodoListSystemConfig.ICreate,
    },
  );

  // Validate the response - typia.assert() performs complete type and format validation
  typia.assert(config);

  // Verify that the configuration was created with the correct input values
  TestValidator.equals(
    "config key matches input",
    config.config_key,
    configKey,
  );
  TestValidator.equals(
    "config value matches input",
    config.config_value,
    configValue,
  );
  TestValidator.equals("value type is float", config.value_type, "float");
  TestValidator.equals(
    "description matches input",
    config.description,
    description,
  );

  // Verify system-generated fields have expected initial values
  TestValidator.equals("initial version is 1", config.version, 1);
  TestValidator.equals(
    "created_at and updated_at are equal on creation",
    config.created_at,
    config.updated_at,
  );
}
