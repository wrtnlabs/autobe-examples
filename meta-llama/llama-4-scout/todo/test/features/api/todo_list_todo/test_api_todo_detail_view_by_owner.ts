import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Verifies that an authenticated user can retrieve full details for a todo they
 * own after creating it.
 *
 * Steps:
 *
 * 1. Register a new user with unique credentials.
 * 2. Create a new todo (with optional description and due date) as this user.
 * 3. Retrieve the created todo by its ID; assert that returned data includes all
 *    expected properties and values (title, description, due_date, completion,
 *    timestamps, and correct owner linkage).
 * 4. Verify private access by requesting an invalid/random todoId (should fail)
 *    and by registering a second user and verifying they cannot access the
 *    first user's todo (should be access denied or not found).
 * 5. Attempt access without authentication (anonymous connection), which should
 *    also fail.
 */
export async function test_api_todo_detail_view_by_owner(
  connection: api.IConnection,
) {
  // 1. Register new user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: "https://test-todo.example.com/join",
    referrer: "https://test-todo.example.com/",
  } satisfies ITodoListUser.IJoin;
  const auth = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(auth);
  TestValidator.equals(
    "join returns correct email",
    auth.email,
    joinBody.email,
  );
  TestValidator.equals(
    "join returns correct display_name",
    auth.display_name,
    joinBody.display_name,
  );
  TestValidator.predicate("join gives active account", auth.is_active === true);
  TestValidator.predicate(
    "join gives verified=false",
    auth.is_verified === false,
  );
  TestValidator.equals("join returns matching user.id", auth.user?.id, auth.id);

  // 2. Create a new todo as the user
  const todoBody = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    due_date: new Date(Date.now() + 86400000).toISOString(), // due tomorrow
  } satisfies ITodoListTodo.ICreate;
  const created = await api.functional.todoList.user.todos.create(connection, {
    body: todoBody,
  });
  typia.assert(created);
  TestValidator.equals(
    "created todo has correct title",
    created.title,
    todoBody.title,
  );
  TestValidator.equals(
    "created todo has correct description",
    created.description,
    todoBody.description,
  );
  TestValidator.equals(
    "created todo has correct due_date",
    created.due_date,
    todoBody.due_date,
  );
  TestValidator.equals(
    "created todo is uncompleted",
    created.is_completed,
    false,
  );
  TestValidator.equals(
    "created todo completed_at is null",
    created.completed_at,
    null,
  );
  TestValidator.equals(
    "todo links to user",
    created.todo_list_user_id,
    auth.id,
  );
  TestValidator.predicate(
    "todo id is uuid",
    !!created.id && typeof created.id === "string",
  );
  TestValidator.predicate(
    "created_at is ISO string",
    typeof created.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is ISO string",
    typeof created.updated_at === "string",
  );

  // 3. Fetch todo by id as the authenticating user
  const fetched = await api.functional.todoList.user.todos.at(connection, {
    todoId: created.id,
  });
  typia.assert(fetched);
  TestValidator.equals(
    "fetched todo equals created todo",
    fetched,
    created,
    (key) => key === "created_at" || key === "updated_at",
  );
  // Timestamps may have changed slightly, but core values must match.
  TestValidator.equals("fetched id", fetched.id, created.id);
  TestValidator.equals(
    "fetched todo's user matches",
    fetched.todo_list_user_id,
    auth.id,
  );
  TestValidator.equals("fetched title", fetched.title, todoBody.title);
  TestValidator.equals(
    "fetched description",
    fetched.description,
    todoBody.description,
  );
  TestValidator.equals("fetched due_date", fetched.due_date, todoBody.due_date);
  TestValidator.equals("fetched is_completed", fetched.is_completed, false);
  TestValidator.equals("fetched completed_at", fetched.completed_at, null);

  // 4. Fetching random (nonexistent) todo should be denied
  await TestValidator.error(
    "fetching nonexistent todo should fail",
    async () => {
      await api.functional.todoList.user.todos.at(connection, {
        todoId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 5. Register a second user, ensure they cannot fetch the first user's todo
  const joinBody2 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: "https://test-todo.example.com/join2",
    referrer: "https://test-todo.example.com/",
  } satisfies ITodoListUser.IJoin;
  await api.functional.auth.user.join(connection, { body: joinBody2 });
  await TestValidator.error("other user cannot fetch this todo", async () => {
    await api.functional.todoList.user.todos.at(connection, {
      todoId: created.id,
    });
  });

  // 6. Test unauthenticated: logout by empty header
  const anonConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated cannot fetch todo", async () => {
    await api.functional.todoList.user.todos.at(anonConn, {
      todoId: created.id,
    });
  });
}
