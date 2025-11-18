import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListTodoListSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListSystemConfiguration";

export async function test_api_todo_list_system_configuration_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register new admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "securePassword123";
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Attempt to retrieve system configuration with authentication
  // Generate a random key string
  const configKey = typia.random<string>();
  const config: ITodoListTodoListSystemConfiguration =
    await api.functional.todoList.admin.todoListSystemConfigurations.at(
      connection,
      {
        key: configKey,
      },
    );
  typia.assert(config);

  // Validate retrieved configuration's key is exactly the requested key
  TestValidator.equals(
    "retrieved config key matches requested key",
    config.key,
    configKey,
  );

  // Validate the value property exists and is a string
  TestValidator.predicate(
    "value property is non-empty string",
    typeof config.value === "string" && config.value.length > 0,
  );

  // Validate description property is either string or null/undefined
  TestValidator.predicate(
    "description property is string or null/undefined",
    config.description === null ||
      config.description === undefined ||
      typeof config.description === "string",
  );

  // Validate created_at and updated_at are string or null/undefined
  TestValidator.predicate(
    "created_at property is string or null/undefined",
    config.created_at === null ||
      config.created_at === undefined ||
      typeof config.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at property is string or null/undefined",
    config.updated_at === null ||
      config.updated_at === undefined ||
      typeof config.updated_at === "string",
  );

  // Validate deleted_at property is string or null/undefined
  TestValidator.predicate(
    "deleted_at property is string or null/undefined",
    config.deleted_at === null ||
      config.deleted_at === undefined ||
      typeof config.deleted_at === "string",
  );

  // 3. Test unauthorized access is denied
  // Create unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated config retrieval should fail",
    async () => {
      await api.functional.todoList.admin.todoListSystemConfigurations.at(
        unauthenticatedConnection,
        { key: configKey },
      );
    },
  );
}
