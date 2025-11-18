import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test creating a todo with title at maximum valid length (255 characters).
 *
 * This test validates that the API properly enforces the maxLength constraint
 * on todo titles. It verifies that:
 *
 * 1. Todos can be created with titles up to exactly 255 characters
 * 2. Created todos are properly stored and returned with correct data
 * 3. Titles exceeding the 255-character limit are rejected
 * 4. The maxLength validation is consistently applied
 *
 * The test follows a realistic workflow:
 *
 * 1. Register a new user and establish authentication
 * 2. Create a todo with a 255-character title (maximum valid length)
 * 3. Verify the todo was created successfully with all fields intact
 * 4. Verify that titles exceeding 255 characters are rejected
 */
export async function test_api_todo_creation_title_maximum_length(
  connection: api.IConnection,
) {
  // Step 1: Register a new user for todo creation testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "SecurePassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create a todo with exactly 255-character title (maximum valid length)
  const maxLengthTitle = "a".repeat(255); // Exactly 255 characters
  const maxLengthTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: maxLengthTitle,
        description: "Todo with maximum length title",
        priority: "high",
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(maxLengthTodo);
  TestValidator.equals(
    "created todo title matches input",
    maxLengthTodo.title,
    maxLengthTitle,
  );
  TestValidator.equals(
    "created todo title length is exactly 255",
    maxLengthTodo.title.length,
    255,
  );
  TestValidator.equals(
    "created todo completion status is false",
    maxLengthTodo.completed,
    false,
  );

  // Step 3: Create another valid todo with 254-character title (just under limit)
  const nearMaxTitle = "b".repeat(254); // 254 characters
  const nearMaxTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: nearMaxTitle,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(nearMaxTodo);
  TestValidator.equals(
    "todo with 254 characters created successfully",
    nearMaxTodo.title.length,
    254,
  );

  // Step 4: Verify that title exceeding 255 characters is rejected
  await TestValidator.error(
    "title exceeding 255 characters should be rejected",
    async () => {
      const oversizedTitle = "c".repeat(256); // 256 characters exceeds limit
      await api.functional.todoList.user.todos.create(connection, {
        body: {
          title: oversizedTitle,
        } satisfies ITodoListTodo.ICreate,
      });
    },
  );

  // Step 5: Verify that empty or very short titles still work (minimum 1 character)
  const minTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: "x", // Minimum 1 character
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(minTodo);
  TestValidator.equals(
    "todo with single character title created successfully",
    minTodo.title,
    "x",
  );
}
