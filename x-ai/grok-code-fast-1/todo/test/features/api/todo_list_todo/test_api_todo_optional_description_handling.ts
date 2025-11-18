import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Confirm backend distinguishes between omitted, empty string, and null
 * description field in new todo item creation for authorized users.
 *
 * 1. Register a new user (POST /auth/user/join) and authenticate for subsequent
 *    operations
 * 2. Create a todo with description omitted (do not include property)
 * 3. Create a todo with description as empty string
 * 4. Create a todo with description as null
 * 5. Assert the API response for each: for omitted, description should be
 *    undefined or missing (not present or null); for empty string, must exactly
 *    match; for null, must be explicit null
 * 6. (Optional) Validate persisted/fetched data if retrieving todos is supported
 */
export async function test_api_todo_optional_description_handling(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(10);
  const userJoinInput = {
    email: userEmail,
    password: userPassword satisfies string,
    display_name: RandomGenerator.name(2),
    href: "https://test.example.com/join",
    referrer: "https://test.example.com/landing",
  } satisfies ITodoListUser.IJoin;

  const authorized: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoinInput,
    });
  typia.assert(authorized);

  // Step 2: Prepare a valid title for all todos
  const titleBase = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 12,
  });
  // Case A: Omitted description
  const createTodoOmitted = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: `${titleBase} omitted`,
        // description omitted
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(createTodoOmitted);
  TestValidator.predicate(
    "description is undefined when omitted",
    createTodoOmitted.description === undefined,
  );

  // Case B: description as empty string
  const createTodoEmpty = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: `${titleBase} empty`,
        description: "",
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(createTodoEmpty);
  TestValidator.equals(
    "description is exactly empty string",
    createTodoEmpty.description,
    "",
  );

  // Case C: description as null
  const createTodoNull = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: `${titleBase} null`,
        description: null,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(createTodoNull);
  TestValidator.equals(
    "description is explicit null",
    createTodoNull.description,
    null,
  );
}
