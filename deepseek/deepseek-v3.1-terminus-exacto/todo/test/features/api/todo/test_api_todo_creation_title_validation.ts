import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate title constraints for todo creation with various scenarios. Tests
 * business rules including minimum title length (1 character), maximum title
 * length (255 characters), and proper error handling for invalid inputs.
 */
export async function test_api_todo_creation_title_validation(
  connection: api.IConnection,
) {
  // Create authenticated user context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "password123",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Test 1: Minimum valid title length (1 character)
  const minTitleTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: "A", // Minimum valid length
        description: "Test todo with minimum title length",
        status: "pending",
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(minTitleTodo);
  TestValidator.equals(
    "minimum title length todo created successfully",
    minTitleTodo.title,
    "A",
  );

  // Test 2: Maximum valid title length (255 characters)
  const maxTitle = RandomGenerator.alphabets(255); // Exactly 255 characters
  const maxTitleTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: maxTitle,
        description: "Test todo with maximum title length",
        status: "pending",
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(maxTitleTodo);
  TestValidator.equals(
    "maximum title length todo created successfully",
    maxTitleTodo.title,
    maxTitle,
  );

  // Test 3: Empty title should fail
  await TestValidator.error("empty title should be rejected", async () => {
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: "", // Empty string - invalid
        description: "This should fail",
        status: "pending",
      } satisfies ITodoListTodo.ICreate,
    });
  });

  // Test 4: Title exceeding 255 characters should fail
  const tooLongTitle = RandomGenerator.alphabets(256); // 256 characters - exceeds limit
  await TestValidator.error(
    "title exceeding 255 characters should be rejected",
    async () => {
      await api.functional.todoList.user.todos.create(connection, {
        body: {
          title: tooLongTitle,
          description: "This should fail due to title length",
          status: "pending",
        } satisfies ITodoListTodo.ICreate,
      });
    },
  );

  // Test 5: Valid title with special characters
  const specialTitle = "Todo with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?/";
  const specialTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: specialTitle,
        description: "Test todo with special characters in title",
        status: "pending",
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(specialTodo);
  TestValidator.equals(
    "special character title todo created successfully",
    specialTodo.title,
    specialTitle,
  );

  // Test 6: Valid title with numbers
  const numericTitle = "Todo 123 with numbers 456";
  const numericTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: numericTitle,
        description: "Test todo with numbers in title",
        status: "pending",
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(numericTodo);
  TestValidator.equals(
    "numeric title todo created successfully",
    numericTodo.title,
    numericTitle,
  );
}
