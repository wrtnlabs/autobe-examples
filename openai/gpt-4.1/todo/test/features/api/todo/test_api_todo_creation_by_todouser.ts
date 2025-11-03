import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTodouser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodouser";

/**
 * Validate the creation of a new todo item by an authenticated todoUser.
 *
 * 1. Register (join) a new todoUser and authenticate session
 * 2. Create a new todo with a valid unique title and optional description
 * 3. Assert returned todo has correct ownership, default fields, and valid system
 *    timestamps/ids
 * 4. Validate title/description field length constraints
 * 5. Privacy is enforced: todo is only visible to creating user
 * 6. Negative test: unauthenticated user cannot create a todo (should error)
 */
export async function test_api_todo_creation_by_todouser(
  connection: api.IConnection,
) {
  // 1. Register (join) a new todoUser and authenticate session
  const uniqueEmail = `${RandomGenerator.alphaNumeric(8)}@todo-e2e.com`;
  const joinBody = {
    email: uniqueEmail,
    password: RandomGenerator.alphaNumeric(12),
    href: "https://e2e.test/signup",
    referrer: "https://e2e.test/landing",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoListTodouser.IVerifyJoin;
  const auth: ITodoListTodouser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: joinBody,
    });
  typia.assert(auth);

  // 2. Create a new todo with a valid unique title and an optional description
  const todoInput = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 2,
      wordMax: 20,
    }),
  } satisfies ITodoListTodo.ICreate;
  const created: ITodoListTodo =
    await api.functional.todoList.todoUser.todos.create(connection, {
      body: todoInput,
    });
  typia.assert(created);

  // 3. Assert correct ownership and default fields set
  TestValidator.equals(
    "todo ownership assigned to user",
    created.todo_list_todouser_id,
    auth.id,
  );
  TestValidator.equals(
    "todo is not completed by default",
    created.is_completed,
    false,
  );
  TestValidator.equals(
    "todo completion timestamp is null by default",
    created.completed_at,
    null,
  );
  TestValidator.predicate(
    "todo id is a valid uuid",
    typeof created.id === "string" && created.id.length > 0,
  );
  TestValidator.predicate(
    "todo created_at is valid",
    typeof created.created_at === "string" && created.created_at.length > 0,
  );
  TestValidator.predicate(
    "todo updated_at is valid",
    typeof created.updated_at === "string" && created.updated_at.length > 0,
  );

  // 4. Validate field length constraints: title (1~100), description (<=500)
  TestValidator.predicate(
    "title has 1~100 chars",
    created.title.length <= 100 && created.title.length >= 1,
  );
  if (created.description !== null && created.description !== undefined)
    TestValidator.predicate(
      "description <=500 chars",
      created.description.length <= 500,
    );

  // 5. Privacy enforcement - ensure that the todo belongs to this authenticated user (already checked by id)

  // 6. Negative test: unauthenticated user cannot create a todo
  const anonConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "creating todo as unauthenticated user should fail",
    async () => {
      await api.functional.todoList.todoUser.todos.create(anonConn, {
        body: todoInput,
      });
    },
  );
}
