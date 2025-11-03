import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEPersonalDataExportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEPersonalDataExportStatus";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoTodoCompletion } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodoCompletion";
import type { ITodoTodoExportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodoExportSnapshot";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import type { ITodoUserExportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserExportSnapshot";
import type { ITodoUserPersonalDataExport } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserPersonalDataExport";

/**
 * Create a personal data export for a user who has mixed-state todos, and
 * verify non-sensitive snapshots and basic job metadata.
 *
 * Business flow:
 *
 * 1. Join with a brand new user (do not use login). The SDK sets the token.
 * 2. Create Todo A with a due date and description, then mark it completed.
 * 3. Create Todo B without a due date to exercise omission handling.
 * 4. Request personal data export creation for the authenticated user.
 *
 * Validations (success):
 *
 * - Response is a well-typed ITodoUserPersonalDataExport with an id (UUID) and
 *   status. The user snapshot id/email match the authenticated user.
 * - Exported todos include both created todos, with correct completion flags and
 *   due_date presence/absence preserved.
 * - If todos_count exists, it equals the length of the todos array.
 * - The serialized response must not contain sensitive fields such as
 *   "password_hash".
 *
 * Negative path:
 *
 * - Unauthenticated request to POST /todo/user/reports/personalData is rejected
 *   (validate error occurrence only).
 */
export async function test_api_personal_data_export_creation_with_todos(
  connection: api.IConnection,
) {
  // 1) Join with a brand new user (self-signup creates a session and sets token)
  const authorized: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: typia.random<ITodoUser.IJoin>(),
    },
  );
  typia.assert(authorized);

  // 2) Create Todo A with due_date and description
  const dueDateA: string & tags.Format<"date"> = typia.random<
    string & tags.Format<"date">
  >();
  const todoA: ITodoTodo = await api.functional.todo.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 8 }),
        due_date: dueDateA,
      } satisfies ITodoTodo.ICreate,
    },
  );
  typia.assert(todoA);

  // Mark Todo A as completed=true
  const todoACompleted: ITodoTodo =
    await api.functional.todo.user.todos.completion.updateCompletion(
      connection,
      {
        todoId: todoA.id,
        body: { completed: true } satisfies ITodoTodoCompletion.IUpdate,
      },
    );
  typia.assert(todoACompleted);

  // 3) Create Todo B with different attributes (no due_date)
  const todoB: ITodoTodo = await api.functional.todo.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoTodo.ICreate,
    },
  );
  typia.assert(todoB);

  // 4) Request personal data export creation (include_overdue_flags optional)
  const exportJob: ITodoUserPersonalDataExport =
    await api.functional.todo.user.reports.personalData.create(connection, {
      body: {
        include_overdue_flags: RandomGenerator.pick([true, false] as const),
      } satisfies ITodoUserPersonalDataExport.ICreate,
    });
  typia.assert(exportJob);

  // --- Success validations ---
  // user snapshot matches the authenticated principal
  TestValidator.equals(
    "export user id equals authenticated user id",
    exportJob.user.id,
    authorized.id,
  );
  TestValidator.equals(
    "export user email equals authenticated user email",
    exportJob.user.email,
    authorized.email,
  );

  // exported todos must include both created todos with expected states
  const snapA = exportJob.todos.find((t) => t.id === todoACompleted.id);
  typia.assertGuard<ITodoTodoExportSnapshot>(snapA!);
  TestValidator.predicate(
    "todo A completion reflected as true",
    snapA.completed === true,
  );
  TestValidator.equals("todo A due_date preserved", snapA.due_date, dueDateA);

  const snapB = exportJob.todos.find((t) => t.id === todoB.id);
  typia.assertGuard<ITodoTodoExportSnapshot>(snapB!);
  TestValidator.predicate(
    "todo B default completion is false",
    snapB.completed === false,
  );
  TestValidator.predicate(
    "todo B due_date is omitted (null or undefined)",
    snapB.due_date === null || snapB.due_date === undefined,
  );

  TestValidator.predicate(
    "export includes at least the two created todos",
    exportJob.todos.length >= 2,
  );
  if (exportJob.todos_count !== undefined)
    TestValidator.equals(
      "todos_count equals todos.length when provided",
      exportJob.todos.length,
      exportJob.todos_count,
    );

  // Ensure that no sensitive field names like "password_hash" appear anywhere
  TestValidator.predicate(
    "response must not contain sensitive key name 'password_hash'",
    JSON.stringify(exportJob).includes("password_hash") === false,
  );

  // --- Negative path: unauthenticated request must fail ---
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated export creation should be rejected",
    async () => {
      await api.functional.todo.user.reports.personalData.create(unauthConn, {
        body: {} satisfies ITodoUserPersonalDataExport.ICreate,
      });
    },
  );
}
