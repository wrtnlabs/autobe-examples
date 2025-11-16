import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test retrieval of a todo item with complete details to validate data
 * integrity.
 *
 * This test ensures that when a todo item is created with all fields populated
 * (title, description, due date, ownership, session context, and timestamps),
 * the retrieval operation returns the exact same data with complete
 * preservation of all attributes. This validates the complete data lifecycle
 * from creation through retrieval.
 */
export async function test_api_todo_retrieval_with_complete_details(
  connection: api.IConnection,
) {
  // Step 1: User authentication - create user account using API's expected format
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      password_hash: userPassword, // Using same as password for simplicity in test
      status: "pending" as const, // Default status for new users
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create comprehensive todo item with all fields populated
  const todoData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 12,
    }),
    due_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo = await api.functional.todos.create(connection, {
    body: todoData,
  });
  typia.assert(createdTodo);

  // Step 3: Retrieve the todo item and validate complete data integrity
  const retrievedTodo = await api.functional.todos.at(connection, {
    todoId: createdTodo.id,
  });
  typia.assert(retrievedTodo);

  // Validate all core todo fields match the original creation data
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
    "created timestamp should match",
    retrievedTodo.created_at,
    createdTodo.created_at,
  );
  TestValidator.equals(
    "updated timestamp should match",
    retrievedTodo.updated_at,
    createdTodo.updated_at,
  );

  // Validate that timestamps are properly formatted
  TestValidator.predicate(
    "created_at should be valid ISO date-time",
    typeof retrievedTodo.created_at === "string" &&
      retrievedTodo.created_at.includes("T"),
  );
  TestValidator.predicate(
    "updated_at should be valid ISO date-time",
    typeof retrievedTodo.updated_at === "string" &&
      retrievedTodo.updated_at.includes("T"),
  );

  if (retrievedTodo.due_date) {
    TestValidator.predicate(
      "due_date should be valid ISO date-time",
      typeof retrievedTodo.due_date === "string" &&
        retrievedTodo.due_date.includes("T"),
    );
  }

  // Validate that the todo item has proper UUID format for ID
  TestValidator.predicate(
    "todo ID should be valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedTodo.id,
    ),
  );
}
