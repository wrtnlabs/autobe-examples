import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test basic todo creation workflow with only required title field.
 *
 * This test validates the minimal todo creation scenario where a user registers
 * a new account, authenticates, and creates a todo item using only the required
 * title field. The test ensures that the API properly initializes default
 * values for optional fields (completion status, priority level) and generates
 * required system fields (id, timestamps).
 *
 * Test workflow:
 *
 * 1. Register a new user account with email and password
 * 2. Authenticate and obtain access token
 * 3. Create a todo item with only the title field
 * 4. Validate response includes all required fields with correct types
 * 5. Verify default values are set correctly (completed=false, priority=medium)
 * 6. Confirm auto-generated fields are present (id, created_at, updated_at)
 */
export async function test_api_todo_creation_basic_with_title_only(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(10);

  const registrationResponse = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
      user_agent: "test-client/1.0",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(registrationResponse);

  // Step 2: Verify authentication token was received
  TestValidator.predicate(
    "access token should be provided after registration",
    !!registrationResponse.token?.access,
  );
  TestValidator.predicate(
    "refresh token should be provided after registration",
    !!registrationResponse.token?.refresh,
  );

  // Step 3: Create a todo item with only title (minimal required data)
  const todoTitle = RandomGenerator.paragraph({ sentences: 3 });

  const createdTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: todoTitle,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(createdTodo);

  // Step 4: Validate response structure and data types
  TestValidator.equals(
    "todo title should match input",
    createdTodo.title,
    todoTitle,
  );

  // Step 5: Verify default values are set correctly
  TestValidator.predicate(
    "todo should not be completed by default",
    createdTodo.completed === false,
  );

  TestValidator.predicate(
    "todo should have medium priority by default",
    createdTodo.priority === "medium",
  );

  TestValidator.predicate(
    "description should be null when not provided",
    createdTodo.description === null || createdTodo.description === undefined,
  );

  TestValidator.predicate(
    "due_date should be null when not provided",
    createdTodo.due_date === null || createdTodo.due_date === undefined,
  );

  TestValidator.predicate(
    "completed_at should be null when todo is not completed",
    createdTodo.completed_at === null || createdTodo.completed_at === undefined,
  );

  // Step 6: Verify auto-generated fields are present
  TestValidator.predicate(
    "todo id should be present as UUID",
    typeof createdTodo.id === "string" && createdTodo.id.length > 0,
  );

  TestValidator.predicate(
    "created_at timestamp should be present",
    typeof createdTodo.created_at === "string" &&
      createdTodo.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at timestamp should be present",
    typeof createdTodo.updated_at === "string" &&
      createdTodo.updated_at.length > 0,
  );

  // Step 7: Verify timestamp consistency
  TestValidator.predicate(
    "updated_at should be equal to or after created_at",
    new Date(createdTodo.updated_at) >= new Date(createdTodo.created_at),
  );
}
