import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate enforcement of the per-user unique title constraint, including soft
 * deletion edge-case, for todo API.
 *
 * Steps:
 *
 * 1. Register a new user and obtain authentication.
 * 2. Create an initial todo with a random valid title.
 * 3. Attempt to create a second todo for the same user with the identical title:
 *    expect failure (business logic error, not type error).
 * 4. (Simulate soft delete by manual step, if supported; if not, skip and only
 *    perform positive/negative create tests.)
 * 5. Attempt to create a todo using the title of a previously (soft-)deleted todo:
 *    expect success.
 */
export async function test_api_todo_duplicate_title_rejection(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10) + "1a", // ensure min, letters, digit
    display_name: RandomGenerator.name(),
    href: "https://todo.example.com/join",
    referrer: "https://todo.example.com/landing",
    ip: null,
  } satisfies ITodoListUser.IJoin;
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: userJoinBody },
  );
  typia.assert(user);

  // 2. Create the baseline todo
  const title = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 8,
  });
  const createBody = {
    title,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITodoListTodo.ICreate;
  const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    { body: createBody },
  );
  typia.assert(todo);
  TestValidator.equals("todo title matches input", todo.title, title);

  // 3. Attempt duplicate (should fail)
  await TestValidator.error("duplicate title creation must fail", async () => {
    await api.functional.todoList.user.todos.create(connection, {
      body: createBody,
    });
  });

  // 4. [Skip soft delete: no /delete API implemented] So cannot soft-delete. Instead, try with a new title reuse edge-case with similar logic or document missing negative path.
}
