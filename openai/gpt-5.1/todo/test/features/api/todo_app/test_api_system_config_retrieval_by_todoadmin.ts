import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemConfig";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";

/**
 * Validate that an authenticated todoAdmin can retrieve a specific system
 * configuration entry by its (scope, key) composite identifier.
 *
 * Business workflow:
 *
 * 1. Register a new todoAdmin via /auth/todoAdmin/join to obtain an authenticated
 *    context.
 * 2. Create a concrete system configuration using POST
 *    /todoApp/todoAdmin/systemConfigs with a deterministic (scope, key) such as
 *    ("todo", "deletion_model").
 * 3. Retrieve the configuration using GET
 *    /todoApp/todoAdmin/systemConfigs/{scope}/{configKey} with matching path
 *    parameters.
 * 4. Assert that the retrieved ITodoAppSystemConfig matches the created one in id,
 *    scope, key, value, description, is_active, and audit timestamps; and that
 *    deleted_at is null.
 */
export async function test_api_system_config_retrieval_by_todoadmin(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin to obtain authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a concrete system configuration entry
  const createBody = {
    scope: "todo",
    key: "deletion_model",
    value: "soft_delete",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies ITodoAppSystemConfig.ICreate;

  const createdConfig: ITodoAppSystemConfig =
    await api.functional.todoApp.todoAdmin.systemConfigs.create(connection, {
      body: createBody,
    });
  typia.assert(createdConfig);

  // 3. Retrieve the configuration by (scope, key)
  const fetchedConfig: ITodoAppSystemConfig =
    await api.functional.todoApp.todoAdmin.systemConfigs.at(connection, {
      scope: createdConfig.scope,
      configKey: createdConfig.key,
    });
  typia.assert(fetchedConfig);

  // 4. Business-level assertions comparing created vs fetched
  TestValidator.equals(
    "system config id should be stable between create and fetch",
    fetchedConfig.id,
    createdConfig.id,
  );
  TestValidator.equals(
    "system config scope should match between create and fetch",
    fetchedConfig.scope,
    createdConfig.scope,
  );
  TestValidator.equals(
    "system config key should match between create and fetch",
    fetchedConfig.key,
    createdConfig.key,
  );
  TestValidator.equals(
    "system config value should match between create and fetch",
    fetchedConfig.value,
    createdConfig.value,
  );
  TestValidator.equals(
    "system config description should match between create and fetch",
    fetchedConfig.description,
    createdConfig.description,
  );
  TestValidator.equals(
    "system config is_active should match between create and fetch",
    fetchedConfig.is_active,
    createdConfig.is_active,
  );

  // Temporal and deletion state checks (business expectations)
  TestValidator.predicate(
    "created_at must be a non-empty string",
    fetchedConfig.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at must be a non-empty string",
    fetchedConfig.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at must be null for active configuration",
    fetchedConfig.deleted_at,
    null,
  );
}
