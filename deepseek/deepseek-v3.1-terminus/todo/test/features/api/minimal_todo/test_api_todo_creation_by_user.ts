import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IMinimalTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMinimalTodoTodo";
import type { IMinimalTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMinimalTodoUser";

/**
 * Test the complete todo creation workflow including user authentication and
 * todo item creation with valid content. This scenario validates that
 * authenticated users can successfully create new todo items with proper
 * content validation, automatic assignment of default values (incomplete
 * status, timestamps), and successful response with system-generated
 * properties.
 */
export async function test_api_todo_creation_by_user(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const userAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies IMinimalTodoUser.ICreate,
  });
  typia.assert(userAuth);

  // Step 2: Create a todo item with valid content (within 1-500 character limit)
  const todoContent = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });

  const createdTodo = await api.functional.minimalTodo.todos.create(
    connection,
    {
      body: {
        content: todoContent,
      } satisfies IMinimalTodoTodo.ICreate,
    },
  );
  typia.assert(createdTodo);

  // Step 3: Validate the todo creation response
  TestValidator.equals(
    "todo content matches input",
    createdTodo.content,
    todoContent,
  );
  TestValidator.predicate(
    "todo is initially not completed",
    !createdTodo.completed,
  );
  TestValidator.predicate(
    "todo has valid content length",
    createdTodo.content.length >= 1 && createdTodo.content.length <= 500,
  );
  TestValidator.predicate(
    "created_at timestamp is valid ISO string",
    typeof createdTodo.created_at === "string" &&
      !isNaN(Date.parse(createdTodo.created_at)),
  );
  TestValidator.predicate(
    "updated_at timestamp is valid ISO string",
    typeof createdTodo.updated_at === "string" &&
      !isNaN(Date.parse(createdTodo.updated_at)),
  );
  TestValidator.equals(
    "deleted_at is null for active todo",
    createdTodo.deleted_at,
    null,
  );
}
