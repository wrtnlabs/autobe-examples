import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Ensure POST /todo/user/todos requires authentication and succeeds after user
 * joins.
 *
 * Workflow:
 *
 * 1. Try to create a todo with an unauthenticated connection (should error)
 * 2. Join a new user via /auth/user/join (token is applied automatically)
 * 3. Create a todo with the authenticated connection and validate business
 *    defaults
 */
export async function test_api_todo_creation_requires_authentication(
  connection: api.IConnection,
) {
  // 1) Unauthenticated attempt should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const unauthTitle: string = RandomGenerator.paragraph({ sentences: 3 });
  await TestValidator.error(
    "unauthenticated create must be rejected",
    async () => {
      await api.functional.todo.user.todos.create(unauthConn, {
        body: {
          title: unauthTitle,
        } satisfies ITodoTodo.ICreate,
      });
    },
  );

  // 2) Join a user (establish authenticated context on main connection)
  const joinBody = typia.random<ITodoUser.IJoin>();
  const authorized: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: joinBody },
  );
  typia.assert(authorized);

  // 3) Create a todo as authenticated user
  const title: string = RandomGenerator.paragraph({ sentences: 3 });
  const todo: ITodoTodo = await api.functional.todo.user.todos.create(
    connection,
    {
      body: {
        title,
      } satisfies ITodoTodo.ICreate,
    },
  );
  typia.assert(todo);

  // Business validations
  TestValidator.equals("created todo echoes title", todo.title, title);
  TestValidator.equals("completed defaults to false", todo.completed, false);
  TestValidator.equals(
    "todo belongs to authenticated user (id)",
    todo.user.id,
    authorized.id,
  );
  TestValidator.equals(
    "todo belongs to authenticated user (email)",
    todo.user.email,
    authorized.email,
  );
}
