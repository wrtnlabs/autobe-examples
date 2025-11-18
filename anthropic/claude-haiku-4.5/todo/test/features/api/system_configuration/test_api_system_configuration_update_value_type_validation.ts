import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";
import type { ITodoListSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfiguration";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_system_configuration_update_value_type_validation(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new user
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // 2. Create a system configuration with value_type 'integer'
  const configKey = `test_integer_config_${RandomGenerator.alphaNumeric(8)}`;
  const initialIntValue = "42";
  const config: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: configKey,
        config_value: initialIntValue,
        value_type: "integer",
        description: "Test integer configuration for type validation",
      } satisfies ITodoListSystemConfig.ICreate,
    });
  typia.assert(config);
  TestValidator.equals(
    "config created with correct key",
    config.config_key,
    configKey,
  );
  TestValidator.equals(
    "config created with correct value",
    config.config_value,
    initialIntValue,
  );
  TestValidator.equals(
    "config created with integer type",
    config.value_type,
    "integer",
  );

  // 3. Attempt to update the configuration with an invalid string value
  await TestValidator.error(
    "should reject update with non-integer value for integer-type configuration",
    async () => {
      await api.functional.todoList.user.systemConfigurations.update(
        connection,
        {
          configKey: configKey,
          body: {
            config_value: "not_a_number",
            description: "Invalid update with string value",
          } satisfies ITodoListSystemConfiguration.IUpdate,
        },
      );
    },
  );
}
