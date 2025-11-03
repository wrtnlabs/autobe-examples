import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoTodoCompletion } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodoCompletion";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

export async function test_api_todo_completion_mark_complete_idempotent(
  connection: api.IConnection,
) {
  /**
   * Mark a todo as completed and verify idempotent behavior.
   *
   * Steps:
   *
   * 1. Join as a user to obtain an authenticated session
   * 2. Create a todo (defaults: completed=false)
   * 3. First completion update to completed=true → expect updated_at refresh
   * 4. Repeat the same update (completed=true) → expect idempotent no-op on
   *    timestamps
   * 5. Join as another user and verify ownership enforcement by expecting error
   */

  // 1) Join as a user (authenticated context)
  const primaryAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string &
          tags.MinLength<8> &
          tags.Pattern<"^(?=.*[A-Za-z])(?=.*\\d).{8,}$"> &
          tags.Format<"password">
      >(),
      ip: null,
      href: typia.random<string & tags.MaxLength<80000> & tags.Format<"uri">>(),
      referrer: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<80000> & tags.Format<"uri">
      >(),
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(primaryAuth);

  // 2) Create a todo (title single-line, <=120 chars)
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    due_date: typia.random<string & tags.Format<"date">>(),
  } satisfies ITodoTodo.ICreate;
  const created = await api.functional.todo.user.todos.create(connection, {
    body: createBody,
  });
  typia.assert(created);

  // 3) First completion update → set completed=true
  const updated1 =
    await api.functional.todo.user.todos.completion.updateCompletion(
      connection,
      {
        todoId: created.id,
        body: { completed: true } satisfies ITodoTodoCompletion.IUpdate,
      },
    );
  typia.assert(updated1);
  // Business validations
  TestValidator.equals(
    "completed becomes true after first update",
    updated1.completed,
    true,
  );
  TestValidator.equals(
    "created_at remains unchanged after update",
    updated1.created_at,
    created.created_at,
  );
  TestValidator.notEquals(
    "updated_at is refreshed after first update",
    updated1.updated_at,
    created.updated_at,
  );

  // 4) Idempotency: repeat the same update (completed=true)
  const updated2 =
    await api.functional.todo.user.todos.completion.updateCompletion(
      connection,
      {
        todoId: created.id,
        body: { completed: true } satisfies ITodoTodoCompletion.IUpdate,
      },
    );
  typia.assert(updated2);
  TestValidator.equals(
    "completed stays true on idempotent update",
    updated2.completed,
    true,
  );
  TestValidator.equals(
    "updated_at remains unchanged on idempotent same-state update",
    updated2.updated_at,
    updated1.updated_at,
  );

  // 5) Ownership enforcement: another user should not be able to update first user's todo
  const secondaryAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string &
          tags.MinLength<8> &
          tags.Pattern<"^(?=.*[A-Za-z])(?=.*\\d).{8,}$"> &
          tags.Format<"password">
      >(),
      ip: null,
      href: typia.random<string & tags.MaxLength<80000> & tags.Format<"uri">>(),
      referrer: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<80000> & tags.Format<"uri">
      >(),
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(secondaryAuth);

  await TestValidator.error(
    "other user cannot update someone else's todo",
    async () => {
      await api.functional.todo.user.todos.completion.updateCompletion(
        connection,
        {
          todoId: created.id,
          body: { completed: false } satisfies ITodoTodoCompletion.IUpdate,
        },
      );
    },
  );
}
