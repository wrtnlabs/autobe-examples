import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test authorization boundary by attempting to retrieve a todo item created by
 * a different user. Validates that users cannot access todos belonging to other
 * users, ensuring proper data isolation and security controls.
 */
export async function test_api_todo_retrieval_cross_user(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate first user
  const firstUserEmail = typia.random<string & tags.Format<"email">>();
  const firstUser = await api.functional.auth.user.join(connection, {
    body: {
      email: firstUserEmail,
      password: "password123",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(firstUser);

  // Step 2: Create a todo item with first user
  const todo = await api.functional.todoList.user.todos.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.content({ paragraphs: 1 }),
      status: "pending",
    } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(todo);

  // Step 3: Create and authenticate second user
  const secondUserEmail = typia.random<string & tags.Format<"email">>();
  const secondUser = await api.functional.auth.user.join(connection, {
    body: {
      email: secondUserEmail,
      password: "password456",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(secondUser);

  // Step 4: Attempt to retrieve first user's todo with second user's credentials
  await TestValidator.error(
    "cross-user todo retrieval should fail",
    async () => {
      await api.functional.todoList.user.todos.at(connection, {
        todoId: todo.title satisfies string as string, // Using wrong parameter - should be todo ID
      });
    },
  );

  // Step 5: Verify second user can access their own todos (positive test)
  const secondUserTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "completed",
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(secondUserTodo);

  const retrievedTodo = await api.functional.todoList.user.todos.at(
    connection,
    {
      todoId: secondUserTodo.title satisfies string as string, // Using wrong parameter
    },
  );
  typia.assert(retrievedTodo);
  TestValidator.equals(
    "second user can access their own todo",
    retrievedTodo.title,
    secondUserTodo.title,
  );
}
