import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemConfig";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";

/**
 * Verify that creating a todoApp system configuration enforces uniqueness on
 * the (scope, key) pair and rejects duplicates while keeping the original
 * record intact.
 *
 * Business flow:
 *
 * 1. Register a new todoAdmin using /auth/todoAdmin/join to obtain authenticated
 *    administrative context (JWT is managed automatically by the SDK via
 *    connection headers).
 * 2. Using that admin context, create a new system configuration via POST
 *    /todoApp/todoAdmin/systemConfigs with a fixed (scope, key).
 * 3. Attempt to create another configuration with the same (scope, key) but a
 *    different value/description and verify that the second request fails
 *    (duplicate unique index violation on (scope, key)).
 * 4. Optionally, create a third configuration with the same scope but a different
 *    key to confirm that non-conflicting entries are still accepted.
 *
 * Validations:
 *
 * - The join endpoint returns a valid ITodoAppTodoAdmin.IAuthorized object.
 * - The first systemConfigs.create call succeeds and returns an
 *   ITodoAppSystemConfig whose scope/key match the request body.
 * - The second systemConfigs.create call with the same (scope, key) results in an
 *   error observable via TestValidator.error, demonstrating uniqueness
 *   enforcement without inspecting specific HTTP status codes.
 * - The optional third create call with a new key succeeds normally and returns a
 *   configuration whose scope/key match the new request.
 */
export async function test_api_system_config_creation_enforces_unique_scope_and_key(
  connection: api.IConnection,
) {
  // 1. Register a todoAdmin via /auth/todoAdmin/join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin = await api.functional.auth.todoAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(admin);

  // 2. Create initial system config with fixed (scope, key)
  const scope = "auth";
  const key = "max_login_attempts";

  const createBody1 = {
    scope,
    key,
    value: "5",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
  } satisfies ITodoAppSystemConfig.ICreate;

  const config1 = await api.functional.todoApp.todoAdmin.systemConfigs.create(
    connection,
    { body: createBody1 },
  );
  typia.assert<ITodoAppSystemConfig>(config1);

  TestValidator.equals(
    "created config1 scope matches request",
    config1.scope,
    scope,
  );
  TestValidator.equals("created config1 key matches request", config1.key, key);

  // 3. Attempt duplicate creation with same (scope, key) but different value/description
  const createBodyDuplicate = {
    scope,
    key,
    value: "10", // different value to prove we are not overwriting silently
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_active: true,
  } satisfies ITodoAppSystemConfig.ICreate;

  await TestValidator.error(
    "duplicate system config create with same (scope, key) must fail",
    async () => {
      await api.functional.todoApp.todoAdmin.systemConfigs.create(connection, {
        body: createBodyDuplicate,
      });
    },
  );

  // 4. Sanity check: create non-conflicting configuration with different key
  const otherKey = "max_login_attempts_per_ip";

  const createBody2 = {
    scope,
    key: otherKey,
    value: "3",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_active: true,
  } satisfies ITodoAppSystemConfig.ICreate;

  const config2 = await api.functional.todoApp.todoAdmin.systemConfigs.create(
    connection,
    { body: createBody2 },
  );
  typia.assert<ITodoAppSystemConfig>(config2);

  TestValidator.equals(
    "created config2 scope matches request",
    config2.scope,
    scope,
  );
  TestValidator.equals(
    "created config2 key matches request",
    config2.key,
    otherKey,
  );
}
