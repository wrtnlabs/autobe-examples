import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Ensure that completing a todo requires authenticated member user context.
 *
 * This test verifies that the POST /todoApp/memberUser/todos/{todoId}/complete
 * endpoint enforces member user authentication and that anonymous callers
 * cannot complete todos.
 *
 * Workflow:
 *
 * 1. Register a new member user via POST /auth/memberUser/join and obtain an
 *    authorized session (handled automatically by the SDK via
 *    connection.headers.Authorization).
 * 2. Create a todo via POST /todoApp/memberUser/todos under that member account
 *    and capture its id and initial lifecycle state.
 * 3. Build an unauthenticated connection and attempt to complete the todo using
 *    POST /todoApp/memberUser/todos/{todoId}/complete, expecting the call to
 *    fail.
 * 4. Call the same completion endpoint again using the authenticated connection
 *    and verify that completion now succeeds and updates the todo lifecycle
 *    fields appropriately.
 *
 * Business rules validated:
 *
 * - Only authenticated member users may complete todos.
 * - Unauthorized attempts result in an error and do not prevent later authorized
 *   completion from succeeding.
 */
export async function test_api_todo_complete_authorization_enforced_for_member_user(
  connection: api.IConnection,
) {
  // 1. Register a new member user and obtain authenticated context
  const joinBody = typia.random<ITodoAppMemberUserJoin.IRequest>();
  const member: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a todo under the authenticated member user
  const createBody = typia.random<ITodoAppTodo.ICreate>();
  const todoBefore: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: createBody,
    });
  typia.assert(todoBefore);

  // Verify ownership and initial lifecycle state
  TestValidator.equals(
    "created todo is owned by joined member user",
    todoBefore.memberUser.id,
    member.id,
  );
  TestValidator.equals(
    "newly created todo should not be completed yet",
    todoBefore.completed_at,
    null,
  );

  // 3. Attempt to complete todo without authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated completion must fail",
    async () => {
      await api.functional.todoApp.memberUser.todos.complete(unauthConn, {
        todoId: todoBefore.id,
      });
    },
  );

  // 4. Complete todo with proper authentication
  const todoAfter: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.complete(connection, {
      todoId: todoBefore.id,
    });
  typia.assert(todoAfter);

  // Validate lifecycle changes and ownership remain consistent
  TestValidator.equals(
    "todo id should remain the same after completion",
    todoAfter.id,
    todoBefore.id,
  );
  TestValidator.equals(
    "todo owner should remain the same after completion",
    todoAfter.memberUser.id,
    member.id,
  );
  TestValidator.predicate(
    "completed_at should be non-null after successful completion",
    todoAfter.completed_at !== null && todoAfter.completed_at !== undefined,
  );
}
