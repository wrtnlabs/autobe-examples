import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoTodoCompletion } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodoCompletion";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Cross-user completion update must be forbidden while owner update succeeds.
 *
 * Business goal: Enforce strict ownership on the todo completion toggle API and
 * avoid existence disclosure to other users. A foreign user must not be able to
 * modify another user’s todo, while the legitimate owner can update normally.
 *
 * Steps:
 *
 * 1. Create isolated auth contexts for User A and User B using separate
 *    connections.
 * 2. User A joins and creates a todo; capture its id.
 * 3. User B joins on a different connection.
 * 4. User B attempts to update User A’s todo completion; expect an error.
 * 5. User A updates own todo completion; expect success and validate owner and
 *    final completion state.
 */
export async function test_api_todo_completion_cross_user_forbidden(
  connection: api.IConnection,
) {
  // Prepare isolated connections for each user (no manual header manipulation beyond creation)
  const userAConn: api.IConnection = { ...connection, headers: {} };
  const userBConn: api.IConnection = { ...connection, headers: {} };

  // 1) User A joins (establish authenticated context on userAConn)
  const joinABody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Passw0rd1",
    href: "https://example.com/register",
    referrer: "",
  } satisfies ITodoUser.IJoin;
  const userAAuth = await api.functional.auth.user.join(userAConn, {
    body: joinABody,
  });
  typia.assert(userAAuth);

  // 2) User A creates a todo
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITodoTodo.ICreate;
  const todoA = await api.functional.todo.user.todos.create(userAConn, {
    body: createBody,
  });
  typia.assert(todoA);

  // 3) User B joins on its own connection
  const joinBBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Passw0rd1",
    href: "https://example.com/register",
    referrer: "",
  } satisfies ITodoUser.IJoin;
  const userBAuth = await api.functional.auth.user.join(userBConn, {
    body: joinBBody,
  });
  typia.assert(userBAuth);

  // 4) Cross-user attempt: B tries to update A's todo completion -> expect error
  await TestValidator.error(
    "other user cannot update another user's todo completion",
    async () => {
      const completionBody = {
        completed: true,
      } satisfies ITodoTodoCompletion.IUpdate;
      await api.functional.todo.user.todos.completion.updateCompletion(
        userBConn,
        {
          todoId: todoA.id,
          body: completionBody,
        },
      );
    },
  );

  // 5) Owner (User A) updates completion successfully
  const ownerCompletionBody = {
    completed: true,
  } satisfies ITodoTodoCompletion.IUpdate;
  const updatedByOwner =
    await api.functional.todo.user.todos.completion.updateCompletion(
      userAConn,
      {
        todoId: todoA.id,
        body: ownerCompletionBody,
      },
    );
  typia.assert(updatedByOwner);

  // Business validations
  TestValidator.equals(
    "owner remains the same after valid update",
    updatedByOwner.user.id,
    userAAuth.id,
  );
  TestValidator.equals(
    "todo completed state updated by owner",
    updatedByOwner.completed,
    true,
  );
}
