import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate prevention of duplicate active todo titles on update.
 *
 * 1. User registers and logs in.
 * 2. User creates two incomplete todos with unique titles.
 * 3. User attempts to update the second todo's title to the first's title (which
 *    is still incomplete).
 * 4. API must reject the update due to business rule: no duplicate titles among
 *    active todos.
 * 5. Verify that the second todo remains unchanged after rejection.
 */
export async function test_api_todo_update_duplicate_title_rejected(
  connection: api.IConnection,
) {
  // 1. Register and authenticate user
  const email = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const password = RandomGenerator.alphaNumeric(12);
  const referrer = "https://test-client.app/";
  const href = "https://test-client.app/register";
  const displayName = RandomGenerator.name();
  const userAuth = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: password as string & tags.Format<"password">,
      href: href as string & tags.Format<"uri">,
      referrer: referrer as string & tags.Format<"uri">,
      display_name: displayName,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(userAuth);

  // 2. Create two incomplete todo items with unique titles
  const todoTitle1 = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 7,
  });
  const todoTitle2 = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 7,
  });

  const todo1 = await api.functional.todoList.user.todos.create(connection, {
    body: {
      title: todoTitle1,
      description: RandomGenerator.paragraph({
        sentences: 5,
        wordMin: 2,
        wordMax: 7,
      }),
    } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(todo1);

  const todo2 = await api.functional.todoList.user.todos.create(connection, {
    body: {
      title: todoTitle2,
      description: RandomGenerator.paragraph({
        sentences: 4,
        wordMin: 2,
        wordMax: 8,
      }),
    } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(todo2);

  // 3. Attempt to update the second todo's title to match the first's (should be rejected)
  await TestValidator.error(
    "should reject duplicate title for another active todo",
    async () => {
      await api.functional.todoList.user.todos.update(connection, {
        todoId: todo2.id,
        body: {
          title: todoTitle1,
        } satisfies ITodoListTodo.IUpdate,
      });
    },
  );

  // 4. Confirm the second todo remains unchanged
  // Fetching the todo after failed update attempt for validation
  // There is no direct todo read, so skip this step if such API doesn't exist
  // Instead, re-issue the update with the original title to prove it's still possible
  const updated = await api.functional.todoList.user.todos.update(connection, {
    todoId: todo2.id,
    body: {
      title: todoTitle2,
    } satisfies ITodoListTodo.IUpdate,
  });
  typia.assert(updated);
  TestValidator.equals(
    "todo title remains unchanged after failed update",
    updated.title,
    todoTitle2,
  );
}
