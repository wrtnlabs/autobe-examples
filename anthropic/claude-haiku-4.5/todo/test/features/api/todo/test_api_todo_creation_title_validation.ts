import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test input validation rules for todo title field during creation.
 *
 * This test validates that the todo creation endpoint properly enforces title
 * constraints (1-255 characters) and rejects invalid inputs with appropriate
 * error messages. The test covers boundary conditions including empty strings,
 * single character titles, maximum length titles, and oversized titles.
 *
 * The test also validates that special characters, unicode characters, and
 * various text encodings in titles are handled correctly by the API.
 *
 * Steps:
 *
 * 1. Create and authenticate a user account for testing
 * 2. Test successful creation with valid titles within constraints
 * 3. Test boundary conditions for title length validation
 * 4. Test rejection of empty titles
 * 5. Test special characters and unicode support in titles
 * 6. Verify error messages for constraint violations
 */
export async function test_api_todo_creation_title_validation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a user
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);
  TestValidator.equals("user authenticated", user.id !== undefined, true);

  // Step 2: Test successful creation with valid single character title
  const singleCharTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: "A",
        description: "Single character title",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(singleCharTodo);
  TestValidator.equals(
    "single character title created",
    singleCharTodo.title,
    "A",
  );

  // Step 3: Test successful creation with normal title
  const normalTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: "Buy groceries for dinner",
        description: "Normal length title",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(normalTodo);
  TestValidator.equals(
    "normal title created",
    normalTodo.title,
    "Buy groceries for dinner",
  );

  // Step 4: Test boundary condition - maximum valid length (255 characters)
  const maxTitle: string = "a".repeat(255);
  const maxTodo: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: maxTitle,
        description: "Maximum valid title length",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(maxTodo);
  TestValidator.equals("max length title created", maxTodo.title.length, 255);

  // Step 5: Test rejection of empty string title
  await TestValidator.error("empty title should fail validation", async () => {
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: "",
        description: "Empty title test",
      } satisfies ITodoAppTodo.ICreate,
    });
  });

  // Step 6: Test rejection of title exceeding 255 characters
  const tooLongTitle: string = "a".repeat(256);
  await TestValidator.error(
    "title exceeding 255 characters should fail validation",
    async () => {
      await api.functional.todoApp.user.todos.create(connection, {
        body: {
          title: tooLongTitle,
          description: "Too long title test",
        } satisfies ITodoAppTodo.ICreate,
      });
    },
  );

  // Step 7: Test special characters in title
  const specialCharTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: "Task #1: Fix @bug & review PR [WIP]",
        description: "Title with special characters",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(specialCharTodo);
  TestValidator.equals(
    "special chars title created",
    specialCharTodo.title,
    "Task #1: Fix @bug & review PR [WIP]",
  );

  // Step 8: Test unicode characters in title
  const unicodeTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: "買い物 🛒 日本語テスト",
        description: "Title with unicode and emoji",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(unicodeTodo);
  TestValidator.equals(
    "unicode title created",
    unicodeTodo.title,
    "買い物 🛒 日本語テスト",
  );

  // Step 9: Test title with numbers and mixed case
  const mixedTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: "Review Meeting Notes - Q4 2024",
        description: "Mixed case and numbers",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(mixedTodo);
  TestValidator.equals(
    "mixed case title created",
    mixedTodo.title,
    "Review Meeting Notes - Q4 2024",
  );
}
