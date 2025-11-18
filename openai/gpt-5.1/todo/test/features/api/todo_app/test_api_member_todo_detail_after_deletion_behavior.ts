import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Verify todo detail visibility behavior after deletion for a member user.
 *
 * Business context: A member user owns todo items stored in todo_app_todos.
 * When a todo is deleted via the member-facing DELETE endpoint, the system may
 * either logically delete (soft delete) by setting deleted_at or fully hide the
 * record from normal member queries. This test validates how the GET
 * /todoApp/memberUser/todos/{todoId} endpoint behaves after such a deletion
 * from the perspective of the owning member user.
 *
 * Steps:
 *
 * 1. Register a new member user via POST /auth/memberUser/join to obtain an
 *    authenticated context (token is wired into connection by the SDK).
 * 2. Create a new todo for that member via POST /todoApp/memberUser/todos using a
 *    simple, deterministic title/description payload.
 * 3. Delete the todo via DELETE /todoApp/memberUser/todos/{todoId}.
 * 4. Attempt to fetch the todo again via GET /todoApp/memberUser/todos/{todoId}
 *    and observe behavior:
 *
 *    - Either the call fails (any error), which implies deleted todos are hidden
 *         from the owner; or
 *    - The call succeeds and returns ITodoAppTodo with deleted_at non-null,
 *         indicating soft-deleted todos remain visible but marked as deleted.
 * 5. Assert core invariants like id stability, ownership, and type safety using
 *    typia.assert and TestValidator.
 */
export async function test_api_member_todo_detail_after_deletion_behavior(
  connection: api.IConnection,
) {
  // 1. Register a new member user and obtain authenticated context
  const joinBody = typia.random<ITodoAppMemberUserJoin.IRequest>();

  const authorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppMemberuser.IAuthorized>(authorized);

  // 2. Create a todo for this member user
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: createBody,
    });
  typia.assert<ITodoAppTodo>(createdTodo);

  // Basic invariants on created todo
  TestValidator.equals(
    "created todo title matches request body",
    createdTodo.title,
    createBody.title,
  );
  TestValidator.equals(
    "created todo owner matches member user id",
    createdTodo.memberUser.id,
    authorized.id,
  );
  TestValidator.predicate(
    "created todo should not be marked as deleted",
    createdTodo.deleted_at === null || createdTodo.deleted_at === undefined,
  );

  // 3. Delete the todo via memberUser delete endpoint
  const deletedView: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.erase(connection, {
      todoId: createdTodo.id,
    });
  typia.assert<ITodoAppTodo>(deletedView);

  // Invariants after deletion
  TestValidator.equals(
    "deleted view id matches original todo id",
    deletedView.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "deleted view owner matches member user id",
    deletedView.memberUser.id,
    authorized.id,
  );
  TestValidator.predicate(
    "deleted view updated_at is not before created_at",
    deletedView.updated_at >= deletedView.created_at,
  );

  // 4. Attempt to fetch the deleted todo again
  let fetchSucceeded = false;
  let fetchedTodo: ITodoAppTodo | null = null;

  try {
    fetchedTodo = await api.functional.todoApp.memberUser.todos.at(connection, {
      todoId: createdTodo.id,
    });
    fetchSucceeded = true;
  } catch (exp) {
    // Any error here is acceptable and means deleted todos are hidden.
    fetchSucceeded = false;
  }

  if (fetchSucceeded && fetchedTodo !== null) {
    // Case: deleted todos remain visible but must be clearly marked as deleted
    typia.assert<ITodoAppTodo>(fetchedTodo);

    TestValidator.equals(
      "fetched-after-delete todo id matches original",
      fetchedTodo.id,
      createdTodo.id,
    );
    TestValidator.equals(
      "fetched-after-delete owner matches member user id",
      fetchedTodo.memberUser.id,
      authorized.id,
    );
    TestValidator.predicate(
      "fetched-after-delete todo should be marked as deleted (deleted_at non-null)",
      fetchedTodo.deleted_at !== null && fetchedTodo.deleted_at !== undefined,
    );
  } else {
    // Case: deleted todos are completely hidden; only assert that fetch failed.
    TestValidator.predicate(
      "fetching deleted todo should not succeed",
      fetchSucceeded === false,
    );
  }
}
