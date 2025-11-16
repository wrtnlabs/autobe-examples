import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemConfig";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";

export async function test_api_system_config_retrieval_uses_latest_updated_state(
  connection: api.IConnection,
) {
  // 1. Register a todoAdmin to obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://admin.todo-app.test/system-configs",
    referrer: "https://admin.todo-app.test/",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create initial configuration
  const scope = "todo";
  const key = "max_open_todos_per_user";

  const initialCreateBody = {
    scope,
    key,
    value: "50",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
  } satisfies ITodoAppSystemConfig.ICreate;

  const created: ITodoAppSystemConfig =
    await api.functional.todoApp.todoAdmin.systemConfigs.create(connection, {
      body: initialCreateBody,
    });
  typia.assert(created);

  TestValidator.equals(
    "created config has expected scope",
    created.scope,
    scope,
  );
  TestValidator.equals("created config has expected key", created.key, key);
  TestValidator.equals(
    "created config has expected initial value",
    created.value,
    "50",
  );
  TestValidator.equals(
    "created config has expected initial is_active",
    created.is_active,
    true,
  );

  const createdCreatedAt = created.created_at;
  const createdUpdatedAt = created.updated_at;

  // 3. Update configuration with new values
  const updatedDescription = RandomGenerator.paragraph({ sentences: 4 });
  const updateBody = {
    value: "100",
    description: updatedDescription,
    is_active: false,
  } satisfies ITodoAppSystemConfig.IUpdate;

  const updated: ITodoAppSystemConfig =
    await api.functional.todoApp.todoAdmin.systemConfigs.update(connection, {
      scope,
      configKey: key,
      body: updateBody,
    });
  typia.assert(updated);

  // Ensure identity fields remain stable
  TestValidator.equals(
    "updated config retains same id",
    updated.id,
    created.id,
  );
  TestValidator.equals(
    "updated config retains same scope",
    updated.scope,
    created.scope,
  );
  TestValidator.equals(
    "updated config retains same key",
    updated.key,
    created.key,
  );

  // Ensure updated fields reflect new values
  TestValidator.equals(
    "updated config reflects new value",
    updated.value,
    "100",
  );
  TestValidator.predicate(
    "updated config reflects new description",
    updated.description === updatedDescription,
  );
  TestValidator.equals(
    "updated config reflects new active flag",
    updated.is_active,
    false,
  );

  // Timestamp ordering checks using Date
  const createdCreatedAtDate = new Date(createdCreatedAt);
  const createdUpdatedAtDate = new Date(createdUpdatedAt);
  const updatedUpdatedAtDate = new Date(updated.updated_at);

  TestValidator.equals(
    "created_at remains stable between create and update",
    updated.created_at,
    created.created_at,
  );

  TestValidator.predicate(
    "updated.updated_at is not earlier than created.updated_at",
    updatedUpdatedAtDate.getTime() >= createdUpdatedAtDate.getTime(),
  );

  TestValidator.predicate(
    "updated.updated_at is not earlier than created.created_at",
    updatedUpdatedAtDate.getTime() >= createdCreatedAtDate.getTime(),
  );

  // 4. Retrieve configuration and ensure it matches updated state
  const fetched: ITodoAppSystemConfig =
    await api.functional.todoApp.todoAdmin.systemConfigs.at(connection, {
      scope,
      configKey: key,
    });
  typia.assert(fetched);

  TestValidator.equals(
    "fetched config id matches updated config id",
    fetched.id,
    updated.id,
  );
  TestValidator.equals(
    "fetched config reflects latest value",
    fetched.value,
    updated.value,
  );
  TestValidator.equals(
    "fetched config reflects latest description",
    fetched.description,
    updated.description,
  );
  TestValidator.equals(
    "fetched config reflects latest is_active flag",
    fetched.is_active,
    updated.is_active,
  );

  // Ensure fetched updated_at is at least as recent as updated.updated_at
  const fetchedUpdatedAtDate = new Date(fetched.updated_at);
  TestValidator.predicate(
    "fetched.updated_at is not earlier than updated.updated_at",
    fetchedUpdatedAtDate.getTime() >= updatedUpdatedAtDate.getTime(),
  );
}
