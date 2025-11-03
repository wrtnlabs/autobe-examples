import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoConfiguration";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

export async function test_api_configuration_update_different_types(
  connection: api.IConnection,
) {
  // Step 1: Register a new user to get authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "test1234",
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Test string configuration update
  const stringConfig = await api.functional.todo.configurations.create(
    connection,
    {
      body: {
        key: "app.theme",
        value: "dark",
        type: "string",
        description: "Application theme setting",
        is_system: false,
      } satisfies ITodoConfiguration.ICreate,
    },
  );
  typia.assert(stringConfig);

  const updatedStringConfig =
    await api.functional.todo.user.configurations.update(connection, {
      key: stringConfig.key,
      body: {
        value: "light",
        type: "string",
      } satisfies ITodoConfiguration.IUpdate,
    });
  typia.assert(updatedStringConfig);
  TestValidator.equals(
    "string config value updated",
    updatedStringConfig.value,
    "light",
  );

  // Step 3: Test number configuration update
  const numberConfig = await api.functional.todo.configurations.create(
    connection,
    {
      body: {
        key: "app.maxRetries",
        value: "3",
        type: "number",
        description: "Maximum number of retry attempts",
        is_system: false,
      } satisfies ITodoConfiguration.ICreate,
    },
  );
  typia.assert(numberConfig);

  const updatedNumberConfig =
    await api.functional.todo.user.configurations.update(connection, {
      key: numberConfig.key,
      body: {
        value: "5",
        type: "number",
      } satisfies ITodoConfiguration.IUpdate,
    });
  typia.assert(updatedNumberConfig);
  TestValidator.equals(
    "number config value updated",
    updatedNumberConfig.value,
    "5",
  );

  // Step 4: Test boolean configuration update
  const booleanConfig = await api.functional.todo.configurations.create(
    connection,
    {
      body: {
        key: "app.autoSave",
        value: "false",
        type: "boolean",
        description: "Auto-save feature toggle",
        is_system: false,
      } satisfies ITodoConfiguration.ICreate,
    },
  );
  typia.assert(booleanConfig);

  const updatedBooleanConfig =
    await api.functional.todo.user.configurations.update(connection, {
      key: booleanConfig.key,
      body: {
        value: "true",
        type: "boolean",
      } satisfies ITodoConfiguration.IUpdate,
    });
  typia.assert(updatedBooleanConfig);
  TestValidator.equals(
    "boolean config value updated",
    updatedBooleanConfig.value,
    "true",
  );

  // Step 5: Test JSON configuration update
  const jsonConfig = await api.functional.todo.configurations.create(
    connection,
    {
      body: {
        key: "app.features",
        value: '{"darkMode": false, "notifications": true}',
        type: "json",
        description: "Feature flags configuration",
        is_system: false,
      } satisfies ITodoConfiguration.ICreate,
    },
  );
  typia.assert(jsonConfig);

  const updatedJsonConfig =
    await api.functional.todo.user.configurations.update(connection, {
      key: jsonConfig.key,
      body: {
        value: '{"darkMode": true, "notifications": true, "analytics": false}',
        type: "json",
      } satisfies ITodoConfiguration.IUpdate,
    });
  typia.assert(updatedJsonConfig);
  TestValidator.equals(
    "json config value updated",
    updatedJsonConfig.value,
    '{"darkMode": true, "notifications": true, "analytics": false}',
  );

  // Step 6: Test system configuration update
  const systemConfig = await api.functional.todo.configurations.create(
    connection,
    {
      body: {
        key: "system.maintenance",
        value: "scheduled",
        type: "string",
        description: "System maintenance status",
        is_system: true,
      } satisfies ITodoConfiguration.ICreate,
    },
  );
  typia.assert(systemConfig);

  const updatedSystemConfig =
    await api.functional.todo.user.configurations.update(connection, {
      key: systemConfig.key,
      body: {
        value: "active",
        description: "Updated system maintenance status",
      } satisfies ITodoConfiguration.IUpdate,
    });
  typia.assert(updatedSystemConfig);
  TestValidator.equals(
    "system config updated",
    updatedSystemConfig.value,
    "active",
  );
  TestValidator.equals(
    "system config description updated",
    updatedSystemConfig.description,
    "Updated system maintenance status",
  );
}
