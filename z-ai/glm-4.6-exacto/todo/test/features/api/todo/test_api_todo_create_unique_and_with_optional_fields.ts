import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful creation of a new todo item for a registered and
 * authenticated user.
 *
 * - Ensures user can register and is authenticated
 * - Validates that required and optional fields are handled correctly by the
 *   create endpoint
 * - Verifies title uniqueness constraint for active todos
 * - Checks server-provided audit fields, business status, and ownership
 * - Ensures proper error is thrown for duplicate (active) titles
 *
 * Test Steps:
 *
 * 1. Register a new user
 * 2. Create a todo item with required title, optional description, and optional
 *    due_date (future date)
 * 3. Validate all returned fields and ownership (status, timestamps, user id)
 * 4. Attempt to create a second todo for the same user with the same title (should
 *    fail with a validation error)
 */
export async function test_api_todo_create_unique_and_with_optional_fields(
  connection: api.IConnection,
) {
  // Step 1: Register a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userJoinInput = {
    email: userEmail,
    password: RandomGenerator.alphaNumeric(12),
    href: "https://test.app/register",
    referrer: "https://test.app/landing",
    ip: null,
  } satisfies ITodoAppUser.IJoin;
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: userJoinInput },
  );
  typia.assert(user);

  // Step 2: Create a todo with required and optional fields
  const todoTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  }).trim();
  const todoInput = {
    title: todoTitle,
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 2,
      sentenceMax: 3,
      wordMin: 3,
      wordMax: 8,
    }),
    due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // tomorrow
  } satisfies ITodoAppTodo.ICreate;
  const todo: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    { body: todoInput },
  );
  typia.assert(todo);

  // Step 3: Validate returned todo fields
  TestValidator.equals(
    "created title should match",
    todo.title,
    todoInput.title,
  );
  TestValidator.equals(
    "created description should match",
    todo.description,
    todoInput.description,
  );
  TestValidator.equals(
    "created due date should match",
    todo.due_date,
    todoInput.due_date,
  );
  TestValidator.equals("todo status should be 'active'", todo.status, "active");
  TestValidator.equals(
    "ownership must match user id",
    todo.todo_app_user_id,
    user.id,
  );

  // Step 4: Attempt duplicate title for this user (should fail)
  await TestValidator.error(
    "duplicate active todo title should fail",
    async () => {
      await api.functional.todoApp.user.todos.create(connection, {
        body: { ...todoInput },
      });
    },
  );
}
