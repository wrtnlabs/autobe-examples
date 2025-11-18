import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfiguration";

export async function test_api_todo_list_system_configuration_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins (sign up)
  const adminCreateBody = {
    email: RandomGenerator.alphaNumeric(8) + "@test.com",
    password: "StrongP@ssw0rd123",
  } satisfies ITodoListAdmin.ICreate;

  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(admin);

  // 2. Create a new system configuration entry
  const configCreateBody = {
    key: "testKey_" + RandomGenerator.alphaNumeric(5),
    value: RandomGenerator.alphaNumeric(12),
    description: "Test configuration entry for deletion",
  } satisfies ITodoListSystemConfiguration.ICreate;

  const config: ITodoListSystemConfiguration =
    await api.functional.todoList.admin.todoListSystemConfigurations.create(
      connection,
      { body: configCreateBody },
    );
  typia.assert(config);
  TestValidator.equals(
    "created config key matches input",
    config.key,
    configCreateBody.key,
  );

  // 3. Delete the created configuration entry
  await api.functional.todoList.admin.todoListSystemConfigurations.erase(
    connection,
    { key: config.key },
  );

  // 4. Try to delete again to confirm it no longer exists (should cause error)
  await TestValidator.error(
    "deleting non-existent config should fail",
    async () => {
      await api.functional.todoList.admin.todoListSystemConfigurations.erase(
        connection,
        { key: config.key },
      );
    },
  );
}
