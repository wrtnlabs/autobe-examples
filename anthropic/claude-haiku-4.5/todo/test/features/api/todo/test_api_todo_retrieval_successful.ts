import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful retrieval of a todo item by its unique ID.
 *
 * This test validates the complete workflow of todo management including user
 * registration, todo creation, and successful retrieval with full data
 * validation. The test ensures that all todo fields are correctly returned and
 * match the originally created data.
 *
 * Workflow:
 *
 * 1. User registers and authenticates with valid credentials
 * 2. User creates a new todo with title and optional description
 * 3. User retrieves the created todo by its unique ID
 * 4. Verify retrieved todo contains all expected fields and data
 */
export async function test_api_todo_retrieval_successful(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(12);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const authorizedUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password,
        href,
        referrer,
      } satisfies ITodoAppUser.ICreate,
    });
  typia.assert(authorizedUser);

  // Step 2: Create a new todo
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

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: todoTitle,
        description: todoDescription,
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Verify created todo initial state
  TestValidator.predicate(
    "created todo is not completed",
    !createdTodo.is_completed,
  );
  TestValidator.equals(
    "created todo title matches input",
    createdTodo.title,
    todoTitle,
  );
  TestValidator.equals(
    "created todo description matches input",
    createdTodo.description,
    todoDescription,
  );
  TestValidator.equals(
    "created todo belongs to authenticated user",
    createdTodo.todo_app_user_id,
    authorizedUser.id,
  );

  // Step 3: Retrieve the todo by ID
  const retrievedTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.at(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(retrievedTodo);

  // Step 4: Verify retrieved todo matches created todo
  TestValidator.equals(
    "retrieved todo id matches created todo id",
    retrievedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "retrieved todo title matches created title",
    retrievedTodo.title,
    createdTodo.title,
  );
  TestValidator.equals(
    "retrieved todo description matches created description",
    retrievedTodo.description,
    createdTodo.description,
  );
  TestValidator.equals(
    "retrieved todo completion status matches",
    retrievedTodo.is_completed,
    createdTodo.is_completed,
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
  TestValidator.equals(
    "retrieved todo completed_at matches",
    retrievedTodo.completed_at,
    createdTodo.completed_at,
  );
  TestValidator.equals(
    "retrieved todo user_id matches",
    retrievedTodo.todo_app_user_id,
    createdTodo.todo_app_user_id,
  );

  // Verify embedded user data
  TestValidator.equals(
    "retrieved todo user id matches authenticated user",
    retrievedTodo.user.id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "retrieved todo user email matches authenticated user",
    retrievedTodo.user.email,
    authorizedUser.email,
  );

  // Final comprehensive validation
  TestValidator.predicate(
    "retrieved todo matches created todo completely",
    retrievedTodo.id === createdTodo.id &&
      retrievedTodo.title === createdTodo.title &&
      retrievedTodo.description === createdTodo.description &&
      retrievedTodo.is_completed === createdTodo.is_completed &&
      retrievedTodo.todo_app_user_id === authorizedUser.id &&
      retrievedTodo.user.email === email,
  );
}
