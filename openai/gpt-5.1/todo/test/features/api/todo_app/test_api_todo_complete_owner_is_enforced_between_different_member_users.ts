import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Enforce ownership when completing todos between different member users.
 *
 * Business purpose: This E2E test verifies that a todo created by one
 * authenticated member user (User A) cannot be completed by another
 * authenticated member user (User B), and that the todo can still be completed
 * successfully by its rightful owner after the failed cross-user attempt.
 *
 * High-level workflow:
 *
 * 1. Clone the incoming connection into two independent connections (aConnection
 *    and bConnection) so that authentication state for each user is isolated
 *    and managed only by the SDK.
 * 2. On aConnection, register User A via POST /auth/memberUser/join, which also
 *    attaches User A's access token to aConnection.
 * 3. As User A, create a todo via POST /todoApp/memberUser/todos and capture its
 *    id and initial lifecycle fields (especially completed_at).
 * 4. On bConnection, register User B via POST /auth/memberUser/join so that
 *    bConnection is now authenticated as a different member user.
 * 5. As User B, attempt to complete User A's todo via POST
 *    /todoApp/memberUser/todos/{todoId}/complete. This must fail with an error,
 *    enforcing strict ownership and preventing cross-account completion.
 * 6. As User A again (still authenticated on aConnection), call the same complete
 *    endpoint for the same todo id and verify that it succeeds.
 * 7. Validate that the todo id remains stable and that completed_at is set only
 *    after the owner's successful completion, proving that the failed
 *    cross-user attempt did not alter the todo state.
 */
export async function test_api_todo_complete_owner_is_enforced_between_different_member_users(
  connection: api.IConnection,
) {
  // 1. Prepare two independent connections so that auth headers
  //    managed by the SDK do not conflict between User A and User B.
  const aConnection: api.IConnection = { ...connection };
  const bConnection: api.IConnection = { ...connection };

  // 2. Register User A (owner) using /auth/memberUser/join.
  const userAJoinBody = typia.random<ITodoAppMemberUserJoin.IRequest>();
  const userA: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(aConnection, {
      body: userAJoinBody,
    });
  typia.assert(userA);

  // 3. As User A, create a todo using /todoApp/memberUser/todos.
  const createTodoBody = typia.random<ITodoAppTodo.ICreate>();
  const todoOfUserA: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(aConnection, {
      body: createTodoBody,
    });
  typia.assert(todoOfUserA);

  // Basic sanity check: todo should not be completed right after creation.
  TestValidator.equals(
    "todo should be initially pending or non-completed",
    todoOfUserA.completed_at ?? null,
    null,
  );

  // 4. Register User B on a separate connection.
  const userBJoinBody = typia.random<ITodoAppMemberUserJoin.IRequest>();
  const userB: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(bConnection, {
      body: userBJoinBody,
    });
  typia.assert(userB);

  // 5. As User B, attempt to complete User A's todo.
  await TestValidator.error(
    "member user B must not be able to complete member user A's todo",
    async () => {
      await api.functional.todoApp.memberUser.todos.complete(bConnection, {
        todoId: todoOfUserA.id,
      });
    },
  );

  // 6. As User A again (still authenticated on aConnection),
  //    complete the same todo successfully.
  const completedTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.complete(aConnection, {
      todoId: todoOfUserA.id,
    });
  typia.assert(completedTodo);

  // 7. Validate that the todo has transitioned to a completed state
  //    only when completed by its rightful owner.
  TestValidator.equals(
    "completed todo must keep same id as original",
    completedTodo.id,
    todoOfUserA.id,
  );

  TestValidator.predicate(
    "completed_at must be set after successful completion by owner",
    completedTodo.completed_at !== null &&
      completedTodo.completed_at !== undefined,
  );
}
