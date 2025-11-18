import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test that only the owner user may update personal todos, enforcing privacy
 * and business rules.
 *
 * 1. Register User A (first user) and authenticate
 * 2. With User A, create a new todo item (store id and content)
 * 3. Register User B (second user) and authenticate (switch context)
 * 4. User B attempts to update User A's todo item (should fail — forbidden)
 * 5. Assert that update is denied and that the todo content remains as originally
 *    set
 */
export async function test_api_todo_update_ownership_enforcement(
  connection: api.IConnection,
) {
  // 1. Register User A and authenticate
  const userA_email: string = typia.random<string & tags.Format<"email">>();
  const userA_password: string = RandomGenerator.alphaNumeric(12);
  const userA: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userA_email,
        password: userA_password,
        href: "https://test-a.com/signup",
        referrer: "https://google.com",
        ip: null,
      } satisfies ITodoUser.ICreate,
    },
  );
  typia.assert(userA);

  // 2. User A creates a todo
  const todoTitleA = RandomGenerator.paragraph({ sentences: 1 });
  const todoDescA = RandomGenerator.paragraph({ sentences: 3 });
  const todoPayload = {
    title: todoTitleA,
    description: todoDescA,
    due_date: null,
    priority: "medium",
  } satisfies ITodoTodo.ICreate;
  const todoA: ITodoTodo = await api.functional.todo.user.todos.create(
    connection,
    { body: todoPayload },
  );
  typia.assert(todoA);

  // 3. Register User B and authenticate (overwrites connection context)
  const userB_email: string = typia.random<string & tags.Format<"email">>();
  const userB_password: string = RandomGenerator.alphaNumeric(12);
  const userB: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userB_email,
        password: userB_password,
        href: "https://test-b.com/signup",
        referrer: "https://bing.com",
        ip: null,
      } satisfies ITodoUser.ICreate,
    },
  );
  typia.assert(userB);

  // 4. User B attempts to update User A's todo (should be forbidden)
  await TestValidator.error(
    "Only owner can update personal todo: User B must not update User A's todo",
    async () => {
      await api.functional.todo.user.todos.update(connection, {
        todoId: todoA.id,
        body: {
          title: todoTitleA + " (hacked)",
        } satisfies ITodoTodo.IUpdate,
      });
    },
  );
}
