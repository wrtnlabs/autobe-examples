import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test successful retrieval of an existing todo item.
 *
 * This test validates the complete workflow of creating a todo item and then
 * retrieving it by its ID. It verifies that all fields are correctly preserved
 * during storage and retrieval, including auto-generated fields like ID and
 * timestamps. The test ensures that the API returns a complete todo object with
 * all metadata intact and in the correct format.
 *
 * Test workflow:
 *
 * 1. User registration and authentication
 * 2. Create a new todo item with all fields
 * 3. Retrieve the created todo by ID
 * 4. Validate all fields match between created and retrieved todo
 * 5. Verify auto-generated fields are present and correctly preserved
 * 6. Confirm response structure matches ITodoListTodo schema
 */
export async function test_api_todo_retrieval_existing_todo(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(12);

  const authorized = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(authorized);

  // Step 2: Create a todo item with all fields
  const todoTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 2,
    wordMax: 8,
  });
  const todoDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 3,
    sentenceMax: 5,
    wordMin: 3,
    wordMax: 10,
  });
  const todoPriority = RandomGenerator.pick(["low", "medium", "high"] as const);

  const futureDateMs = new Date().getTime() + 7 * 24 * 60 * 60 * 1000; // 7 days from now
  const todoDueDate = new Date(futureDateMs).toISOString();

  const createdTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: todoTitle,
        description: todoDescription,
        priority: todoPriority,
        due_date: todoDueDate,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(createdTodo);

  // Step 3: Retrieve the created todo by ID
  const retrievedTodo = await api.functional.todoList.user.todos.at(
    connection,
    {
      todoId: createdTodo.id,
    },
  );
  typia.assert(retrievedTodo);

  // Step 4: Validate all fields match between created and retrieved todo
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
    "todo completed status matches",
    retrievedTodo.completed,
    createdTodo.completed,
  );

  // Step 5: Verify auto-generated fields are correctly preserved
  TestValidator.equals(
    "created_at timestamp preserved",
    retrievedTodo.created_at,
    createdTodo.created_at,
  );

  TestValidator.equals(
    "updated_at timestamp preserved",
    retrievedTodo.updated_at,
    createdTodo.updated_at,
  );

  // Step 6: Verify completion status reflects initial state
  TestValidator.equals(
    "todo should initially be incomplete",
    retrievedTodo.completed,
    false,
  );

  TestValidator.equals(
    "todo completion timestamp should be null for incomplete todo",
    retrievedTodo.completed_at,
    null,
  );
}
