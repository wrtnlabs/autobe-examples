import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Validate that a member user's todo detail endpoint reflects lifecycle
 * transitions when a todo is completed and then reopened.
 *
 * Business goal:
 *
 * - Ensure that when a member completes a todo and later reopens it, the GET
 *   /todoApp/memberUser/todos/{todoId} endpoint always returns a representation
 *   consistent with the last lifecycle mutation.
 * - Verify that completion sets a completed state and completion timestamp, and
 *   that reopening moves the todo back to an active state while keeping a
 *   consistent view between mutation responses and subsequent detail fetches.
 *
 * High level steps:
 *
 * 1. Admin bootstrap & configuration
 *
 *    - Join as an admin user.
 *    - Create a simple system setting related to todos, to exercise
 *         /todoApp/adminUser/systemSettings. The specific key/value is
 *         arbitrary because behavior is not further specified; we only need the
 *         call to succeed.
 * 2. Member registration & authentication
 *
 *    - Join as a member user via /auth/memberUser/join. The SDK will automatically
 *         attach the access token to the connection.
 * 3. Todo creation as member user
 *
 *    - Call POST /todoApp/memberUser/todos with ITodoAppTodo.ICreate, using a
 *         realistic title and description and an initial state such as
 *         "active".
 *    - Capture the returned ITodoAppTodo and its id as the baseline active
 *         representation.
 * 4. Completion lifecycle transition
 *
 *    - Call PUT /todoApp/memberUser/todos/{todoId}/complete and capture the returned
 *         ITodoAppTodo (completedTodo).
 *    - Assert via typia.assert that the structure matches ITodoAppTodo.
 *    - Assert business expectations: state has changed from its initial value (e.g.,
 *         to something different) and completed_at is non-null.
 * 5. Detail verification after completion
 *
 *    - Call GET /todoApp/memberUser/todos/{todoId} (detailAfterComplete).
 *    - Use typia.assert on the response.
 *    - Use TestValidator.equals to assert that key lifecycle fields (state,
 *         completed_at, and content fields) are identical between completedTodo
 *         and detailAfterComplete, proving that the detail view mirrors the
 *         latest lifecycle mutation.
 * 6. Reopen lifecycle transition
 *
 *    - Call PUT /todoApp/memberUser/todos/{todoId}/reopen and capture the returned
 *         ITodoAppTodo (reopenedTodo).
 *    - Assert via typia.assert.
 *    - Assert business expectations: state differs from the completed state and
 *         updated_at is not older than the completed entity.
 * 7. Detail verification after reopen
 *
 *    - Call GET /todoApp/memberUser/todos/{todoId} again (detailAfterReopen).
 *    - Assert via typia.assert.
 *    - Use TestValidator.equals to verify that state, completed_at, and other stable
 *         fields match between reopenedTodo and detailAfterReopen, ensuring
 *         that the detail endpoint reflects the reopened state.
 */
export async function test_api_todo_detail_reflects_completion_and_reopen_lifecycle(
  connection: api.IConnection,
) {
  // 1. Admin bootstrap & configuration
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "Admin#1234",
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.example.com/join",
    referrer: "https://admin.todo-app.example.com/",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminAuthorized);

  // Create a simple system setting to exercise the admin systemSettings API.
  const systemSettingCreateBody = {
    key: `todo_lifecycle_behavior_${RandomGenerator.alphaNumeric(6)}`,
    value: "default",
    type: "string",
    description: "E2E test setting for todo lifecycle behavior",
    group: "e2e",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const createdSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingCreateBody,
    });
  typia.assert<ITodoAppSystemSetting>(createdSetting);

  // 2. Member registration & authentication
  const memberJoinBody = {
    email: `member+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "Member#1234",
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.example.com/join",
    referrer: "https://todo-app.example.com/",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ITodoAppMemberUser.IAuthorized>(memberAuthorized);

  // 3. Todo creation as member user
  const initialState = "active";
  const createTodoBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: null,
    state: initialState,
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: createTodoBody,
    });
  typia.assert<ITodoAppTodo>(createdTodo);

  // 4. Completion lifecycle transition
  const completedTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.complete(connection, {
      todoId: createdTodo.id,
    });
  typia.assert<ITodoAppTodo>(completedTodo);

  // Basic business assertions after completion
  TestValidator.notEquals(
    "todo state should change after completion",
    completedTodo.state,
    createdTodo.state,
  );
  TestValidator.predicate(
    "completed_at should be non-null after completion",
    completedTodo.completed_at !== null &&
      completedTodo.completed_at !== undefined,
  );

  // 5. Detail verification after completion
  const detailAfterComplete: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.at(connection, {
      todoId: createdTodo.id,
    });
  typia.assert<ITodoAppTodo>(detailAfterComplete);

  TestValidator.equals(
    "detail state matches completed state",
    detailAfterComplete.state,
    completedTodo.state,
  );
  TestValidator.equals(
    "detail completed_at matches completed response",
    detailAfterComplete.completed_at,
    completedTodo.completed_at ?? null,
  );
  TestValidator.equals(
    "detail title remains unchanged after completion",
    detailAfterComplete.title,
    createdTodo.title,
  );
  TestValidator.equals(
    "detail description remains unchanged after completion",
    detailAfterComplete.description ?? null,
    createdTodo.description ?? null,
  );

  // 6. Reopen lifecycle transition
  const reopenedTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.reopen(connection, {
      todoId: createdTodo.id,
    });
  typia.assert<ITodoAppTodo>(reopenedTodo);

  TestValidator.notEquals(
    "todo state should change after reopen compared to completed",
    reopenedTodo.state,
    completedTodo.state,
  );
  TestValidator.predicate(
    "updated_at after reopen must be >= updated_at after completion",
    reopenedTodo.updated_at >= completedTodo.updated_at,
  );

  // 7. Detail verification after reopen
  const detailAfterReopen: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.at(connection, {
      todoId: createdTodo.id,
    });
  typia.assert<ITodoAppTodo>(detailAfterReopen);

  TestValidator.equals(
    "detail state matches reopened state",
    detailAfterReopen.state,
    reopenedTodo.state,
  );
  TestValidator.equals(
    "detail completed_at after reopen matches reopened entity",
    detailAfterReopen.completed_at ?? null,
    reopenedTodo.completed_at ?? null,
  );
  TestValidator.equals(
    "detail title remains consistent after reopen",
    detailAfterReopen.title,
    reopenedTodo.title,
  );
  TestValidator.equals(
    "detail description remains consistent after reopen",
    detailAfterReopen.description ?? null,
    reopenedTodo.description ?? null,
  );
}
