import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test retrieving a specific todo item by its unique identifier to verify all
 * fields are returned correctly.
 *
 * This test validates that users can view complete details of their todo items
 * including title, description, completion status, and temporal metadata. The
 * test follows a complete business workflow:
 *
 * 1. Create a new user account through registration
 * 2. Authenticate and receive JWT tokens
 * 3. Create a todo item with comprehensive data (title, description, status)
 * 4. Retrieve the todo item by its unique ID
 * 5. Validate all fields are accurately returned including system-generated
 *    timestamps
 */
export async function test_api_todo_retrieval_with_complete_details(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();

  const registeredUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: "https://example.com/register" satisfies string &
          tags.Format<"uri">,
        referrer: "https://example.com/home" satisfies string &
          tags.Format<"uri">,
      } satisfies ITodoListUser.IRegister,
    });
  typia.assert(registeredUser);

  // Step 2: Create a todo item with comprehensive data
  const todoTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const todoDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  const todoStatus = RandomGenerator.pick(["complete", "incomplete"] as const);

  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: todoTitle,
        description: todoDescription,
        status: todoStatus,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Step 3: Retrieve the specific todo item by its ID
  const retrievedTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.at(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(retrievedTodo);

  // Step 4: Validate all fields are correctly returned
  TestValidator.equals(
    "retrieved todo ID matches created todo ID",
    retrievedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "retrieved todo title matches input",
    retrievedTodo.title,
    todoTitle,
  );
  TestValidator.equals(
    "retrieved todo description matches input",
    retrievedTodo.description,
    todoDescription,
  );
  TestValidator.equals(
    "retrieved todo status matches input",
    retrievedTodo.status,
    todoStatus,
  );
  TestValidator.equals(
    "retrieved todo user ID matches authenticated user",
    retrievedTodo.todo_list_user_id,
    registeredUser.id,
  );

  // Validate temporal metadata fields are present and properly formatted
  TestValidator.predicate(
    "created_at is present",
    retrievedTodo.created_at !== null && retrievedTodo.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is present",
    retrievedTodo.updated_at !== null && retrievedTodo.updated_at !== undefined,
  );

  // Validate that created_at and updated_at match the created todo
  TestValidator.equals(
    "created_at matches created todo",
    retrievedTodo.created_at,
    createdTodo.created_at,
  );
  TestValidator.equals(
    "updated_at matches created todo",
    retrievedTodo.updated_at,
    createdTodo.updated_at,
  );
}
