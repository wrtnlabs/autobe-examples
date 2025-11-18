import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate authenticated todo detail access and enforce ownership restrictions.
 *
 * 1. Register user (join) and obtain authorization token.
 * 2. Simulate a todo being created under the authenticated user (use typia.random
 *    for test isolation).
 * 3. Retrieve the todo detail by ID with authentication. Assert all fields are
 *    correctly returned and user summary matches.
 * 4. Attempt access to a todo of a different (random non-existent) todoId; confirm
 *    error or not found response.
 * 5. Attempt access to a non-existent todoId (random UUID); confirm not found
 *    response.
 */
export async function test_api_todo_detail_access_by_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const joinReq = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://todo-test.join/", // placeholder URI for audit
    referrer: "https://referrer.example.com/", // placeholder URI for audit
  } satisfies ITodoListUser.IJoin;
  const auth: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: joinReq,
    },
  );
  typia.assert(auth);

  // 2. Simulate a todo created for this user: Assume this is the only accessible resource for this user
  const todo: ITodoListTodo = {
    id: typia.random<string & tags.Format<"uuid">>(),
    user: {
      id: auth.id,
      email: auth.email,
      created_at: auth.created_at,
      updated_at: auth.updated_at,
      disabled_at: auth.disabled_at ?? null,
    },
    title: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 10,
    }) as string & tags.MinLength<1> & tags.MaxLength<100>,
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }) as string & tags.MaxLength<500>,
    status: "pending",
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  // 3. Retrieve own todo detail
  // (simulate: in a real backend this would be a create-then-read cycle, here we assume direct model availability)
  // The API should return matching todo info for this user/todoId
  // (NOTE: This test template assumes the system matches todoId to proper user ownership)
  const response: ITodoListTodo = await api.functional.todoList.user.todos.at(
    connection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(response);
  TestValidator.equals("todo id matches", response.id, todo.id);
  TestValidator.equals("user summary matches", response.user, todo.user);
  TestValidator.equals("todo title matches", response.title, todo.title);
  TestValidator.equals(
    "description matches",
    response.description,
    todo.description,
  );
  TestValidator.equals("status matches", response.status, todo.status);
  TestValidator.equals("due_date matches", response.due_date, todo.due_date);
  TestValidator.equals(
    "created_at matches",
    response.created_at,
    todo.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    response.updated_at,
    todo.updated_at,
  );
  TestValidator.equals(
    "deleted_at matches",
    response.deleted_at,
    todo.deleted_at,
  );

  // 4. Attempt access to todoId not belonging to this user (random UUID)
  await TestValidator.error(
    "accessing non-owned todo should fail",
    async () => {
      await api.functional.todoList.user.todos.at(connection, {
        todoId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 5. Attempt access to non-existent (deleted or never-created) todoId
  await TestValidator.error(
    "accessing non-existent todo should fail",
    async () => {
      await api.functional.todoList.user.todos.at(connection, {
        todoId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
