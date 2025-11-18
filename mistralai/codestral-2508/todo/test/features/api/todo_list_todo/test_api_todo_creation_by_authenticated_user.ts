import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates successful creation of a Todo task for an authenticated user,
 * covering business and audit logic.
 *
 * - Step 1: Registers a test user via the /auth/user/join endpoint using valid
 *   randomized credentials (unique, random email and password, random URIs for
 *   href/referrer, and an optional display_name).
 * - Step 2: Authenticates as the new user (automatic via join endpoint).
 * - Step 3: Generates a unique, non-blank random Todo title (between 1 and 100
 *   chars) and a description (optional, ≤500 chars) matching business
 *   requirements.
 * - Step 4: Calls the /todoList/user/todos create endpoint with a valid body
 *   (title, description) STRICTLY omitting any audit or ownership fields.
 *   Ensures API response is successful, receiving a new Todo.
 * - Step 5: Asserts presence and correct type/format of all required schema/audit
 *   fields: id (uuid), created_at/updated_at (date-time), completed (boolean,
 *   FALSE by default), todo_list_user_id (uuid, matches user id), title
 *   (matches input), and optional description (matches input, or null/undefined
 *   if omitted). Completed_at must be null or undefined because Todo is
 *   incomplete by default.
 * - Step 6: Verifies title uniqueness per user is enforced by attempting to
 *   create a second incomplete Todo with the same title and expecting an error;
 *   successful only on unique titles.
 * - Step 7: Verifies title min/max length and description limit (by creating with
 *   1-char and 100-char titles and a maximal-length description; attempt error
 *   for over-limit).
 * - Step 8: Ensures ownership and audit fields cannot be injected by verifying
 *   any such attempt results in server-side error (but skips type-error tests
 *   per e2e test rules).
 */
export async function test_api_todo_creation_by_authenticated_user(
  connection: api.IConnection,
) {
  // Step 1: Register a unique test user
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const displayName = RandomGenerator.name();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const userJoinBody = {
    email,
    password,
    href,
    referrer,
    display_name: displayName,
  } satisfies ITodoListUser.ICreate;

  const joinOutput = await api.functional.auth.user.join(connection, {
    body: userJoinBody,
  });
  typia.assert(joinOutput);
  TestValidator.equals("joined user's email matches", joinOutput.email, email);
  const userId = joinOutput.id;

  // Step 2: Already authenticated as user (by join)

  // Step 3: Create unique, valid todo title/description
  const todoTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 12,
  }); // 3 words, 4-12 chars each (reasonably unique, ≈12-36 chars)
  const todoDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 3,
    wordMax: 12,
  });

  // Step 4: Create todo with strictly valid body (no audit/owner fields)
  const todoRequestBody = {
    title: todoTitle,
    description: todoDescription,
  } satisfies ITodoListTodo.ICreate;

  const todo = await api.functional.todoList.user.todos.create(connection, {
    body: todoRequestBody,
  });
  typia.assert(todo);

  // Step 5: Validate response schema/audit fields
  TestValidator.equals("todo.title matches input", todo.title, todoTitle);
  TestValidator.equals(
    "todo.description matches input",
    todo.description,
    todoDescription,
  );
  TestValidator.predicate(
    "todo.completed is false by default",
    todo.completed === false,
  );
  TestValidator.equals(
    "todo_list_user_id matches user",
    todo.todo_list_user_id,
    userId,
  );
  TestValidator.predicate(
    "created_at is ISO 8601 date-time",
    typeof todo.created_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(todo.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 date-time",
    typeof todo.updated_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(todo.updated_at),
  );
  TestValidator.equals(
    "todo.completed_at is null for new incomplete todo",
    todo.completed_at,
    null,
  );

  // Step 6: Unique title constraint - duplicate title should fail
  await TestValidator.error(
    "duplicate incomplete todo title rejected",
    async () => {
      await api.functional.todoList.user.todos.create(connection, {
        body: { title: todoTitle } satisfies ITodoListTodo.ICreate,
      });
    },
  );
  // Second with unique title should succeed (no error)
  const uniqueTitle2 = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 4,
    wordMax: 10,
  });
  const todo2 = await api.functional.todoList.user.todos.create(connection, {
    body: { title: uniqueTitle2 } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(todo2);
  TestValidator.equals("second todo title", todo2.title, uniqueTitle2);

  // Step 7: Title/description min/max boundary
  const minTitle = RandomGenerator.alphabets(1);
  const maxTitle = RandomGenerator.alphabets(100);
  const maxDesc = RandomGenerator.alphabets(500);
  // Min title valid
  const minTodo = await api.functional.todoList.user.todos.create(connection, {
    body: { title: minTitle } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(minTodo);
  TestValidator.equals("min title todo", minTodo.title, minTitle);
  // Max title valid
  const maxTodo = await api.functional.todoList.user.todos.create(connection, {
    body: { title: maxTitle } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(maxTodo);
  TestValidator.equals("max title todo", maxTodo.title, maxTitle);
  // Max desc valid
  const maxDescTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 4,
          wordMax: 10,
        }),
        description: maxDesc,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(maxDescTodo);
  TestValidator.equals(
    "max desc todo.description",
    maxDescTodo.description,
    maxDesc,
  );
  // Over-limit title
  await TestValidator.error("overlong title rejected", async () => {
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: RandomGenerator.alphabets(101),
      } satisfies ITodoListTodo.ICreate,
    });
  });
  // Over-limit desc
  await TestValidator.error("overlong description rejected", async () => {
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph(),
        description: RandomGenerator.alphabets(501),
      } satisfies ITodoListTodo.ICreate,
    });
  });
  // Step 8: Ownership/audit field injection rejected (server error).
  const invalidBodies = [
    { ...todoRequestBody, id: typia.random<string & tags.Format<"uuid">>() },
    { ...todoRequestBody, created_at: new Date().toISOString() },
    { ...todoRequestBody, updated_at: new Date().toISOString() },
    { ...todoRequestBody, completed: true },
    { ...todoRequestBody, completed_at: new Date().toISOString() },
    { ...todoRequestBody, todo_list_user_id: joinOutput.id },
  ];
  for (const invalid of invalidBodies) {
    await TestValidator.error(
      "injection of forbidden field is rejected",
      async () => {
        await api.functional.todoList.user.todos.create(connection, {
          body: invalid as any,
        });
      },
    );
  }
}
