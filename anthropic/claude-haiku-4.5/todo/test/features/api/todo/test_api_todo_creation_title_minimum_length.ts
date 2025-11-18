import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test creating a todo with title at the minimum valid length.
 *
 * Validates that the minLength constraint of 1 character is properly enforced
 * for todo titles. Creates multiple todos with single-character titles to
 * ensure the API accepts and stores them correctly, while verifying that the
 * returned todo objects contain all expected fields with proper values.
 *
 * Test workflow:
 *
 * 1. Authenticate a new user via registration
 * 2. Create multiple todos with single-character titles (minimum length)
 * 3. Verify each created todo has the correct title
 * 4. Verify todos are properly stored with all required fields
 * 5. Confirm that minimum length constraint is respected
 */
export async function test_api_todo_creation_title_minimum_length(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user for todo creation
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create multiple todos with single-character titles (minimum length)
  const singleCharTitles = ["a", "b", "c", "x", "z"];
  const createdTodos: ITodoListTodo[] = await ArrayUtil.asyncMap(
    singleCharTitles,
    async (title) => {
      const todo: ITodoListTodo =
        await api.functional.todoList.user.todos.create(connection, {
          body: {
            title: title,
            description: RandomGenerator.paragraph(),
            priority: RandomGenerator.pick(["low", "medium", "high"] as const),
          } satisfies ITodoListTodo.ICreate,
        });
      return todo;
    },
  );

  // Step 3: Verify all todos were created successfully
  TestValidator.predicate(
    "all todos should be created",
    createdTodos.length === singleCharTitles.length,
  );

  // Step 4: Verify each todo has correct title and required fields
  for (let i = 0; i < createdTodos.length; i++) {
    const todo = createdTodos[i];
    typia.assert(todo);

    // Verify title matches
    TestValidator.equals(
      `todo ${i} should have correct single-character title`,
      todo.title,
      singleCharTitles[i],
    );

    // Verify required fields exist
    TestValidator.predicate(
      `todo ${i} should have valid id`,
      typeof todo.id === "string" && todo.id.length > 0,
    );

    TestValidator.predicate(
      `todo ${i} should have completion status`,
      typeof todo.completed === "boolean",
    );

    TestValidator.predicate(
      `todo ${i} should have created_at timestamp`,
      typeof todo.created_at === "string" && todo.created_at.length > 0,
    );

    TestValidator.predicate(
      `todo ${i} should have updated_at timestamp`,
      typeof todo.updated_at === "string" && todo.updated_at.length > 0,
    );
  }

  // Step 5: Verify minimum length constraint is enforced
  TestValidator.predicate(
    "all todo titles should have minimum length of 1 character",
    createdTodos.every((todo) => todo.title.length >= 1),
  );

  // Step 6: Test with whitespace-trimmed title
  const whitespaceTitle = " a ";
  const whitespaceTrimmingTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: whitespaceTitle,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(whitespaceTrimmingTodo);

  TestValidator.predicate(
    "whitespace-trimmed single character title should be accepted",
    whitespaceTrimmingTodo.title.length >= 1,
  );
}
