import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test retrieval of a specific todo item by its unique identifier.
 *
 * This test validates the complete todo retrieval workflow including user
 * authentication, todo creation, and successful retrieval by ID. It ensures
 * that the retrieved todo contains all expected information including title,
 * description, due date, ownership details, and audit trail information. The
 * test verifies that the response matches the created todo data exactly,
 * demonstrating proper API functionality and data integrity throughout the todo
 * lifecycle.
 */
export async function test_api_todo_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Create authenticated user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "password123",
      password_hash: "$2b$10$placeholderhashedpassword123456789012", // Proper hashed format
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // 2. Create a todo item with realistic test data that complies with DTO constraints
  const todoData = {
    title: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 2,
      wordMax: 6,
    }).substring(0, 255), // MaxLength<255>
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
    }).substring(0, 1000), // MaxLength<1000>
    due_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: todoData,
    },
  );
  typia.assert(createdTodo);

  // 3. Retrieve the created todo by its ID
  const retrievedTodo = await api.functional.todoApp.user.todos.at(connection, {
    todoId: createdTodo.id,
  });
  typia.assert(retrievedTodo);

  // 4. Validate that the retrieved todo matches the created todo exactly
  TestValidator.equals(
    "todo ID should match",
    retrievedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "todo title should match",
    retrievedTodo.title,
    createdTodo.title,
  );
  TestValidator.equals(
    "todo description should match",
    retrievedTodo.description,
    createdTodo.description,
  );
  TestValidator.equals(
    "todo due date should match",
    retrievedTodo.due_date,
    createdTodo.due_date,
  );
  TestValidator.equals(
    "todo created_at should match",
    retrievedTodo.created_at,
    createdTodo.created_at,
  );
  TestValidator.equals(
    "todo updated_at should match",
    retrievedTodo.updated_at,
    createdTodo.updated_at,
  );

  // 5. Verify ownership and audit trail information
  TestValidator.predicate(
    "todo should have valid user ownership",
    retrievedTodo.user !== undefined,
  );
  TestValidator.predicate(
    "todo should have valid session information",
    retrievedTodo.userSession !== undefined,
  );

  // 6. Verify specific ownership relationship
  if (retrievedTodo.user) {
    TestValidator.equals(
      "todo owner email should match user email",
      retrievedTodo.user.email,
      user.email,
    );
  }
}
