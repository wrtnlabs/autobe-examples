import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates todo creation title length constraints (1-255 characters).
 *
 * Tests boundary conditions for todo title validation:
 *
 * - Minimum boundary: 1 character title should be accepted
 * - Maximum boundary: 255 character title should be accepted
 * - Below minimum: 0 characters (empty) should be rejected
 * - Above maximum: 256+ characters should be rejected
 *
 * Ensures the API properly enforces title length constraints to maintain data
 * integrity and prevent invalid or oversized inputs.
 *
 * Prerequisites:
 *
 * 1. User registration (post /auth/user/join) to obtain authentication
 * 2. Title length validation on todo creation (post /todoList/user/todos)
 */
export async function test_api_todo_creation_title_length_validation(
  connection: api.IConnection,
) {
  // Step 1: Register a new user to get authentication token
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "SecurePassword123",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Test minimum boundary - exactly 1 character title
  const minCharTitle = "A";
  const todoMin = await api.functional.todoList.user.todos.create(connection, {
    body: {
      title: minCharTitle,
    } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(todoMin);
  TestValidator.equals(
    "minimum title length (1 char) accepted",
    todoMin.title,
    minCharTitle,
  );

  // Step 3: Test maximum boundary - exactly 255 character title
  const maxCharTitle = RandomGenerator.alphabets(255);
  const todoMax = await api.functional.todoList.user.todos.create(connection, {
    body: {
      title: maxCharTitle,
    } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(todoMax);
  TestValidator.equals(
    "maximum title length (255 chars) accepted",
    todoMax.title,
    maxCharTitle,
  );

  // Step 4: Test below minimum - empty string should be rejected
  await TestValidator.error(
    "empty title (0 characters) should be rejected",
    async () => {
      await api.functional.todoList.user.todos.create(connection, {
        body: {
          title: "",
        } satisfies ITodoListTodo.ICreate,
      });
    },
  );

  // Step 5: Test above maximum - 256 characters should be rejected
  const oversizeTitle = RandomGenerator.alphabets(256);
  await TestValidator.error(
    "title exceeding maximum length (256 characters) should be rejected",
    async () => {
      await api.functional.todoList.user.todos.create(connection, {
        body: {
          title: oversizeTitle,
        } satisfies ITodoListTodo.ICreate,
      });
    },
  );

  // Step 6: Test with much larger title - 500 characters should also be rejected
  const veryOversizeTitle = RandomGenerator.alphabets(500);
  await TestValidator.error(
    "title significantly exceeding maximum length (500 characters) should be rejected",
    async () => {
      await api.functional.todoList.user.todos.create(connection, {
        body: {
          title: veryOversizeTitle,
        } satisfies ITodoListTodo.ICreate,
      });
    },
  );
}
