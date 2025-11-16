import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemConfig";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";

export async function test_api_system_config_update_inactive_toggle(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin and obtain authorized context
  const joinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(2),
    ip: null,
    href: "https://admin.todoapp.example.com/settings/system-configs",
    referrer: "https://admin.todoapp.example.com/login",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create an active system configuration entry
  const scope = "todo";
  const key = `deletion_model_${RandomGenerator.alphaNumeric(6)}`;

  const createBody = {
    scope,
    key,
    value: "soft_delete",
    description: "Soft deletion model for todos (initial active config)",
    // is_active omitted so that backend defaults it, expected to true
  } satisfies ITodoAppSystemConfig.ICreate;

  const created: ITodoAppSystemConfig =
    await api.functional.todoApp.todoAdmin.systemConfigs.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  // Basic invariants on created config
  TestValidator.equals(
    "created config scope matches request",
    created.scope,
    scope,
  );
  TestValidator.equals("created config key matches request", created.key, key);
  TestValidator.equals(
    "created config value matches request",
    created.value,
    createBody.value,
  );

  // is_active should be truthy/true for a newly created active config
  TestValidator.predicate(
    "created config is initially active",
    created.is_active === true,
  );

  // Ensure not soft-deleted at creation time
  TestValidator.predicate(
    "created config is not soft-deleted (deleted_at null or undefined)",
    created.deleted_at === null || created.deleted_at === undefined,
  );

  const originalUpdatedAt = created.updated_at;
  const originalCreatedAt = created.created_at;

  // 3. Update the config to set is_active=false while keeping value the same
  const updateBody = {
    value: created.value,
    description: "Soft deletion model (temporarily disabled by admin)",
    is_active: false,
  } satisfies ITodoAppSystemConfig.IUpdate;

  const updated: ITodoAppSystemConfig =
    await api.functional.todoApp.todoAdmin.systemConfigs.update(connection, {
      scope: created.scope,
      configKey: created.key,
      body: updateBody,
    });
  typia.assert(updated);

  // 4. Assertions on the updated configuration state
  TestValidator.equals(
    "updated config id remains unchanged",
    updated.id,
    created.id,
  );
  TestValidator.equals(
    "updated config scope remains unchanged",
    updated.scope,
    created.scope,
  );
  TestValidator.equals(
    "updated config key remains unchanged",
    updated.key,
    created.key,
  );
  TestValidator.equals(
    "updated config value remains unchanged",
    updated.value,
    created.value,
  );

  // is_active should now be false
  TestValidator.equals(
    "updated config is now inactive",
    updated.is_active,
    false,
  );

  // deleted_at should still represent not-deleted
  TestValidator.predicate(
    "updated config is still not soft-deleted (deleted_at null or undefined)",
    updated.deleted_at === null || updated.deleted_at === undefined,
  );

  // created_at should not change
  TestValidator.equals(
    "created_at remains the same after update",
    updated.created_at,
    originalCreatedAt,
  );

  // updated_at should advance
  TestValidator.notEquals(
    "updated_at should change after update",
    updated.updated_at,
    originalUpdatedAt,
  );
}
