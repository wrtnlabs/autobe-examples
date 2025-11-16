import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that an authenticated user can successfully retrieve detailed
 * information for their own todo item by its unique ID.
 *
 * This test validates the complete workflow of creating a todo and then
 * retrieving it to verify all fields are returned correctly including title,
 * description, status, priority, due_date, completed flag, and timestamps
 * (created_at, updated_at).
 *
 * Steps:
 *
 * 1. Register a new user account and obtain authentication tokens
 * 2. Create a todo item with complete details under the authenticated user
 * 3. Retrieve the todo item by its unique ID
 * 4. Validate that all returned properties match the created todo
 * 5. Verify the response contains all expected ITodoListTodo schema fields
 */
export async function test_api_todo_retrieval_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create a todo item with complete details
  const todoTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const todoDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  const todoStatus = RandomGenerator.pick([
    "pending",
    "in_progress",
    "completed",
    "cancelled",
  ] as const);
  const todoPriority = RandomGenerator.pick(["low", "medium", "high"] as const);
  const todoDueDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: todoTitle,
        description: todoDescription,
        status: todoStatus,
        priority: todoPriority,
        due_date: todoDueDate,
        completed: false,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Step 3: Retrieve the todo item by its ID
  const retrievedTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.at(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(retrievedTodo);

  // Step 4: Validate that all returned properties match the created todo
  TestValidator.equals("todo ID matches", retrievedTodo.id, createdTodo.id);
  TestValidator.equals(
    "todo title matches",
    retrievedTodo.title,
    createdTodo.title,
  );
  TestValidator.equals(
    "todo description matches",
    retrievedTodo.description,
    createdTodo.description,
  );
  TestValidator.equals(
    "todo status matches",
    retrievedTodo.status,
    createdTodo.status,
  );
  TestValidator.equals(
    "todo priority matches",
    retrievedTodo.priority,
    createdTodo.priority,
  );
  TestValidator.equals(
    "todo due_date matches",
    retrievedTodo.due_date,
    createdTodo.due_date,
  );
  TestValidator.equals(
    "todo completed flag matches",
    retrievedTodo.completed,
    createdTodo.completed,
  );
  TestValidator.equals(
    "todo created_at matches",
    retrievedTodo.created_at,
    createdTodo.created_at,
  );
  TestValidator.equals(
    "todo updated_at matches",
    retrievedTodo.updated_at,
    createdTodo.updated_at,
  );
}
