import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemConfig";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";

export async function test_api_system_config_soft_delete_idempotent_on_missing(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin and obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin = await api.functional.auth.todoAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(admin);

  // 2. Choose a random scope/key pair that should not correspond to any existing config
  const scope: string = typia.random<string>();
  const configKey: string = typia.random<string>();

  // 3. Expect an error when attempting to soft-delete a non-existent configuration entry
  await TestValidator.error(
    "erase missing system config should fail",
    async () => {
      await api.functional.todoApp.todoAdmin.systemConfigs.erase(connection, {
        scope,
        configKey,
      });
    },
  );
}
