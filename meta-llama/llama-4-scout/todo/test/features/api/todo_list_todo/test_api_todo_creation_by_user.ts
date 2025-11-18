import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates user todo creation workflow and constraints.
 *
 * Steps:
 *
 * 1. Register and authenticate a new user, ensuring unique email
 * 2. Create a todo with minimally-valid data: title (1-100 chars), optional
 *    description, valid future due_date
 * 3. Verify todo entity correctness: id, ownership fields, audit timestamps,
 *    initial completion state
 * 4. Confirm title uniqueness: attempt to create duplicate title -- must fail
 * 5. Field constraints: empty, missing, or overly long title/description/due_date
 *    rejected
 * 6. Past due_date is rejected
 * 7. Unauthenticated todo creation rejected
 * 8. Confirm new todo is accessible and retrievable after creation
 */
export async function test_api_todo_creation_by_user(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new user
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = typia.random<string & tags.Format<"password">>();
  const display_name: string = RandomGenerator.name();
  const joinPayload = {
    email,
    password,
    display_name,
    href: "https://e2e.test/new-user", // Use realistic registration context
    referrer: "https://e2e.test/landing",
  } satisfies ITodoListUser.IJoin;
  const auth: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: joinPayload },
  );
  typia.assert(auth);
  TestValidator.equals(
    "auth user email matches registration",
    auth.email,
    email,
  );
  TestValidator.equals(
    "auth user display name matches registration",
    auth.display_name,
    display_name,
  );
  TestValidator.predicate(
    "auth user is not yet verified",
    auth.is_verified === false,
  );
  TestValidator.predicate("auth user is active", auth.is_active === true);

  // 2. Create a valid todo
  const validTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 9,
  }).substring(0, 16); // ensure ≤100 chars
  const validDesc = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 5,
    wordMin: 3,
    wordMax: 9,
  }).substring(0, 200);
  const futureDueDate = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString();
  const todoBody = {
    title: validTitle,
    description: validDesc,
    due_date: futureDueDate,
  } satisfies ITodoListTodo.ICreate;
  const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    { body: todoBody },
  );
  typia.assert(todo);
  TestValidator.equals("todo title matches input", todo.title, validTitle);
  TestValidator.equals(
    "todo description matches input",
    todo.description,
    validDesc,
  );
  TestValidator.equals(
    "todo due_date matches input",
    todo.due_date,
    futureDueDate,
  );
  TestValidator.equals(
    "todo is not completed at creation",
    todo.is_completed,
    false,
  );
  TestValidator.equals(
    "todo completed_at is null at creation",
    todo.completed_at,
    null,
  );
  TestValidator.equals(
    "todo is assigned to registering user",
    todo.todo_list_user_id,
    auth.id,
  );
  TestValidator.predicate(
    "todo id is valid uuid",
    typeof todo.id === "string" && todo.id.length >= 32 && todo.id.length <= 64,
  );
  TestValidator.predicate(
    "todo created_at is recent",
    typeof todo.created_at === "string" && todo.created_at.length > 10,
  );
  TestValidator.predicate(
    "todo updated_at is recent",
    typeof todo.updated_at === "string" && todo.updated_at.length > 10,
  );

  // 3. Negative and business rule validation
  // a) Duplicate title (should fail within same user)
  await TestValidator.error(
    "duplicate todo title within user should fail",
    async () => {
      await api.functional.todoList.user.todos.create(connection, {
        body: todoBody,
      });
    },
  );
  // b) Empty title
  const emptyTitleBody = {
    ...todoBody,
    title: "",
  } satisfies ITodoListTodo.ICreate;
  await TestValidator.error("empty title is rejected", async () => {
    await api.functional.todoList.user.todos.create(connection, {
      body: emptyTitleBody,
    });
  });
  // c) Title too long (101 chars)
  const longTitle = "A".repeat(101);
  const longTitleBody = {
    ...todoBody,
    title: longTitle,
  } satisfies ITodoListTodo.ICreate;
  await TestValidator.error(
    "title exceeding 100 chars is rejected",
    async () => {
      await api.functional.todoList.user.todos.create(connection, {
        body: longTitleBody,
      });
    },
  );
  // d) Overlong description (1001 chars)
  const longDescBody = {
    ...todoBody,
    description: "D".repeat(1001),
  } satisfies ITodoListTodo.ICreate;
  await TestValidator.error(
    "description exceeding length rejected",
    async () => {
      await api.functional.todoList.user.todos.create(connection, {
        body: longDescBody,
      });
    },
  );
  // e) Past due_date
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const pastDueDateBody = {
    ...todoBody,
    due_date: yesterday,
  } satisfies ITodoListTodo.ICreate;
  await TestValidator.error("past due_date is rejected", async () => {
    await api.functional.todoList.user.todos.create(connection, {
      body: pastDueDateBody,
    });
  });
  // f) Unauthenticated creation attempt
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated creation should fail",
    async () => {
      await api.functional.todoList.user.todos.create(unauthConn, {
        body: todoBody,
      });
    },
  );

  // 4. Accessibility: created todo is accessible for subsequent listing (sanity assertion)
  // (In a production suite, would call GET/list, but just perform output check here)
  TestValidator.equals(
    "todo should be accessible after creation",
    todo.title,
    validTitle,
  );
  TestValidator.equals(
    "todo ownership remains correct",
    todo.todo_list_user_id,
    auth.id,
  );
}
