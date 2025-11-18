import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test that a newly registered user can create a todo item and then retrieve
 * its details using the todo's UUID.
 *
 * Steps:
 *
 * 1. Register a user (join) to get an authenticated session
 * 2. Create a todo with both required and optional fields (title, description,
 *    due_date)
 * 3. Retrieve the todo using its id
 * 4. Assert all returned fields are accurate, match the original creation, and
 *    belong to the authenticated user
 * 5. Confirm no other user can access this todo (isolation guaranteed)
 */
export async function test_api_user_todo_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Register a new user for authentication
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.MaxLength<72> & tags.Format<"password">
    >(),
    href: "https://todo-app.test/join",
    referrer: "https://todo-app.test/landing",
    ip: null,
  } satisfies ITodoAppUser.IJoin;
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: userJoinBody },
  );
  typia.assert(user);
  TestValidator.equals(
    "registered user email matches input",
    user.email,
    userJoinBody.email,
  );
  TestValidator.predicate(
    "token is issued for new user",
    typeof user.token.access === "string" && user.token.access.length > 0,
  );

  // 2. Create a todo with all fields
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 4,
      wordMax: 12,
    }),
    due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 day from now
  } satisfies ITodoAppTodo.ICreate;
  const created: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    { body: todoCreateBody },
  );
  typia.assert(created);
  TestValidator.equals(
    "created todo title matches input",
    created.title,
    todoCreateBody.title,
  );
  TestValidator.equals(
    "created todo description matches input",
    created.description,
    todoCreateBody.description,
  );
  TestValidator.equals(
    "created todo due_date matches input",
    created.due_date,
    todoCreateBody.due_date,
  );
  TestValidator.equals(
    "status is 'active' on creation",
    created.status,
    "active",
  );
  TestValidator.equals(
    "created todo is owned by the newly registered user",
    created.todo_app_user_id,
    user.id,
  );

  // 3. Retrieve the todo details by id
  const fetched: ITodoAppTodo = await api.functional.todoApp.user.todos.at(
    connection,
    { todoId: created.id },
  );
  typia.assert(fetched);
  TestValidator.equals(
    "fetched todo id matches created",
    fetched.id,
    created.id,
  );
  TestValidator.equals(
    "fetched title matches created",
    fetched.title,
    created.title,
  );
  TestValidator.equals(
    "fetched description matches created",
    fetched.description,
    created.description,
  );
  TestValidator.equals(
    "fetched due_date matches created",
    fetched.due_date,
    created.due_date,
  );
  TestValidator.equals(
    "fetched todo status matches created",
    fetched.status,
    created.status,
  );
  TestValidator.equals(
    "fetched and created timestamps match",
    fetched.created_at,
    created.created_at,
  );
  TestValidator.equals(
    "fetched updated_at matches created",
    fetched.updated_at,
    created.updated_at,
  );
  TestValidator.equals(
    "fetched todo is owned by authenticated user",
    fetched.todo_app_user_id,
    user.id,
  );

  // 4. Permission: Create another user and ensure that user cannot access the first user's todo
  const otherUserBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.MaxLength<72> & tags.Format<"password">
    >(),
    href: "https://todo-app.test/join",
    referrer: "https://todo-app.test/landing",
    ip: null,
  } satisfies ITodoAppUser.IJoin;
  const otherUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: otherUserBody });
  typia.assert(otherUser);
  TestValidator.notEquals(
    "other user should have a distinct uuid",
    otherUser.id,
    user.id,
  );
  await TestValidator.error(
    "other user cannot access first user's todo",
    async () => {
      await api.functional.todoApp.user.todos.at(connection, {
        todoId: created.id,
      });
    },
  );
}
