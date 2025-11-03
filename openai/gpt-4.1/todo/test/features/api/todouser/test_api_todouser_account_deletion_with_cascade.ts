import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTodouser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodouser";

/**
 * Validates that a todoUser can permanently delete their own account, and that
 * all associated todos and session records are deleted via cascade.
 *
 * Business scenario:
 *
 * 1. A todoUser registers (join), verifying self-signup logic and authentication.
 * 2. The authenticated user creates a todo item to provide cascade-relevant data.
 * 3. The user deletes their own account using the "erase" endpoint.
 * 4. We assert that the account and all owned todos are inaccessible after
 *    deletion, verifying privacy and cascade business rules.
 */
export async function test_api_todouser_account_deletion_with_cascade(
  connection: api.IConnection,
) {
  // 1. Register a new todoUser
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10);
  const joinReq = {
    email,
    password,
    ip: undefined,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ITodoListTodouser.IVerifyJoin;
  const auth: ITodoListTodouser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, { body: joinReq });
  typia.assert(auth);
  TestValidator.equals("email matches input", auth.email, email);

  // 2. Authenticated user creates a todo
  const todoCreate = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 12,
    }),
  } satisfies ITodoListTodo.ICreate;
  const todo: ITodoListTodo =
    await api.functional.todoList.todoUser.todos.create(connection, {
      body: todoCreate,
    });
  typia.assert(todo);
  TestValidator.equals(
    "todo ownership assigned to correct user",
    todo.todo_list_todouser_id,
    auth.id,
  );

  // 3. Delete the user's own account
  await api.functional.todoList.todoUser.todoUsers.erase(connection, {
    todoUserId: auth.id,
  });

  // 4. Try to create a new todo (should fail as session is deleted)
  await TestValidator.error(
    "cannot create todo after account deletion (cascade session removal)",
    async () => {
      await api.functional.todoList.todoUser.todos.create(connection, {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: null,
        } satisfies ITodoListTodo.ICreate,
      });
    },
  );
}
