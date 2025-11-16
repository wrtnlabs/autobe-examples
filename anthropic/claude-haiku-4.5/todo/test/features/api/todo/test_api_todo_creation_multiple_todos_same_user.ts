import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test multiple todo creation by a single authenticated user.
 *
 * Validates that a single authenticated user can create multiple independent
 * todo items with different titles and descriptions. Each todo is created with
 * a unique ID, owned by the same user, and maintains independent temporal
 * metadata. This test verifies the core functionality of the todo application
 * by testing the complete user journey from registration through creating
 * multiple tasks.
 *
 * Test workflow:
 *
 * 1. User registers and authenticates
 * 2. Create first todo with comprehensive details
 * 3. Create second todo with different content
 * 4. Create third todo with minimal data
 * 5. Verify all todos belong to authenticated user
 * 6. Verify todos have unique identifiers
 * 7. Validate temporal metadata for each todo
 * 8. Ensure todos maintain independent state
 */
export async function test_api_todo_creation_multiple_todos_same_user(
  connection: api.IConnection,
) {
  // Step 1: User registration and authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "securePassword123",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000/landing",
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);
  TestValidator.equals(
    "authenticated user email matches registration email",
    user.email,
    userEmail,
  );

  // Step 2: Create first todo with comprehensive details
  const todo1: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: "Complete project documentation",
        description:
          "Write comprehensive documentation for the new API endpoints including examples and usage guidelines",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo1);
  TestValidator.equals(
    "first todo is not marked as completed",
    todo1.is_completed,
    false,
  );
  TestValidator.equals(
    "first todo belongs to authenticated user",
    todo1.todo_app_user_id,
    user.id,
  );

  // Step 3: Create second todo with different content
  const todo2: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: "Review pull requests",
        description:
          "Review and approve pending pull requests from team members on the main repository branch",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo2);
  TestValidator.equals(
    "second todo is not marked as completed",
    todo2.is_completed,
    false,
  );
  TestValidator.equals(
    "second todo belongs to authenticated user",
    todo2.todo_app_user_id,
    user.id,
  );

  // Step 4: Create third todo with minimal data
  const todo3: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: "Update dependencies",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo3);
  TestValidator.equals(
    "third todo is not marked as completed",
    todo3.is_completed,
    false,
  );
  TestValidator.equals(
    "third todo belongs to authenticated user",
    todo3.todo_app_user_id,
    user.id,
  );

  // Step 5: Verify all todos have unique identifiers
  TestValidator.notEquals(
    "first and second todos have different IDs",
    todo1.id,
    todo2.id,
  );
  TestValidator.notEquals(
    "second and third todos have different IDs",
    todo2.id,
    todo3.id,
  );
  TestValidator.notEquals(
    "first and third todos have different IDs",
    todo1.id,
    todo3.id,
  );

  // Step 6: Verify all todos belong to same user
  TestValidator.equals(
    "all todos belong to same user (todo1 and todo2)",
    todo1.todo_app_user_id,
    todo2.todo_app_user_id,
  );
  TestValidator.equals(
    "all todos belong to same user (todo2 and todo3)",
    todo2.todo_app_user_id,
    todo3.todo_app_user_id,
  );

  // Step 7: Verify user ownership in embedded user objects
  TestValidator.equals(
    "todo1 embedded user matches authenticated user",
    todo1.user.id,
    user.id,
  );
  TestValidator.equals(
    "todo2 embedded user matches authenticated user",
    todo2.user.id,
    user.id,
  );
  TestValidator.equals(
    "todo3 embedded user matches authenticated user",
    todo3.user.id,
    user.id,
  );

  // Step 8: Validate temporal metadata
  TestValidator.predicate(
    "todo1 has created_at timestamp",
    typeof todo1.created_at === "string" && todo1.created_at.length > 0,
  );
  TestValidator.predicate(
    "todo2 has created_at timestamp",
    typeof todo2.created_at === "string" && todo2.created_at.length > 0,
  );
  TestValidator.predicate(
    "todo3 has created_at timestamp",
    typeof todo3.created_at === "string" && todo3.created_at.length > 0,
  );

  // Step 9: Verify title and description retention
  TestValidator.equals(
    "todo1 title is retained correctly",
    todo1.title,
    "Complete project documentation",
  );
  TestValidator.equals(
    "todo1 description is retained correctly",
    todo1.description,
    "Write comprehensive documentation for the new API endpoints including examples and usage guidelines",
  );
  TestValidator.equals(
    "todo2 title is retained correctly",
    todo2.title,
    "Review pull requests",
  );
  TestValidator.equals(
    "todo3 title is retained correctly",
    todo3.title,
    "Update dependencies",
  );
  TestValidator.predicate(
    "todo3 description is null or undefined (not provided)",
    todo3.description === null || todo3.description === undefined,
  );
}
