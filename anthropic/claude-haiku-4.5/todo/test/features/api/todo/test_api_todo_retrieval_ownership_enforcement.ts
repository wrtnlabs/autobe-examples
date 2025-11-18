import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that users can only retrieve their own todos.
 *
 * This test validates ownership-based access control for todo retrieval. Two
 * users are registered, each creates their own todo items. Then each user
 * attempts to retrieve the other user's todo, which should be rejected with an
 * error (403 Forbidden or 404 Not Found). This ensures that the API enforces
 * ownership restrictions and prevents unauthorized cross-user access.
 *
 * Steps:
 *
 * 1. Register User A and create a todo
 * 2. Register User B and create a todo
 * 3. User A attempts to retrieve User B's todo (should fail)
 * 4. User B attempts to retrieve User A's todo (should fail)
 * 5. Verify each user can retrieve their own todo (success cases)
 */
export async function test_api_todo_retrieval_ownership_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Register User A
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userAPassword = "SecurePass123";
  const userAAuth: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userAEmail,
        password: userAPassword,
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(userAAuth);

  // Step 2: User A creates a todo
  const todoABody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    priority: "high" as const,
  } satisfies ITodoListTodo.ICreate;

  const todoA: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: todoABody,
    },
  );
  typia.assert(todoA);

  // Step 3: Register User B with fresh connection
  const userBConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userBPassword = "AnotherPass456";
  const userBAuth: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(userBConnection, {
      body: {
        email: userBEmail,
        password: userBPassword,
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(userBAuth);

  // Step 4: User B creates a todo
  const todoBBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    priority: "medium" as const,
  } satisfies ITodoListTodo.ICreate;

  const todoB: ITodoListTodo = await api.functional.todoList.user.todos.create(
    userBConnection,
    {
      body: todoBBody,
    },
  );
  typia.assert(todoB);

  // Step 5: User A attempts to retrieve User B's todo (should fail)
  await TestValidator.error(
    "User A should not be able to retrieve User B's todo",
    async () => {
      await api.functional.todoList.user.todos.at(connection, {
        todoId: todoB.id,
      });
    },
  );

  // Step 6: User B attempts to retrieve User A's todo (should fail)
  await TestValidator.error(
    "User B should not be able to retrieve User A's todo",
    async () => {
      await api.functional.todoList.user.todos.at(userBConnection, {
        todoId: todoA.id,
      });
    },
  );

  // Step 7: Verify User A can retrieve their own todo
  const retrievedTodoA: ITodoListTodo =
    await api.functional.todoList.user.todos.at(connection, {
      todoId: todoA.id,
    });
  typia.assert(retrievedTodoA);
  TestValidator.equals(
    "User A can retrieve their own todo",
    retrievedTodoA.id,
    todoA.id,
  );

  // Step 8: Verify User B can retrieve their own todo
  const retrievedTodoB: ITodoListTodo =
    await api.functional.todoList.user.todos.at(userBConnection, {
      todoId: todoB.id,
    });
  typia.assert(retrievedTodoB);
  TestValidator.equals(
    "User B can retrieve their own todo",
    retrievedTodoB.id,
    todoB.id,
  );
}
