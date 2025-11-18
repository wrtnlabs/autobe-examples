import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Update a single field (title) on an existing todo and validate business,
 * audit, and security logic.
 *
 * 1. Register a new user for todo context (join)
 * 2. Create a todo for this user (POST)
 * 3. Update the todo's title using the update API, only sending the title field
 * 4. Validate:
 *
 *    - Title is updated, other fields unchanged
 *    - Updated_at is different/newer
 *    - User can only update own todos (positive and negative ownership)
 *    - Title length and blank rules enforced (runtime/business constraint
 *         validation)
 * 5. Negative case: forbidden update as another user and rejected invalid title
 */
export async function test_api_todo_update_single_field(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email: string = typia.random<string & tags.Format<"email">>();
  const joinHref: string = "https://example.com/join";
  const joinReferrer: string = "https://google.com/";
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email,
        password: RandomGenerator.alphaNumeric(12),
        href: joinHref,
        referrer: joinReferrer,
      } satisfies ITodoListUser.IJoin,
    },
  );
  typia.assert(user);

  // 2. Create a new todo
  const origTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 4,
    wordMax: 12,
  }).slice(0, 80);
  const origDescription = RandomGenerator.paragraph({ sentences: 3 });
  const origDueDate = new Date(Date.now() + 86400000).toISOString(); // tomorrow
  const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: origTitle,
        description: origDescription,
        due_date: origDueDate,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo);
  TestValidator.equals("created title", todo.title, origTitle);
  TestValidator.equals(
    "created description",
    todo.description,
    origDescription,
  );
  TestValidator.equals("created due_date", todo.due_date, origDueDate);
  TestValidator.equals("created completed", todo.completed, false);

  // 3. Update the title of the todo (nothing else)
  const newTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 10,
    wordMax: 20,
  }).slice(0, 95);
  await new Promise((r) => setTimeout(r, 5)); // ensure timestamp gap
  const updated: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: todo.id,
      body: {
        title: newTitle,
      } satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(updated);
  TestValidator.equals("title updated", updated.title, newTitle);
  TestValidator.equals(
    "description unchanged",
    updated.description,
    todo.description,
  );
  TestValidator.equals("due date unchanged", updated.due_date, todo.due_date);
  TestValidator.equals(
    "completed unchanged",
    updated.completed,
    todo.completed,
  );
  TestValidator.equals("id unchanged", updated.id, todo.id);
  TestValidator.notEquals(
    "updated_at is modified",
    updated.updated_at,
    todo.updated_at,
  );

  // 4. Try to update with invalid title: blank title
  await TestValidator.error("blank title should be rejected", async () => {
    await api.functional.todoList.user.todos.update(connection, {
      todoId: todo.id,
      body: {
        title: "", // invalid: blank
      } satisfies ITodoListTodo.IUpdate,
    });
  });
  // 4(b). Try to update with invalid title: too long
  await TestValidator.error("too long title should be rejected", async () => {
    await api.functional.todoList.user.todos.update(connection, {
      todoId: todo.id,
      body: {
        title: RandomGenerator.alphaNumeric(101), // invalid: exceeds 100 chars
      } satisfies ITodoListTodo.IUpdate,
    });
  });

  // 5. Negative case: register a second user and attempt to update other's todo
  const anotherEmail: string = typia.random<string & tags.Format<"email">>();
  const anotherUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: anotherEmail,
        password: RandomGenerator.alphaNumeric(12),
        href: joinHref,
        referrer: joinReferrer,
      } satisfies ITodoListUser.IJoin,
    });
  typia.assert(anotherUser);
  // Auth context: the SDK should automatically use the token of the most recently joined user
  await TestValidator.error(
    "other user forbidden from updating todo",
    async () => {
      await api.functional.todoList.user.todos.update(connection, {
        todoId: todo.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ITodoListTodo.IUpdate,
      });
    },
  );
}
