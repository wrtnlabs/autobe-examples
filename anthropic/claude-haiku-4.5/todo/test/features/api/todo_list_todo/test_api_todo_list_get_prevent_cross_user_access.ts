import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate strict user isolation for todo retrieval.
 *
 * Scenario:
 *
 * 1. Register User 1
 * 2. Register User 2
 * 3. User 1 creates a todo (gains todoId)
 * 4. User 2 attempts to GET the todoId belonging to User 1
 * 5. Assert User 2 is denied access (either not found or forbidden).
 */
export async function test_api_todo_list_get_prevent_cross_user_access(
  connection: api.IConnection,
) {
  // 1. Register User 1
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1Password = RandomGenerator.alphaNumeric(12);
  const user1JoinInput = {
    email: user1Email,
    password: user1Password satisfies string as string,
    href: "https://testdomain.com/register",
    referrer: "https://testdomain.com/landing",
    ip: "127.0.0.1",
  } satisfies ITodoListUser.IJoin;
  const user1Auth = await api.functional.auth.user.join(connection, {
    body: user1JoinInput,
  });
  typia.assert(user1Auth);

  // 2. Register User 2
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2Password = RandomGenerator.alphaNumeric(12);
  const user2JoinInput = {
    email: user2Email,
    password: user2Password satisfies string as string,
    href: "https://testdomain.com/register",
    referrer: "https://testdomain.com/landing",
    ip: "127.0.0.1",
  } satisfies ITodoListUser.IJoin;
  const user2Auth = await api.functional.auth.user.join(
    { ...connection, headers: {} },
    { body: user2JoinInput },
  );
  typia.assert(user2Auth);

  // Switch to User 1 session
  await api.functional.auth.user.join(
    { ...connection, headers: {} },
    { body: user1JoinInput },
  );

  // 3. User 1 creates a todo
  const todoInput = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 4,
      wordMax: 12,
    }),
  } satisfies ITodoListTodo.ICreate;
  const user1Todo = await api.functional.todoList.user.todos.create(
    connection,
    { body: todoInput },
  );
  typia.assert(user1Todo);

  // Switch to User 2 session
  await api.functional.auth.user.join(
    { ...connection, headers: {} },
    { body: user2JoinInput },
  );

  // 4. User 2 attempts to get User 1's Todo (should fail access)
  await TestValidator.error(
    "User 2 cannot access User 1's todo by ID",
    async () => {
      await api.functional.todoList.user.todos.at(connection, {
        todoId: user1Todo.id,
      });
    },
  );
}
