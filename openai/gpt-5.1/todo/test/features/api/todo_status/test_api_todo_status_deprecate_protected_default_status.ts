import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";

/**
 * Validate that a default Todo status configured as active cannot be deprecated
 * via the administrative DELETE endpoint.
 *
 * ## Business context
 *
 * The Todo application keeps a catalogue of allowed Todo statuses in the
 * `todo_app_todo_statuses` table. Each status has a stable business `code`, a
 * human-facing `label`, ordering metadata, and behavior flags such as
 * `is_default` (the default status for new Todos) and `is_active`.
 *
 * Administrative operators (todoAdmin) can manage this catalogue through
 * protected APIs. However, when a status is currently configured as the system
 * default, higher level business rules (potentially backed by
 * `todo_app_system_configs`) must prevent that status from being logically
 * deprecated/erased while it is still mandatory for new Todos.
 *
 * This test ensures that attempting to deprecate such a protected default
 * status fails and that other statuses remain unaffected.
 *
 * ## Test flow
 *
 * 1. Register a new todoAdmin using `/auth/todoAdmin/join` so that subsequent
 *    catalogue operations are authorized.
 * 2. Using the admin context, create two Todo status entries via
 *    `/todoApp/todoAdmin/todoStatuses`:
 *
 *    - `defaultStatus`: a status marked as `is_default=true` and `is_active=true`,
 *         representing the protected default status.
 *    - `backupStatus`: a separate status marked as `is_default=false` and
 *         `is_active=true`, representing a normal active status.
 * 3. Attempt to deprecate `defaultStatus` by calling `DELETE
 *    /todoApp/todoAdmin/todoStatuses/{statusCode}` with `statusCode =
 *    defaultStatus.code`.
 * 4. Assert, using `TestValidator.error`, that the erase operation fails (throws)
 *    when targeting this default status, reflecting protection by business
 *    rules.
 * 5. Confirm that our in-memory representations still show
 *    `defaultStatus.is_default === true` and `defaultStatus.is_active ===
 *    true`, and that `backupStatus.is_default === false` and
 *    `backupStatus.is_active === true` — indicating no unintended mutation from
 *    the failed call.
 *
 * Note: As this test scope does not expose read/list endpoints or explicit
 * system configuration APIs, we cannot re-fetch or inspect the catalogue state
 * from the backend. Instead, we focus on verifying that the DELETE operation
 * fails for the default status and that our locally captured status objects
 * remain logically consistent.
 */
export async function test_api_todo_status_deprecate_protected_default_status(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin (join) to acquire authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://admin.todo-app.example.com/join",
    referrer: "https://admin.todo-app.example.com/",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a default active status and a backup active status
  const suffix = RandomGenerator.alphaNumeric(8);

  const defaultStatusBody = {
    code: `DEFAULT_STATUS_${suffix}`,
    label: `Default Status ${suffix}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "core",
    sort_order: 1,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const defaultStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: defaultStatusBody,
    });
  typia.assert(defaultStatus);

  const backupStatusBody = {
    code: `BACKUP_STATUS_${suffix}`,
    label: `Backup Status ${suffix}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    group: "core",
    sort_order: 2,
    is_default: false,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const backupStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: backupStatusBody,
    });
  typia.assert(backupStatus);

  // Basic sanity checks on created statuses
  TestValidator.equals(
    "default status is_default flag should be true",
    defaultStatus.is_default,
    true,
  );
  TestValidator.equals(
    "default status is_active flag should be true",
    defaultStatus.is_active,
    true,
  );
  TestValidator.equals(
    "backup status is_default flag should be false",
    backupStatus.is_default,
    false,
  );
  TestValidator.equals(
    "backup status is_active flag should be true",
    backupStatus.is_active,
    true,
  );

  // 3. Attempt to deprecate (erase) the default status by its business code
  await TestValidator.error(
    "deprecating a default active status should fail",
    async () => {
      await api.functional.todoApp.todoAdmin.todoStatuses.erase(connection, {
        statusCode: defaultStatus.code,
      });
    },
  );

  // 4. Confirm our captured objects remain logically consistent
  TestValidator.equals(
    "default status remains marked as default after failed erase",
    defaultStatus.is_default,
    true,
  );
  TestValidator.equals(
    "default status remains active after failed erase",
    defaultStatus.is_active,
    true,
  );
  TestValidator.equals(
    "backup status remains non-default after failed erase of default",
    backupStatus.is_default,
    false,
  );
  TestValidator.equals(
    "backup status remains active after failed erase of default",
    backupStatus.is_active,
    true,
  );
}
