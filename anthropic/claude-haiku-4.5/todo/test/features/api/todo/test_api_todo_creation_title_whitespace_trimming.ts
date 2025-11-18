import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test todo creation with title whitespace trimming validation.
 *
 * Validates that the Todo API properly trims leading and trailing whitespace
 * from todo titles before validation, ensuring that titles like ' hello ' are
 * trimmed to 'hello' and pass validation if within the 1-255 character range
 * after trimming. Tests multiple whitespace scenarios including excessive
 * spaces and tabs, and verifies that titles containing only whitespace are
 * correctly rejected as empty after trimming.
 *
 * Steps:
 *
 * 1. Register and authenticate a user
 * 2. Create todos with various whitespace scenarios:
 *
 *    - Title with leading spaces
 *    - Title with trailing spaces
 *    - Title with both leading and trailing spaces
 *    - Title with excessive whitespace
 * 3. Verify successful creation with trimmed titles
 * 4. Test that whitespace-only titles are rejected
 */
export async function test_api_todo_creation_title_whitespace_trimming(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(10);
  const userResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password,
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(userResponse);
  TestValidator.equals("user created successfully", userResponse.email, email);

  // Step 2: Test todo creation with leading whitespace
  const titleWithLeadingSpace = "   hello world";
  const todo1: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: titleWithLeadingSpace,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo1);
  TestValidator.equals(
    "title trimmed from leading spaces",
    todo1.title,
    "hello world",
  );

  // Step 3: Test todo creation with trailing whitespace
  const titleWithTrailingSpace = "hello world   ";
  const todo2: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: titleWithTrailingSpace,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo2);
  TestValidator.equals(
    "title trimmed from trailing spaces",
    todo2.title,
    "hello world",
  );

  // Step 4: Test todo creation with both leading and trailing whitespace
  const titleWithBothSpaces = "   hello world   ";
  const todo3: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: titleWithBothSpaces,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo3);
  TestValidator.equals(
    "title trimmed from both sides",
    todo3.title,
    "hello world",
  );

  // Step 5: Test todo creation with excessive whitespace
  const titleWithExcessiveSpaces =
    "     a very long title with many leading spaces     ";
  const todo4: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: titleWithExcessiveSpaces,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo4);
  TestValidator.equals(
    "title with excessive whitespace trimmed",
    todo4.title,
    "a very long title with many leading spaces",
  );

  // Step 6: Test that whitespace-only titles are rejected
  const whitespaceOnlyTitle = "     ";
  await TestValidator.error(
    "whitespace-only title should be rejected",
    async () => {
      await api.functional.todoList.user.todos.create(connection, {
        body: {
          title: whitespaceOnlyTitle,
        } satisfies ITodoListTodo.ICreate,
      });
    },
  );

  // Step 7: Test with tab and mixed whitespace characters
  const titleWithTabs = "\t\thello\t\t";
  const todo5: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: titleWithTabs,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo5);
  TestValidator.equals("title with tabs trimmed", todo5.title, "hello");

  // Step 8: Test with newlines and mixed whitespace (should be trimmed)
  const titleWithNewlines = "\n\nhello world\n\n";
  const todo6: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: titleWithNewlines,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo6);
  TestValidator.equals(
    "title with newlines trimmed",
    todo6.title,
    "hello world",
  );
}
