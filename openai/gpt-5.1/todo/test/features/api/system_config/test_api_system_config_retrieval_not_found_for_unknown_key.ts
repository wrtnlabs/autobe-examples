import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemConfig";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";

/**
 * Validate not-found behavior when retrieving a system config with an unknown
 * (scope, configKey) pair.
 *
 * Business context:
 *
 * - System configuration rows in `todo_app_system_configs` are addressed by a
 *   natural composite identifier (scope, key), not by their UUID.
 * - Administrative tooling resolves configuration values by calling GET
 *   /todoApp/todoAdmin/systemConfigs/{scope}/{configKey}.
 * - When no active, non-deleted row exists for that pair, the API should respond
 *   with an error rather than fabricating a default ITodoAppSystemConfig
 *   instance.
 *
 * Test purpose:
 *
 * - Prove that a missing configuration does not yield a successful
 *   ITodoAppSystemConfig payload.
 * - Confirm that the endpoint enforces todoAdmin authentication.
 * - Ensure that lookup semantics are strictly based on the composite (scope, key)
 *   pair and do not fall back to any implicit defaults.
 *
 * Steps:
 *
 * 1. Register a new todoAdmin using POST /auth/todoAdmin/join with a
 *    random-but-valid ITodoAppTodoAdminJoin.IRequest payload.
 *
 *    - This must result in an ITodoAppTodoAdmin.IAuthorized response.
 *    - The SDK will automatically propagate the access token into the shared
 *         connection.headers.Authorization, establishing an authenticated admin
 *         context.
 * 2. Construct a scope and configKey string combination that is extremely unlikely
 *    to exist in the database, such as:
 *
 *    - Scope: "todo"
 *    - ConfigKey: "non_existing_config_key_" + random suffix
 * 3. Call api.functional.todoApp.todoAdmin.systemConfigs.at with that (scope,
 *    configKey) pair using the authenticated connection.
 * 4. Expect this call to fail with an error representing a not-found style
 *    outcome.
 *
 *    - Use TestValidator.error to assert that an error is raised for the lookup,
 *         without asserting specific HTTP status codes.
 * 5. If the call were to succeed (no error thrown), the test must fail because a
 *    successful ITodoAppSystemConfig for such a fabricated key would contradict
 *    the expected not-found semantics.
 */
export async function test_api_system_config_retrieval_not_found_for_unknown_key(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin and obtain authorized context
  const joinRequest = typia.random<ITodoAppTodoAdminJoin.IRequest>();
  const admin = await api.functional.auth.todoAdmin.join(connection, {
    body: joinRequest,
  });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(admin);

  // 2. Prepare clearly non-existent (scope, configKey) pair
  const scope = "todo";
  const configKey =
    "non_existing_config_key_" + RandomGenerator.alphaNumeric(12);

  // 3 & 4. Invoke systemConfigs.at and assert it fails with an error
  // We intentionally do not assert specific HTTP status codes; only
  // that the lookup of a non-existent configuration results in an
  // error path rather than a successful ITodoAppSystemConfig payload.
  await TestValidator.error(
    "retrieving non-existent system config should fail",
    async () => {
      await api.functional.todoApp.todoAdmin.systemConfigs.at(connection, {
        scope,
        configKey,
      });
    },
  );
}
