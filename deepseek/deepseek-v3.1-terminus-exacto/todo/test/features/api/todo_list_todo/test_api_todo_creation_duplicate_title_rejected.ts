import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate that creating a todo with a duplicate title for the same user is not
 * allowed.
 *
 * Steps:
 *
 * 1. Register a new user with a random, unique email and password.
 * 2. Create a todo item with a randomly generated, unique title for the user.
 * 3. Attempt to create another todo item for the same user, using the same title
 *    as before.
 * 4. Assert that the API rejects the second creation attempt, confirming
 *    enforcement of the title uniqueness constraint per user account.
 */
export async function test_api_todo_creation_duplicate_title_rejected(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userEmail = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<255> & tags.Format<"email">
  >();
  const userPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<72> & tags.Format<"password">
  >();
  const userAuth: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(userAuth);

  // 2. Create a todo with unique title
  const uniqueTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 15,
  });
  const todo1 = await api.functional.todoList.user.todos.create(connection, {
    body: {
      title: uniqueTitle,
      status: "pending",
    } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(todo1);
  TestValidator.equals("todo title matches input", todo1.title, uniqueTitle);

  // 3. Attempt to create another todo with the same title for the same user
  await TestValidator.error(
    "duplicate todo title for same user should be rejected",
    async () => {
      await api.functional.todoList.user.todos.create(connection, {
        body: {
          title: uniqueTitle,
          status: "pending",
        } satisfies ITodoListTodo.ICreate,
      });
    },
  );
}
