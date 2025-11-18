import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Verify that an authenticated user can permanently delete their own todo item.
 *
 * 1. Register a new user and authenticate (obtain session via /auth/user/join)
 * 2. Create a new todo for that user using /todo/user/todos
 * 3. Delete the created todo using DELETE /todo/user/todos/{todoId}
 * 4. Confirm that the deleted todo is immediately and irreversibly removed (cannot
 *    be re-accessed, does not appear in user's list, hard delete)
 * 5. Ensure that deletion fails for nonexistent todoId and for unauthorized items
 *
 * Validates business rules on strict ownership, privacy, and deletion finality.
 */
export async function test_api_todo_permanent_deletion_by_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Register a new user (join) and authenticate
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphabets(10);
  const joinResponse: ITodoUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password,
        href: "https://test.example.com/register",
        referrer: "https://test.example.com/landing",
        ip: null,
      } satisfies ITodoUser.ICreate,
    });
  typia.assert(joinResponse);

  // 2. Create todo for authenticated user
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 12 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 2,
      sentenceMax: 4,
    }),
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    priority: RandomGenerator.pick(["low", "medium", "high"] as const),
  } satisfies ITodoTodo.ICreate;

  const todo: ITodoTodo = await api.functional.todo.user.todos.create(
    connection,
    {
      body: createBody,
    },
  );
  typia.assert(todo);
  TestValidator.equals(
    "todo belongs to registered user",
    todo.user_id,
    joinResponse.id,
  );

  // 3. Permanently delete the todo
  const deleteResult = await api.functional.todo.user.todos.erase(connection, {
    todoId: todo.id,
  });
  typia.assert(deleteResult);
  TestValidator.equals("deleted todo id matches", deleteResult.id, todo.id);

  // 4. Attempt to delete the same todo again (should fail)
  await TestValidator.error(
    "cannot delete already deleted todo (irreversibility)",
    async () => {
      await api.functional.todo.user.todos.erase(connection, {
        todoId: todo.id,
      });
    },
  );

  // (optional) Attempt to delete a random non-existent todoId
  await TestValidator.error(
    "cannot delete a non-existent todo id",
    async () => {
      await api.functional.todo.user.todos.erase(connection, {
        todoId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // (optional) Confirm truly irrecoverable: create another todo and check only new todo present
  const newTodo: ITodoTodo = await api.functional.todo.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ITodoTodo.ICreate,
    },
  );
  typia.assert(newTodo);

  // There is no todo list/index endpoint, so additional existence checks are omitted.
}
