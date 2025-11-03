import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test that an authenticated user can successfully retrieve their own todo item
 * by ID.
 *
 * This test validates the complete workflow of todo retrieval:
 *
 * 1. User registers with email and password
 * 2. User creates a new todo item with title, description, priority, and due date
 * 3. User retrieves the todo by ID
 * 4. Verify all todo properties are correctly returned including title,
 *    description, status, priority, due date, and timestamps
 *
 * The test ensures users can access their own todos and that the system
 * properly returns complete todo details.
 */
export async function test_api_todo_retrieval_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Register a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(user);
  TestValidator.predicate("user registered successfully", user.id !== null);
  TestValidator.equals("user email matches", user.email, userEmail);
  TestValidator.equals("user status is active", user.status, "active");

  // Step 2: Create a new todo item
  const todoTitle = RandomGenerator.paragraph({ sentences: 3 });
  const todoDescription = RandomGenerator.content({ paragraphs: 2 });
  const todoPriority: "low" | "medium" | "high" = RandomGenerator.pick([
    "low",
    "medium",
    "high",
  ] as const);
  const futureDateMs = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days from now
  const dueDate = new Date(futureDateMs).toISOString().split("T")[0];

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: todoTitle,
        description: todoDescription,
        priority: todoPriority,
        due_date: dueDate,
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(createdTodo);
  TestValidator.predicate("todo created successfully", createdTodo.id !== null);
  TestValidator.equals("todo title matches", createdTodo.title, todoTitle);
  TestValidator.equals(
    "todo description matches",
    createdTodo.description,
    todoDescription,
  );
  TestValidator.equals(
    "todo priority matches",
    createdTodo.priority,
    todoPriority,
  );
  TestValidator.equals("todo due date matches", createdTodo.due_date, dueDate);
  TestValidator.equals("todo status is active", createdTodo.status, "active");
  TestValidator.predicate(
    "todo has creation timestamp",
    createdTodo.created_at !== null,
  );
  TestValidator.predicate(
    "todo has update timestamp",
    createdTodo.updated_at !== null,
  );
  TestValidator.predicate(
    "todo owner id matches",
    createdTodo.todo_app_user_id === user.id,
  );

  // Step 3: Retrieve the todo by ID
  const retrievedTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.at(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(retrievedTodo);

  // Step 4: Verify all properties match
  TestValidator.equals(
    "retrieved todo id matches",
    retrievedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "retrieved todo title matches",
    retrievedTodo.title,
    todoTitle,
  );
  TestValidator.equals(
    "retrieved todo description matches",
    retrievedTodo.description,
    todoDescription,
  );
  TestValidator.equals(
    "retrieved todo status matches",
    retrievedTodo.status,
    "active",
  );
  TestValidator.equals(
    "retrieved todo priority matches",
    retrievedTodo.priority,
    todoPriority,
  );
  TestValidator.equals(
    "retrieved todo due date matches",
    retrievedTodo.due_date,
    dueDate,
  );
  TestValidator.equals(
    "retrieved todo owner matches",
    retrievedTodo.todo_app_user_id,
    user.id,
  );
  TestValidator.equals(
    "retrieved todo created_at matches",
    retrievedTodo.created_at,
    createdTodo.created_at,
  );
  TestValidator.equals(
    "retrieved todo updated_at matches",
    retrievedTodo.updated_at,
    createdTodo.updated_at,
  );
  TestValidator.predicate(
    "completed_at is null for active todo",
    retrievedTodo.completed_at === null ||
      retrievedTodo.completed_at === undefined,
  );
}
