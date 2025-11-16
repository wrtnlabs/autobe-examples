import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemConfig";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";

export async function test_api_system_config_soft_delete_basic_flow(
  connection: api.IConnection,
) {
  // 1) Register a new todoAdmin to obtain authorized context
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2) Create an active configuration entry
  const scope = "todo";
  const configKey = `deletion_model_${RandomGenerator.alphaNumeric(8)}`;
  const createBody = {
    scope,
    key: configKey,
    value: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_active: true,
  } satisfies ITodoAppSystemConfig.ICreate;

  const createdConfig: ITodoAppSystemConfig =
    await api.functional.todoApp.todoAdmin.systemConfigs.create(connection, {
      body: createBody,
    });
  typia.assert<ITodoAppSystemConfig>(createdConfig);

  TestValidator.equals(
    "created config scope matches request",
    createdConfig.scope,
    scope,
  );
  TestValidator.equals(
    "created config key matches request",
    createdConfig.key,
    configKey,
  );
  TestValidator.equals(
    "created config is active",
    createdConfig.is_active,
    true,
  );
  TestValidator.equals(
    "created config value matches request",
    createdConfig.value,
    createBody.value,
  );
  TestValidator.equals(
    "created config description matches request",
    createdConfig.description ?? null,
    createBody.description ?? null,
  );
  TestValidator.equals(
    "created config deleted_at is null on creation",
    createdConfig.deleted_at ?? null,
    null,
  );

  // Snapshot timestamps before deletion
  const createdAtBeforeDelete = createdConfig.created_at;
  const updatedAtBeforeDelete = createdConfig.updated_at;

  // 3) Soft-delete the configuration via DELETE erase endpoint
  const erasedConfig: ITodoAppSystemConfig =
    await api.functional.todoApp.todoAdmin.systemConfigs.erase(connection, {
      scope,
      configKey,
    });
  typia.assert<ITodoAppSystemConfig>(erasedConfig);

  // 4) Validate lifecycle semantics after soft-delete
  TestValidator.equals(
    "erased config id remains unchanged",
    erasedConfig.id,
    createdConfig.id,
  );
  TestValidator.equals(
    "erased config scope remains unchanged",
    erasedConfig.scope,
    createdConfig.scope,
  );
  TestValidator.equals(
    "erased config key remains unchanged",
    erasedConfig.key,
    createdConfig.key,
  );
  TestValidator.equals(
    "erased config value remains unchanged",
    erasedConfig.value,
    createdConfig.value,
  );
  TestValidator.equals(
    "erased config description remains unchanged",
    erasedConfig.description ?? null,
    createdConfig.description ?? null,
  );
  TestValidator.equals(
    "erased config created_at remains unchanged",
    erasedConfig.created_at,
    createdAtBeforeDelete,
  );

  // is_active must be false after soft-delete
  TestValidator.equals(
    "erased config is marked as inactive",
    erasedConfig.is_active,
    false,
  );

  // deleted_at must be set and a valid date-time
  TestValidator.predicate(
    "erased config has non-null deleted_at",
    () =>
      erasedConfig.deleted_at !== null && erasedConfig.deleted_at !== undefined,
  );
  if (
    erasedConfig.deleted_at !== null &&
    erasedConfig.deleted_at !== undefined
  ) {
    // Ensure it parses as a valid date
    const deletedAtDate = new Date(erasedConfig.deleted_at);
    TestValidator.predicate(
      "erased config deleted_at is a valid date",
      !Number.isNaN(deletedAtDate.getTime()),
    );
  }

  // updated_at must be advanced compared to before delete
  const updatedBefore = new Date(updatedAtBeforeDelete).getTime();
  const updatedAfter = new Date(erasedConfig.updated_at).getTime();
  TestValidator.predicate(
    "erased config updated_at is later than before delete",
    () => updatedAfter >= updatedBefore,
  );
}
