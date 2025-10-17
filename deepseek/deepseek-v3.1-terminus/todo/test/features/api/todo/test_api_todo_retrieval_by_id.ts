import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IMinimalTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMinimalTodoTodo";
import type { IMinimalTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMinimalTodoUser";

/**
 * Test the complete workflow of retrieving a specific todo item by its ID.
 *
 * This test validates the end-to-end process of todo retrieval, starting from
 * user authentication, through todo creation, and finally verifying that the
 * todo can be accurately retrieved by its ID. The test ensures that all todo
 * properties including content, completion status, and timestamps are properly
 * returned and match the original creation data.
 */
export async function test_api_todo_retrieval_by_id(
  connection: api.IConnection,
) {
  // Step 1: User registration and authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies IMinimalTodoUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create a todo item with realistic content that meets constraints
  const todoContent = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 15,
  }).substring(0, 500); // Ensure content length constraint is met

  const createdTodo = await api.functional.minimalTodo.todos.create(
    connection,
    {
      body: {
        content: todoContent,
      } satisfies IMinimalTodoTodo.ICreate,
    },
  );
  typia.assert(createdTodo);

  // Step 3: Retrieve the todo by its ID
  const retrievedTodo = await api.functional.minimalTodo.todos.at(connection, {
    todoId: createdTodo.id,
  });
  typia.assert(retrievedTodo);

  // Step 4: Validate business logic - retrieved todo should match created todo
  TestValidator.equals(
    "retrieved todo ID should match created todo ID",
    retrievedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "retrieved todo content should match created todo content",
    retrievedTodo.content,
    createdTodo.content,
  );
  TestValidator.equals(
    "retrieved todo completion status should be false",
    retrievedTodo.completed,
    false,
  );
  TestValidator.equals(
    "retrieved todo should not be deleted",
    retrievedTodo.deleted_at,
    null,
  );

  // Step 5: Validate timestamp consistency between creation and retrieval
  TestValidator.equals(
    "created_at timestamp should remain consistent",
    retrievedTodo.created_at,
    createdTodo.created_at,
  );
  TestValidator.equals(
    "updated_at timestamp should remain consistent",
    retrievedTodo.updated_at,
    createdTodo.updated_at,
  );
}
