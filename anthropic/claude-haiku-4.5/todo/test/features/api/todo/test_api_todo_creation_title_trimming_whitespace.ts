import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that todo titles are properly trimmed of leading and trailing
 * whitespace.
 *
 * This test validates the core requirement that todo titles must have
 * whitespace trimmed while preserving internal spacing. Multiple test cases
 * verify:
 *
 * 1. Titles with leading whitespace (spaces, tabs, newlines)
 * 2. Titles with trailing whitespace (spaces, tabs, newlines)
 * 3. Titles with both leading and trailing whitespace
 * 4. Titles with internal whitespace preserved correctly
 * 5. Edge case: titles that become empty after trimming should be rejected
 *
 * The test workflow:
 *
 * 1. Create a user account via authentication
 * 2. Generate multiple test titles with various whitespace patterns
 * 3. For valid cases, verify the returned title has whitespace trimmed
 * 4. For invalid cases (empty after trim), verify the API rejects the request
 * 5. Validate that internal spacing is preserved while leading/trailing whitespace
 *    is removed
 */
export async function test_api_todo_creation_title_trimming_whitespace(
  connection: api.IConnection,
) {
  // Step 1: Create user account via authentication
  const email = typia.random<string & tags.Format<"email">>();
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: email,
        password: RandomGenerator.alphabets(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Test case 1 - Title with leading spaces
  const titleWithLeading = " ".repeat(3) + "Leading spaces";
  const todo1: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: titleWithLeading,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo1);
  TestValidator.equals(
    "title with leading whitespace should be trimmed",
    todo1.title,
    "Leading spaces",
  );

  // Step 3: Test case 2 - Title with trailing spaces
  const titleWithTrailing = "Trailing spaces" + " ".repeat(3);
  const todo2: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: titleWithTrailing,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo2);
  TestValidator.equals(
    "title with trailing whitespace should be trimmed",
    todo2.title,
    "Trailing spaces",
  );

  // Step 4: Test case 3 - Title with both leading and trailing whitespace
  const titleWithBoth = " \t ".repeat(2) + "Both sides" + " \n ".repeat(2);
  const todo3: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: titleWithBoth,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo3);
  TestValidator.equals(
    "title with both leading and trailing whitespace should be trimmed",
    todo3.title,
    "Both sides",
  );

  // Step 5: Test case 4 - Title with internal whitespace preserved
  const titleWithInternal =
    " ".repeat(2) +
    "Multiple" +
    " ".repeat(3) +
    "internal" +
    " ".repeat(2) +
    "spaces" +
    " ".repeat(2);
  const todo4: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: titleWithInternal,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo4);
  TestValidator.equals(
    "internal whitespace should be preserved",
    todo4.title,
    "Multiple" + " ".repeat(3) + "internal" + " ".repeat(2) + "spaces",
  );

  // Step 6: Test case 5 - Title with tabs in various positions
  const titleWithTabs = "\t\t" + "Title with tabs" + "\t\t";
  const todo5: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: titleWithTabs,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo5);
  TestValidator.equals(
    "tabs should be trimmed from edges",
    todo5.title,
    "Title with tabs",
  );

  // Step 7: Test case 6 - Edge case: only whitespace (should be rejected)
  await TestValidator.error(
    "title with only whitespace should be rejected",
    async () => {
      await api.functional.todoList.user.todos.create(connection, {
        body: {
          title: " ".repeat(5) + "\t" + "\n" + " ".repeat(2),
        } satisfies ITodoListTodo.ICreate,
      });
    },
  );

  // Step 8: Test case 7 - Single character (no trimming needed)
  const singleCharTitle = "A";
  const todo7: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: singleCharTitle,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo7);
  TestValidator.equals(
    "single character title should remain unchanged",
    todo7.title,
    "A",
  );

  // Step 9: Test case 8 - Mixed whitespace characters
  const titleWithMixedWhitespace =
    " \n\t " + "Mixed whitespace title" + " \n\t ";
  const todo8: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: titleWithMixedWhitespace,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo8);
  TestValidator.equals(
    "mixed whitespace types should all be trimmed",
    todo8.title,
    "Mixed whitespace title",
  );
}
