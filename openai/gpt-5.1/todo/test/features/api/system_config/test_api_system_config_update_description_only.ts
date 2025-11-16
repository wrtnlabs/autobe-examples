import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemConfig";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";

export async function test_api_system_config_update_description_only(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin and obtain authorized context
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://admin.todo-app.example.com/register",
    referrer: "https://admin.todo-app.example.com/login",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(admin);

  // 2. Create an initial system configuration with description and is_active=true
  const initialDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });

  const createBody = {
    scope: "todo", // logical namespace, arbitrary but consistent
    key: `max_open_todos_${RandomGenerator.alphaNumeric(8)}`,
    value: "100", // string payload, business-specific parsing left to runtime
    description: initialDescription,
    is_active: true,
  } satisfies ITodoAppSystemConfig.ICreate;

  const created: ITodoAppSystemConfig =
    await api.functional.todoApp.todoAdmin.systemConfigs.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  // 3. Update only the description via PUT /systemConfigs/{scope}/{configKey}
  const newDescription = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 8,
  });

  const updateBody = {
    description: newDescription,
  } satisfies ITodoAppSystemConfig.IUpdate;

  const updated: ITodoAppSystemConfig =
    await api.functional.todoApp.todoAdmin.systemConfigs.update(connection, {
      scope: created.scope,
      configKey: created.key,
      body: updateBody,
    });
  typia.assert(updated);

  // 4. Validate that only description and updated_at changed while other fields remain consistent
  TestValidator.equals(
    "config id should remain unchanged",
    updated.id,
    created.id,
  );

  TestValidator.equals(
    "config scope should remain unchanged",
    updated.scope,
    created.scope,
  );

  TestValidator.equals(
    "config key should remain unchanged",
    updated.key,
    created.key,
  );

  TestValidator.equals(
    "config value should remain unchanged when not provided in update body",
    updated.value,
    created.value,
  );

  TestValidator.equals(
    "config is_active should remain unchanged when not provided in update body",
    updated.is_active,
    created.is_active,
  );

  TestValidator.equals(
    "config description should be updated to new value",
    updated.description,
    newDescription,
  );

  TestValidator.equals(
    "config created_at should remain unchanged",
    updated.created_at,
    created.created_at,
  );

  TestValidator.equals(
    "config deleted_at should remain unchanged",
    updated.deleted_at ?? null,
    created.deleted_at ?? null,
  );

  // updated_at should move forward and differ from original
  TestValidator.notEquals(
    "updated_at should be different after description-only update",
    updated.updated_at,
    created.updated_at,
  );

  // Additionally, ensure updated_at is chronologically not before created.updated_at
  const createdUpdatedAt = new Date(created.updated_at).getTime();
  const updatedUpdatedAt = new Date(updated.updated_at).getTime();

  TestValidator.predicate(
    "updated_at should be later than or equal to original updated_at",
    updatedUpdatedAt >= createdUpdatedAt,
  );
}
