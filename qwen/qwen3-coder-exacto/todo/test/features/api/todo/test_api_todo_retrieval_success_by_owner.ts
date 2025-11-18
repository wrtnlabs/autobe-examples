import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate that a user can retrieve their own todo details, but not others',
 * via GET /todoList/user/todos/{todoId}.
 *
 * Scenarios covered:
 *
 * 1. Register userA and create a todo as userA (with and without description).
 * 2. Retrieve the todo as userA by ID and ensure field-level match with creation
 *    input.
 * 3. Register userB; fail to retrieve userA's todo with userB's auth context.
 * 4. Attempt retrieval using a non-existent todoId, expecting error.
 * 5. Attempt retrieval without authentication (no token) or with an invalid token,
 *    expecting error.
 *
 * Ensures strict ownership enforcement in todo detail access, validates both
 * the presence and absence of optional description, and tests both successful
 * and error pathways for private data access.
 */
export async function test_api_todo_retrieval_success_by_owner(
  connection: api.IConnection,
) {
  // 1. Register userA (owner) for primary authentication context
  const userAInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://todoapp.example.com/signup",
    referrer: "https://todoapp.example.com/home",
    ip: undefined,
  } satisfies ITodoListUser.ICreate;
  const userA = await api.functional.auth.user.join(connection, {
    body: userAInput,
  });
  typia.assert(userA);

  // 2. As userA, create two todos (one with description, one without)
  const todoWithDesc = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 8,
      wordMax: 16,
    }),
    due_date: null,
  } satisfies ITodoListTodo.ICreate;
  const todoAWithDesc = await api.functional.todoList.user.todos.create(
    connection,
    { body: todoWithDesc },
  );
  typia.assert(todoAWithDesc);

  const todoWithoutDesc = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 12 }),
    // no description property set, tests absence during retrieval
    due_date: undefined,
  } satisfies ITodoListTodo.ICreate;
  const todoAWithoutDesc = await api.functional.todoList.user.todos.create(
    connection,
    { body: todoWithoutDesc },
  );
  typia.assert(todoAWithoutDesc);

  // 3. Retrieve first todo as userA and verify field match
  const detailWithDesc = await api.functional.todoList.user.todos.at(
    connection,
    { todoId: todoAWithDesc.id },
  );
  typia.assert(detailWithDesc);
  TestValidator.equals(
    "todo fields w/desc match creation",
    detailWithDesc.title,
    todoWithDesc.title,
  );
  TestValidator.equals(
    "description present and matches",
    detailWithDesc.description,
    todoWithDesc.description,
  );
  TestValidator.equals(
    "completed is false by default",
    detailWithDesc.completed,
    false,
  );
  TestValidator.equals(
    "user id matches owner",
    detailWithDesc.user.id,
    userA.id,
  );
  TestValidator.predicate(
    "todo id validity",
    typeof detailWithDesc.id === "string" && detailWithDesc.id.length > 0,
  );

  // 4. Retrieve second todo (no description) as userA and check fields
  const detailWithoutDesc = await api.functional.todoList.user.todos.at(
    connection,
    { todoId: todoAWithoutDesc.id },
  );
  typia.assert(detailWithoutDesc);
  TestValidator.equals(
    "todo fields w/o desc match creation",
    detailWithoutDesc.title,
    todoWithoutDesc.title,
  );
  TestValidator.equals(
    "no description property returned if omitted",
    detailWithoutDesc.description,
    undefined,
  );
  TestValidator.equals(
    "completed is false by default",
    detailWithoutDesc.completed,
    false,
  );
  TestValidator.equals(
    "user id matches owner",
    detailWithoutDesc.user.id,
    userA.id,
  );

  // 5. Register userB for negative access test
  const userBInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://todoapp.example.com/join",
    referrer: "https://todoapp.example.com/home",
    ip: undefined,
  } satisfies ITodoListUser.ICreate;
  const userB = await api.functional.auth.user.join(connection, {
    body: userBInput,
  });
  typia.assert(userB);

  // Switch session to userB (API SDK manages tokens for us)
  // Attempt to access userA's todo with userB's credentials; expect authorization error
  await TestValidator.error(
    "userB forbidden from accessing userA's todo (desc)",
    async () => {
      await api.functional.todoList.user.todos.at(connection, {
        todoId: todoAWithDesc.id,
      });
    },
  );
  await TestValidator.error(
    "userB forbidden from accessing userA's todo (no desc)",
    async () => {
      await api.functional.todoList.user.todos.at(connection, {
        todoId: todoAWithoutDesc.id,
      });
    },
  );

  // 6. Attempt to retrieve a non-existent todoId as userB (still fails as forbidden/not found)
  const bogusId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("cannot get a non-existent todoId", async () => {
    await api.functional.todoList.user.todos.at(connection, {
      todoId: bogusId,
    });
  });

  // 7. Attempt to retrieve todo with no authentication (simulate by zeroing out token)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "no auth - should fail todo retrieval",
    async () => {
      await api.functional.todoList.user.todos.at(unauthConn, {
        todoId: todoAWithDesc.id,
      });
    },
  );

  // 8. Attempt to retrieve with invalid auth token
  const invalidAuthConn: api.IConnection = {
    ...connection,
    headers: { Authorization: "Bearer invalidtoken" },
  };
  await TestValidator.error("invalid token rejected", async () => {
    await api.functional.todoList.user.todos.at(invalidAuthConn, {
      todoId: todoAWithDesc.id,
    });
  });
}
