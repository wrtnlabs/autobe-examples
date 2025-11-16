import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";

/**
 * Validate that the Todo status detail endpoint correctly reflects lifecycle
 * flags for active and inactive statuses, and that freshly created statuses are
 * not logically deleted.
 *
 * Business intent:
 *
 * - An administrator (todoAdmin) can define Todo status catalogue entries,
 *   including whether a status is active or inactive.
 * - The public detail endpoint `/todoApp/todoStatuses/{statusCode}` should expose
 *   a consistent view of the status definition regardless of its active flag,
 *   at least for freshly created (non-deleted) statuses.
 * - While logical deletion via `deleted_at` is supported at the schema level, no
 *   delete/update admin endpoint is available in the current SDK, so this test
 *   limits itself to asserting that `deleted_at` is null/undefined for newly
 *   created statuses.
 *
 * Scenario:
 *
 * 1. Register a todoAdmin via `POST /auth/todoAdmin/join`, obtaining an authorized
 *    context on the shared `connection`.
 * 2. As that admin, create an ACTIVE Todo status via `POST
 *    /todoApp/todoAdmin/todoStatuses` with `is_active = true`.
 * 3. Fetch the same status via `GET /todoApp/todoStatuses/{statusCode}` and verify
 *    that key properties (`code`, `label`, `sort_order`, `is_default`,
 *    `is_active`, `deleted_at`) are consistent between create and detail.
 * 4. Create an INACTIVE Todo status via the same admin create endpoint with
 *    `is_active = false`.
 * 5. Fetch the inactive status via the detail endpoint using its `code`.
 * 6. Verify that the inactive status is still returned, with `is_active = false`
 *    and `deleted_at` remaining null/undefined, confirming that inactive but
 *    non-deleted statuses remain visible through the detail API.
 */
export async function test_api_todo_status_detail_reflects_inactive_and_deleted_statuses(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin to obtain an authorized admin context.
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://todo-admin.example.com/register",
    referrer: "https://todo-admin.example.com/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(adminAuthorized);

  // 2. Create an ACTIVE Todo status from the admin side.
  const activeCodeBase = RandomGenerator.alphabets(8).toUpperCase();
  const activeStatusCreate = {
    code: `ACTIVE_${activeCodeBase}`,
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    group: "core",
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_default: false,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const createdActiveStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: activeStatusCreate,
    });
  typia.assert(createdActiveStatus);

  // Basic consistency checks on the created active status.
  TestValidator.equals(
    "created active status code should match input",
    createdActiveStatus.code,
    activeStatusCreate.code,
  );
  TestValidator.predicate(
    "created active status should be active",
    createdActiveStatus.is_active === true,
  );
  TestValidator.predicate(
    "created active status should not be logically deleted",
    createdActiveStatus.deleted_at === null ||
      createdActiveStatus.deleted_at === undefined,
  );

  // 3. Fetch the active status via the public detail endpoint by its code.
  const activeStatusFromDetail: ITodoAppTodoStatus =
    await api.functional.todoApp.todoStatuses.at(connection, {
      statusCode: createdActiveStatus.code,
    });
  typia.assert(activeStatusFromDetail);

  // Validate that the detail response matches the created active status.
  TestValidator.equals(
    "detail active status code matches created",
    activeStatusFromDetail.code,
    createdActiveStatus.code,
  );
  TestValidator.equals(
    "detail active status label matches created",
    activeStatusFromDetail.label,
    createdActiveStatus.label,
  );
  TestValidator.equals(
    "detail active status sort_order matches created",
    activeStatusFromDetail.sort_order,
    createdActiveStatus.sort_order,
  );
  TestValidator.equals(
    "detail active status is_default matches created",
    activeStatusFromDetail.is_default,
    createdActiveStatus.is_default,
  );
  TestValidator.equals(
    "detail active status is_active matches created",
    activeStatusFromDetail.is_active,
    createdActiveStatus.is_active,
  );
  TestValidator.predicate(
    "detail active status should not be logically deleted",
    activeStatusFromDetail.deleted_at === null ||
      activeStatusFromDetail.deleted_at === undefined,
  );

  // 4. Create an INACTIVE Todo status via the admin endpoint.
  const inactiveCodeBase = RandomGenerator.alphabets(8).toUpperCase();
  const inactiveStatusCreate = {
    code: `INACTIVE_${inactiveCodeBase}`,
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    group: "core",
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_default: false,
    is_active: false,
  } satisfies ITodoAppTodoStatus.ICreate;

  const createdInactiveStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: inactiveStatusCreate,
    });
  typia.assert(createdInactiveStatus);

  // Confirm that the creation response reflects inactivity and no logical deletion.
  TestValidator.equals(
    "created inactive status code should match input",
    createdInactiveStatus.code,
    inactiveStatusCreate.code,
  );
  TestValidator.predicate(
    "created inactive status should be inactive",
    createdInactiveStatus.is_active === false,
  );
  TestValidator.predicate(
    "created inactive status should not be logically deleted",
    createdInactiveStatus.deleted_at === null ||
      createdInactiveStatus.deleted_at === undefined,
  );

  // 5. Fetch the inactive status via the public detail endpoint by its code.
  const inactiveStatusFromDetail: ITodoAppTodoStatus =
    await api.functional.todoApp.todoStatuses.at(connection, {
      statusCode: createdInactiveStatus.code,
    });
  typia.assert(inactiveStatusFromDetail);

  // 6. Validate that inactive statuses are still exposed and consistent.
  TestValidator.equals(
    "detail inactive status code matches created",
    inactiveStatusFromDetail.code,
    createdInactiveStatus.code,
  );
  TestValidator.equals(
    "detail inactive status label matches created",
    inactiveStatusFromDetail.label,
    createdInactiveStatus.label,
  );
  TestValidator.equals(
    "detail inactive status sort_order matches created",
    inactiveStatusFromDetail.sort_order,
    createdInactiveStatus.sort_order,
  );
  TestValidator.equals(
    "detail inactive status is_default matches created",
    inactiveStatusFromDetail.is_default,
    createdInactiveStatus.is_default,
  );
  TestValidator.predicate(
    "detail inactive status should be inactive",
    inactiveStatusFromDetail.is_active === false,
  );
  TestValidator.predicate(
    "detail inactive status should not be logically deleted",
    inactiveStatusFromDetail.deleted_at === null ||
      inactiveStatusFromDetail.deleted_at === undefined,
  );
}
