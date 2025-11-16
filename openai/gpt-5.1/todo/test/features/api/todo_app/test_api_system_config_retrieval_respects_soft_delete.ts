import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemConfig";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";

export async function test_api_system_config_retrieval_respects_soft_delete(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin to obtain authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://admin.todoapp.local/register",
    referrer: "https://admin.todoapp.local/login",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a new system configuration entry with a deterministic scope/key
  const scope = "todo";
  const key = `soft_delete_retention_days_${RandomGenerator.alphaNumeric(8)}`;

  const createBody = {
    scope,
    key,
    value: "30",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
  } satisfies ITodoAppSystemConfig.ICreate;

  const created: ITodoAppSystemConfig =
    await api.functional.todoApp.todoAdmin.systemConfigs.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  TestValidator.equals(
    "created config scope matches request",
    created.scope,
    scope,
  );
  TestValidator.equals("created config key matches request", created.key, key);

  // 3. Verify that retrieval BEFORE soft delete succeeds
  const beforeDelete: ITodoAppSystemConfig =
    await api.functional.todoApp.todoAdmin.systemConfigs.at(connection, {
      scope,
      configKey: key,
    });
  typia.assert(beforeDelete);
  TestValidator.equals(
    "retrieved config before delete has same id as created",
    beforeDelete.id,
    created.id,
  );

  // 4. Soft-delete the configuration using DELETE /systemConfigs/{scope}/{configKey}
  const erased: ITodoAppSystemConfig =
    await api.functional.todoApp.todoAdmin.systemConfigs.erase(connection, {
      scope,
      configKey: key,
    });
  typia.assert(erased);

  TestValidator.equals(
    "erased config id matches created config id",
    erased.id,
    created.id,
  );
  TestValidator.equals("erased config scope matches", erased.scope, scope);
  TestValidator.equals("erased config key matches", erased.key, key);

  // 5. After soft-delete, attempting to retrieve the config should result in an error
  await TestValidator.error(
    "retrieving a soft-deleted system config should fail",
    async () => {
      await api.functional.todoApp.todoAdmin.systemConfigs.at(connection, {
        scope,
        configKey: key,
      });
    },
  );
}
