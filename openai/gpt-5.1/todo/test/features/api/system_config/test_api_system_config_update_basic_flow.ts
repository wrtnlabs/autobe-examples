import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemConfig";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";

/**
 * Validate that a todoAdmin can create and then update a system configuration
 * entry identified by (scope, key), while immutable identity fields stay stable
 * and audit timestamps behave correctly.
 *
 * Business workflow:
 *
 * 1. Register a new todoAdmin via /auth/todoAdmin/join to obtain an authenticated
 *    admin context.
 * 2. Create an initial system configuration row via POST
 *    /todoApp/todoAdmin/systemConfigs using ITodoAppSystemConfig.ICreate.
 * 3. Update that configuration via PUT
 *    /todoApp/todoAdmin/systemConfigs/{scope}/{configKey} using
 *    ITodoAppSystemConfig.IUpdate to change value, description, and is_active.
 * 4. Assert that id/scope/key/created_at remain stable, value/description/
 *    is_active reflect the update, updated_at is refreshed, and deleted_at is
 *    not set.
 */
export async function test_api_system_config_update_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin and obtain authorized context
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(adminAuthorized);

  // 2. Create initial system configuration
  const scope = "todo";
  const key = "deletion_model";

  const createBody = {
    scope,
    key,
    value: "soft",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
  } satisfies ITodoAppSystemConfig.ICreate;

  const createdConfig: ITodoAppSystemConfig =
    await api.functional.todoApp.todoAdmin.systemConfigs.create(connection, {
      body: createBody,
    });
  typia.assert(createdConfig);

  // Basic invariants on created config
  TestValidator.equals(
    "created config scope should match request",
    createdConfig.scope,
    scope,
  );
  TestValidator.equals(
    "created config key should match request",
    createdConfig.key,
    key,
  );
  TestValidator.equals(
    "created config value should match request",
    createdConfig.value,
    createBody.value,
  );
  TestValidator.predicate(
    "created_at should be a non-empty ISO string",
    createdConfig.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be a non-empty ISO string",
    createdConfig.updated_at.length > 0,
  );

  // 3. Update the configuration via PUT with changed value/description/is_active
  const updatedValue = "hard";
  const updatedDescription = RandomGenerator.paragraph({ sentences: 4 });
  const updatedIsActive = !createdConfig.is_active;

  const updateBody = {
    value: updatedValue,
    description: updatedDescription,
    is_active: updatedIsActive,
  } satisfies ITodoAppSystemConfig.IUpdate;

  const updatedConfig: ITodoAppSystemConfig =
    await api.functional.todoApp.todoAdmin.systemConfigs.update(connection, {
      scope,
      configKey: key,
      body: updateBody,
    });
  typia.assert(updatedConfig);

  // 4. Business assertions on update result
  // Identity invariants
  TestValidator.equals(
    "id should remain unchanged after update",
    updatedConfig.id,
    createdConfig.id,
  );
  TestValidator.equals(
    "scope should remain unchanged after update",
    updatedConfig.scope,
    createdConfig.scope,
  );
  TestValidator.equals(
    "key should remain unchanged after update",
    updatedConfig.key,
    createdConfig.key,
  );

  // Mutated fields should reflect new values
  TestValidator.equals(
    "value should reflect updated configuration",
    updatedConfig.value,
    updatedValue,
  );
  TestValidator.equals(
    "description should reflect updated configuration",
    updatedConfig.description,
    updatedDescription,
  );
  TestValidator.equals(
    "is_active should reflect updated configuration",
    updatedConfig.is_active,
    updatedIsActive,
  );

  // Audit timestamps
  TestValidator.equals(
    "created_at must remain unchanged after update",
    updatedConfig.created_at,
    createdConfig.created_at,
  );
  TestValidator.notEquals(
    "updated_at must change after update",
    updatedConfig.updated_at,
    createdConfig.updated_at,
  );

  // deleted_at should remain null/undefined (not soft-deleted)
  TestValidator.equals(
    "deleted_at should remain null or undefined after normal update",
    updatedConfig.deleted_at ?? null,
    createdConfig.deleted_at ?? null,
  );
}
