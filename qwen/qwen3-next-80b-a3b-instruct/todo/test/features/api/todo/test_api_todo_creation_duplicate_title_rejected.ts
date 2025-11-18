import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Validate that creating a todo task with a duplicate title for the same user
 * is rejected.
 *
 * This test creates a new user, creates a todo with a unique title, then
 * attempts to create another todo with the exact same title. The system must
 * reject the second creation to enforce the unique-per-user title constraint.
 */
export async function test_api_todo_creation_duplicate_title_rejected(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email,
    password,
    href: "https://app.todo.local/sign-up",
    referrer: "https://app.todo.local/landing",
  } satisfies ITodoUser.IJoin;
  const user: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: joinBody },
  );
  typia.assert(user);

  // 2. Create the first todo with a unique title
  const uniqueTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const todoBody = {
    title: uniqueTitle,
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 12,
    }),
  } satisfies ITodoTodo.ICreate;
  const todo = await api.functional.todo.user.todos.create(connection, {
    body: todoBody,
  });
  typia.assert(todo);
  TestValidator.equals(
    "created todo title matches expected",
    todo.title,
    uniqueTitle,
  );

  // 3. Attempt to create a second todo with the same title (should be rejected)
  const duplicateBody = {
    title: uniqueTitle,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITodoTodo.ICreate;
  await TestValidator.error(
    "creating a todo with duplicate title for same user is rejected",
    async () => {
      await api.functional.todo.user.todos.create(connection, {
        body: duplicateBody,
      });
    },
  );
}
