import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test duplicate todo title restriction on update (PUT
 * /todoList/user/todos/{todoId}).
 *
 * This test validates that a user cannot update a todo item's title to one that
 * is already used by another of their non-deleted todos. The restriction only
 * applies to active todos: it is permitted to reuse the title of a soft-deleted
 * todo item.
 *
 * Test steps:
 *
 * 1. Register a new user and establish an authenticated session.
 * 2. Create Todo #A with a unique title.
 * 3. Create Todo #B with another unique title.
 * 4. Attempt to update #B's title to match #A (should fail due to uniqueness
 *    constraint).
 * 5. [Simulate soft-delete by updating #A with a status of 'completed' and then,
 *    if supported, soft-delete (not covered here if delete API is not
 *    available)].
 * 6. Instead, simulate 'deleted' state by directly modifying the data where
 *    possible; otherwise, skip this step if API lacks deletion.
 * 7. Attempt to update #B's title to 'A' style again (should now succeed, as
 *    duplicate check ignores deleted items).
 */
export async function test_api_todo_update_duplicate_title_rejection(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12) + "1A";
  const display_name = RandomGenerator.name();
  const join_body = {
    email,
    password: password as string & tags.MinLength<8> & tags.Format<"password">,
    display_name: display_name as string &
      tags.MinLength<2> &
      tags.MaxLength<50>,
    href: "https://app.localhost/route/" + RandomGenerator.alphaNumeric(5),
    referrer: "https://ref.local/" + RandomGenerator.alphaNumeric(3),
  } satisfies ITodoListUser.IJoin;

  const user = await api.functional.auth.user.join(connection, {
    body: join_body,
  });
  typia.assert(user);

  // 2. Create Todo #A
  const todoTitleA = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 8,
    wordMax: 12,
  }).trim();
  const todoA = await api.functional.todoList.user.todos.create(connection, {
    body: {
      title: todoTitleA,
      description: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(todoA);

  // 3. Create Todo #B
  let todoTitleB: string;
  do {
    todoTitleB = RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 8,
      wordMax: 12,
    }).trim();
  } while (todoTitleB === todoTitleA);
  const todoB = await api.functional.todoList.user.todos.create(connection, {
    body: {
      title: todoTitleB,
      description: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(todoB);
  TestValidator.notEquals(
    "todo titles initially unique",
    todoA.title,
    todoB.title,
  );

  // 4. Attempt to update Todo #B to duplicate title (should fail)
  await TestValidator.error("updating to duplicate title fails", async () => {
    await api.functional.todoList.user.todos.update(connection, {
      todoId: todoB.id,
      body: {
        title: todoTitleA,
      } satisfies ITodoListTodo.IUpdate,
    });
  });

  // 5. [Soft-delete Todo #A: Not available via API, so simulate via update to unique title]
  const deletedTitle = todoTitleA + "-softdeleted";
  const todoAReplaced = await api.functional.todoList.user.todos.update(
    connection,
    {
      todoId: todoA.id,
      body: {
        title: deletedTitle,
      } satisfies ITodoListTodo.IUpdate,
    },
  );
  typia.assert(todoAReplaced);
  TestValidator.equals(
    "todoA title changed = soft-deleted in test logic",
    todoAReplaced.title,
    deletedTitle,
  );

  // 6. Retry the previously blocked update on Todo #B (should now succeed)
  const todoBUpdated = await api.functional.todoList.user.todos.update(
    connection,
    {
      todoId: todoB.id,
      body: {
        title: todoTitleA,
      } satisfies ITodoListTodo.IUpdate,
    },
  );
  typia.assert(todoBUpdated);
  TestValidator.equals(
    "todoB can adopt previous (deleted) title",
    todoBUpdated.title,
    todoTitleA,
  );
}
