import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Ensure that reopening a todo requires member user authentication and does not
 * succeed when called without a valid Authorization context.
 *
 * Business goal
 *
 * - Verify that the lifecycle transition `completed -> reopened` is protected by
 *   memberUser authentication.
 * - Confirm that an unauthenticated reopen attempt is rejected and does not alter
 *   the todo state.
 *
 * Scenario
 *
 * 1. Join as a new member user using /auth/memberUser/join to obtain an
 *    authenticated context (Authorization header is automatically managed by
 *    the SDK).
 * 2. Create a new todo via /todoApp/memberUser/todos for this member user and
 *    capture its id and initial status.
 * 3. Complete the todo using /todoApp/memberUser/todos/{todoId}/complete and
 *    capture the completed representation.
 * 4. Build a separate unauthenticated connection by shallow cloning the input
 *    `connection` and overriding `headers` with an empty object literal. Never
 *    touch or mutate `headers` on either connection afterwards.
 * 5. Using the unauthenticated connection, attempt to reopen the todo via
 *    /todoApp/memberUser/todos/{todoId}/reopen inside `await
 *    TestValidator.error`, asserting only that some error occurs (do not test
 *    specific HTTP status codes or error payloads).
 * 6. Using the original authenticated connection, successfully call the reopen
 *    endpoint on the same todo and capture the reopened todo.
 * 7. Validate with typia.assert on all non-void responses and use
 *    TestValidator.equals to ensure:
 *
 *    - The todo id is the same across create, complete, and reopen responses.
 *    - The `status` after completion differs from the initial status.
 *    - The `status` after reopening differs from the completed status, proving that
 *         only the authenticated reopen actually changed the lifecycle state.
 */
export async function test_api_todo_reopen_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Register a new member user to obtain an authenticated context.
  const joinRequest = typia.random<ITodoAppMemberUserJoin.IRequest>();

  const authorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinRequest,
    });
  typia.assert(authorized);

  // 2. Create a new todo as this authenticated member user.
  const todoCreateBody = typia.random<ITodoAppTodo.ICreate>();

  const created: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(created);

  // 3. Complete the todo so that reopen has lifecycle semantics.
  const completed: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.complete(connection, {
      todoId: created.id,
    });
  typia.assert(completed);

  // Basic lifecycle sanity check under authenticated context.
  TestValidator.equals(
    "todo id remains stable between create and complete",
    completed.id,
    created.id,
  );
  TestValidator.notEquals(
    "status changes when todo is completed",
    completed.status,
    created.status,
  );

  // 4. Build an unauthenticated connection by cloning and overriding headers.
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Attempt to reopen the todo without authentication and expect failure.
  await TestValidator.error(
    "reopen without authentication must fail",
    async () => {
      await api.functional.todoApp.memberUser.todos.reopen(unauthenticated, {
        todoId: created.id,
      });
    },
  );

  // 6. Reopen with the original authenticated connection.
  const reopened: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.reopen(connection, {
      todoId: created.id,
    });
  typia.assert(reopened);

  // 7. Validate lifecycle and identity invariants.
  TestValidator.equals(
    "todo id remains stable across all lifecycle operations",
    reopened.id,
    created.id,
  );
  TestValidator.equals(
    "todo id remains stable between complete and reopen",
    reopened.id,
    completed.id,
  );
  TestValidator.notEquals(
    "status after reopen differs from completed status",
    reopened.status,
    completed.status,
  );
}
