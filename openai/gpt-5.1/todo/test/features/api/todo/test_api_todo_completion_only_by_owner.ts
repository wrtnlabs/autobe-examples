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
 * Validate that only the owning todoUser can complete a Todo.
 *
 * Business goals:
 *
 * - A todo created by user A cannot be completed by user B.
 * - Cross-user isolation is enforced by returning an error for non-owners,
 *   without relying on specific HTTP status codes.
 * - The happy-path behavior (owner can complete their own todo) still works when
 *   proper statuses exist.
 *
 * Steps:
 *
 * 1. Register and authenticate a todoAdmin, then create two statuses:
 *
 *    - ACTIVE (default, active)
 *    - COMPLETED (non-default, active)
 * 2. Register todoUser A and todoUser B, each with their own credentials.
 * 3. As todoUser A, create a Todo in ACTIVE status.
 * 4. Switch to todoUser B and attempt to complete A's Todo; assert that the call
 *    fails (ownership enforcement).
 * 5. Switch back to todoUser A and successfully complete the Todo, asserting it
 *    transitions to COMPLETED and has a non-null completed_at.
 */
export async function test_api_todo_completion_only_by_owner(
  connection: api.IConnection,
) {
  // 1. Admin bootstrap: join and login, then create ACTIVE and COMPLETED statuses.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://admin.todoapp.local/join",
    referrer: "https://admin.todoapp.local/",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Explicit login to exercise login flow and ensure token refresh behavior.
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.todoapp.local/login",
    referrer: "https://admin.todoapp.local/",
  } satisfies ITodoAppTodoAdminLogin.IRequest;

  const adminLoggedIn: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // Create ACTIVE status (default, active)
  const activeStatusBody = {
    code: "ACTIVE",
    label: "Active",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "core",
    sort_order: 1 as number & tags.Type<"int32">,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const activeStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: activeStatusBody,
    });
  typia.assert(activeStatus);

  // Create COMPLETED status (non-default, active)
  const completedStatusBody = {
    code: "COMPLETED",
    label: "Completed",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "core",
    sort_order: 2 as number & tags.Type<"int32">,
    is_default: false,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const completedStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: completedStatusBody,
    });
  typia.assert(completedStatus);

  // 2. Register todoUser A and B.
  const userAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todoapp.local/signup",
    referrer: "https://todoapp.local/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userAAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userAJoinBody,
    });
  typia.assert(userAAuthorized);

  const userBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todoapp.local/signup",
    referrer: "https://todoapp.local/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userBAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userBJoinBody,
    });
  typia.assert(userBAuthorized);

  // Explicit login as user A to ensure we are in A's context.
  const userALoginBody = {
    email: userAJoinBody.email,
    password: userAJoinBody.password,
    ip: null,
    href: "https://todoapp.local/login",
    referrer: "https://todoapp.local/landing",
  } satisfies ITodoAppTodoUserLogin.IRequest;

  const userALoggedIn: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.login(connection, {
      body: userALoginBody,
    });
  typia.assert(userALoggedIn);

  // 3. As user A, create an ACTIVE todo.
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status_code: activeStatus.code,
  } satisfies ITodoAppTodo.ICreate;

  const todoOwnedByA: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(todoOwnedByA);

  TestValidator.equals(
    "new todo should initially be ACTIVE",
    todoOwnedByA.status.code,
    "ACTIVE",
  );

  // 4. Switch to user B and attempt unauthorized completion.
  const userBLoginBody = {
    email: userBJoinBody.email,
    password: userBJoinBody.password,
    ip: null,
    href: "https://todoapp.local/login",
    referrer: "https://todoapp.local/landing",
  } satisfies ITodoAppTodoUserLogin.IRequest;

  const userBLoggedIn: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.login(connection, {
      body: userBLoginBody,
    });
  typia.assert(userBLoggedIn);

  await TestValidator.error(
    "non-owner cannot complete another user's todo",
    async () => {
      await api.functional.todoApp.todoUser.todos.complete(connection, {
        todoId: todoOwnedByA.id,
      });
    },
  );

  // 5. Switch back to user A and complete successfully.
  const userALoggedInAgain: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.login(connection, {
      body: userALoginBody,
    });
  typia.assert(userALoggedInAgain);

  const completedTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.complete(connection, {
      todoId: todoOwnedByA.id,
    });
  typia.assert(completedTodo);

  TestValidator.equals(
    "owner completion should set status to COMPLETED",
    completedTodo.status.code,
    completedStatus.code,
  );

  TestValidator.predicate(
    "completed_at should be set after successful completion",
    completedTodo.completed_at !== null &&
      completedTodo.completed_at !== undefined,
  );
}
