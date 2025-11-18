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
 * Verify that a member user cannot reopen another member's todo.
 *
 * Business context:
 *
 * - The todoApp service exposes lifecycle operations for todos owned by
 *   authenticated member users.
 * - Reopening a todo (PUT /todoApp/memberUser/todos/{todoId}/reopen) must only be
 *   permitted for the owning member.
 * - Cross-account attempts must fail and must not change the todo's underlying
 *   lifecycle state.
 *
 * Test steps:
 *
 * 1. Bootstrap system-level configuration as an admin user:
 *
 *    - Register an admin via POST /auth/adminUser/join.
 *    - Create at least one system setting via POST /todoApp/adminUser/systemSettings
 *         to simulate a configured environment for todo lifecycle.
 * 2. Register Member A and create + complete a todo:
 *
 *    - Join as Member A via POST /auth/memberUser/join.
 *    - As Member A, create a todo using POST /todoApp/memberUser/todos with a valid
 *         ITodoAppTodo.ICreate payload (non-empty title, optional
 *         description/due_date, and an initial state like "active").
 *    - Complete the todo as Member A via PUT
 *         /todoApp/memberUser/todos/{todoId}/complete. Capture the completed
 *         entity as `completedTodo` and assert that it matches the created
 *         todo's id and reflects completion semantics (for example,
 *         `completed_at` is not null).
 * 3. Register Member B as a separate member user:
 *
 *    - Call POST /auth/memberUser/join again with a different email to create Member
 *         B. The SDK automatically switches the connection's Authorization
 *         header to Member B's access token.
 * 4. Attempt forbidden reopen as Member B:
 *
 *    - While authenticated as Member B, attempt to call PUT
 *         /todoApp/memberUser/todos/{todoId}/reopen on Member A's todo id.
 *    - Use TestValidator.error with an async callback to assert that the reopen call
 *         fails (indicating authorization is enforced). Do not validate
 *         specific HTTP status codes or error payloads.
 * 5. Invariant reasoning about state:
 *
 *    - Because we cannot re-fetch the todo by id (no GET
 *         /todoApp/memberUser/todos/{todoId} endpoint in the provided SDK), we
 *         treat the failure of the reopen attempt as evidence that Member B
 *         cannot change the lifecycle state of Member A's todo.
 *    - The fact that we previously obtained `completedTodo` in a completed state and
 *         do not see any successful reopen response suffices to validate the
 *         main business rule: only the owner can perform the reopen operation.
 */
export async function test_api_todo_reopen_forbidden_for_non_owner_member(
  connection: api.IConnection,
) {
  // 1. Bootstrap system as admin: join and create a system setting
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.local/join",
    referrer: "https://admin.todo-app.local/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const systemSettingCreateBody = {
    key: "max_active_todos_per_user",
    value: "100",
    type: "int",
    description: "Maximum number of active todos a user can have concurrently.",
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const createdSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingCreateBody,
    });
  typia.assert(createdSetting);

  // 2. Register Member A and create + complete a todo
  const memberAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.local/memberA/join",
    referrer: "https://todo-app.local/landing",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberAAuthorized);

  const memberATodoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: new Date().toISOString(),
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const todoOfMemberA: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: memberATodoCreateBody,
    });
  typia.assert(todoOfMemberA);

  // Complete the todo as Member A
  const completedTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.complete(connection, {
      todoId: todoOfMemberA.id,
    });
  typia.assert(completedTodo);

  TestValidator.equals(
    "completed todo must preserve original id",
    completedTodo.id,
    todoOfMemberA.id,
  );

  // If completed_at is present, it should be non-null to indicate completion
  await TestValidator.predicate(
    "todo should be in completed state",
    async () => {
      if (
        completedTodo.completed_at !== null &&
        completedTodo.completed_at !== undefined
      ) {
        return true;
      }
      // Even if completed_at is null, we still consider the test inconclusive
      // about internal lifecycle naming, but this predicate enforces the
      // expectation that completion sets a timestamp when supported.
      return false;
    },
  );

  // 3. Register Member B as another member user
  const memberBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.local/memberB/join",
    referrer: "https://todo-app.local/landing",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberBAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberBAuthorized);

  // 4. Attempt forbidden reopen as Member B
  await TestValidator.error(
    "non-owner member cannot reopen another user's todo",
    async () => {
      await api.functional.todoApp.memberUser.todos.reopen(connection, {
        todoId: todoOfMemberA.id,
      });
    },
  );
}
