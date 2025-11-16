import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminLogin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserJoin";
import type { ITodoAppTodoUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserLogin";

/**
 * Validate that todo creation rejects inactive status codes while accepting
 * active/default ones.
 *
 * Business goal:
 *
 * - Ensure that the Todo creation endpoint enforces catalog configuration rules:
 *   a non-active status in `todo_app_todo_statuses` cannot be used as the
 *   initial status for a new Todo, while active/default statuses can.
 *
 * Flow under test:
 *
 * 1. Register and implicitly authenticate a `todoAdmin` actor.
 * 2. As `todoAdmin`, seed two status catalogue entries via POST
 *    /todoApp/todoAdmin/todoStatuses:
 *
 *    - ACTIVE: is_default=true, is_active=true
 *    - ARCHIVED: is_default=false, is_active=false
 * 3. Register and implicitly authenticate a `todoUser` actor.
 * 4. As `todoUser`, attempt to create a Todo with `status_code = "ARCHIVED"` and
 *    assert that the call fails (business validation error for inactive
 *    status).
 * 5. As the same `todoUser`, create another Todo with an allowed status
 *    (`status_code = "ACTIVE"`) and assert that it succeeds and returns a
 *    well-formed `ITodoAppTodo`.
 *
 * Constraints and notes:
 *
 * - We cannot inspect HTTP status codes or error payload details through the
 *   typed SDK in this context; we only assert that an error is thrown for the
 *   invalid call using `TestValidator.error`.
 * - No list/detail endpoints for todos are provided, so we cannot directly assert
 *   the absence of a todo with ARCHIVED status. Instead, we infer this from the
 *   failure of the creation call.
 * - All authentication state switching between `todoAdmin` and `todoUser` relies
 *   on the provided auth endpoints, never touching `connection.headers`
 *   directly.
 */
export async function test_api_todo_creation_rejects_inactive_status_code(
  connection: api.IConnection,
) {
  // 1. Register todoAdmin (join implicitly authenticates as todoAdmin)
  const adminJoinRequest = typia.random<ITodoAppTodoAdminJoin.IRequest>();

  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert(admin);

  // 2. As todoAdmin, create ACTIVE and ARCHIVED statuses
  const activeStatusRequest = {
    code: "ACTIVE",
    label: "Active",
    description: "Active todos that are available for work",
    group: "core",
    sort_order: 1,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const activeStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: activeStatusRequest,
    });
  typia.assert(activeStatus);

  const archivedStatusRequest = {
    code: "ARCHIVED",
    label: "Archived",
    description: "Inactive archived todos not assignable to new items",
    group: "core",
    sort_order: 2,
    is_default: false,
    is_active: false,
  } satisfies ITodoAppTodoStatus.ICreate;

  const archivedStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: archivedStatusRequest,
    });
  typia.assert(archivedStatus);

  // 3. Register todoUser (join implicitly authenticates as todoUser)
  const userJoinRequest = typia.random<ITodoAppTodoUserJoin.IRequest>();

  const user: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userJoinRequest,
    });
  typia.assert(user);

  // 4. As todoUser, attempt to create a Todo with an inactive status_code
  const invalidTodoBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: null,
    status_code: "ARCHIVED",
  } satisfies ITodoAppTodo.ICreate;

  await TestValidator.error(
    "inactive status_code must be rejected",
    async () => {
      await api.functional.todoApp.todoUser.todos.create(connection, {
        body: invalidTodoBody,
      });
    },
  );

  // 5. As todoUser, create a Todo with an allowed/active status_code
  const validTodoBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    due_date: null,
    status_code: "ACTIVE",
  } satisfies ITodoAppTodo.ICreate;

  const validTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.create(connection, {
      body: validTodoBody,
    });
  typia.assert(validTodo);

  // Business-level sanity checks on successful todo
  TestValidator.equals(
    "created todo title should match request title",
    validTodo.title,
    validTodoBody.title,
  );
  TestValidator.equals(
    "created todo status should be active",
    validTodo.status.code,
    "ACTIVE",
  );
}
