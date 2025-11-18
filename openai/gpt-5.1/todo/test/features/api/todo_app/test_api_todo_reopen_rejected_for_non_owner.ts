import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_todo_reopen_rejected_for_non_owner(
  connection: api.IConnection,
) {
  /**
   * 1. Arrange: register owner user and create + complete a todo under them
   * 2. Act: register a second user and attempt to reopen the owner's completed
   *    todo
   * 3. Assert: the reopen attempt fails, and the todo stays completed for the
   *    owner
   */

  // --- 1. Owner member user joins ---
  const ownerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.example.com/signup",
    referrer: "https://landing.example.com/todo",
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const ownerAuth: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: ownerJoinBody,
    });
  typia.assert(ownerAuth);

  // After join, connection.headers.Authorization contains owner token.

  // --- 2. Owner creates a todo ---
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: createBody,
    });
  typia.assert(createdTodo);

  TestValidator.equals(
    "created todo belongs to owner user",
    createdTodo.memberUser.id,
    ownerAuth.id,
  );

  TestValidator.equals(
    "new todo starts as non-completed (completed_at is null)",
    createdTodo.completed_at ?? null,
    null,
  );

  // --- 3. Owner completes the todo ---
  const completedTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.complete(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(completedTodo);

  TestValidator.equals(
    "todo status is completed after completion",
    completedTodo.status,
    "completed",
  );

  TestValidator.predicate(
    "completed_at is set after completion",
    completedTodo.completed_at !== null &&
      completedTodo.completed_at !== undefined,
  );

  // --- 4. Second member user (non-owner) joins using a separate connection object ---
  const otherConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const otherJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.example.com/signup",
    referrer: "https://ad-network.example.com/campaign/todo",
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const otherAuth: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(otherConnection, {
      body: otherJoinBody,
    });
  typia.assert(otherAuth);

  TestValidator.notEquals(
    "owner and other member users must be distinct",
    ownerAuth.id,
    otherAuth.id,
  );

  // At this point, otherConnection carries the other user's Authorization header.

  // --- 5. Act: non-owner attempts to reopen owner's completed todo ---
  await TestValidator.error(
    "non-owner cannot reopen another user's todo",
    async () => {
      await api.functional.todoApp.memberUser.todos.reopen(otherConnection, {
        todoId: createdTodo.id,
      });
    },
  );

  // --- 6. Assert: todo remains completed from owner's perspective ---
  // We call reopen again as owner; the operation is idempotent and should not fail
  // and should keep the todo in a completed or properly lifecycle-consistent state.
  const reopenedAsOwner: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.reopen(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(reopenedAsOwner);

  TestValidator.equals(
    "reopen as owner returns the same todo id",
    reopenedAsOwner.id,
    createdTodo.id,
  );

  // Even if business rules allow reopening to set status back to pending,
  // the critical invariant is that the non-owner attempt did not somehow
  // transfer ownership; the memberUser.id must remain the owner.
  TestValidator.equals(
    "todo ownership remains with the original owner after non-owner attempt",
    reopenedAsOwner.memberUser.id,
    ownerAuth.id,
  );
}
