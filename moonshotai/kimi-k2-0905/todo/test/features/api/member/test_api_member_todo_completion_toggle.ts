import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IETodoPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoPriority";
import type { IETodoRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoRole";
import type { IMemberCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IMemberCreate";
import type { ITodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoMember";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";

export async function test_api_member_todo_completion_toggle(
  connection: api.IConnection,
) {
  // 1. Register a new member for authentication
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMemberCreate.IRequest,
  });
  typia.assert(member);

  // 2. Create a new todo item for completion testing
  const createdTodo = await api.functional.todo.member.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        priority: RandomGenerator.pick(["Low", "Medium", "High"] as const),
      } satisfies ITodoTodo.ITodoCreate,
    },
  );
  typia.assert(createdTodo);

  // 3. Verify initial state - todo should be incomplete
  TestValidator.predicate(
    "todo initially incomplete",
    createdTodo.completed === false && createdTodo.completed_at === undefined,
  );

  // 4. Mark todo as complete
  const completedTodo = await api.functional.todo.member.todos.update(
    connection,
    {
      todoId: createdTodo.id,
      body: { completed: true } satisfies ITodoTodo.ITodoUpdate,
    },
  );
  typia.assert(completedTodo);

  // 5. Verify completion status and timestamp
  TestValidator.predicate(
    "todo marked complete with timestamp",
    completedTodo.completed === true &&
      completedTodo.completed_at !== undefined,
  );

  // 6. Mark todo as incomplete again
  const incompletedTodo = await api.functional.todo.member.todos.update(
    connection,
    {
      todoId: createdTodo.id,
      body: { completed: false } satisfies ITodoTodo.ITodoUpdate,
    },
  );
  typia.assert(incompletedTodo);

  // 7. Verify reversion status - should be incomplete with no completion timestamp
  TestValidator.predicate(
    "todo reverted to incomplete with no timestamp",
    incompletedTodo.completed === false &&
      incompletedTodo.completed_at === undefined,
  );

  // 8. Toggle completion status multiple times to test stability
  const toggleStates = [true, false, true, false];
  let currentTodo = incompletedTodo;

  for (const shouldComplete of toggleStates) {
    const updatedTodo = await api.functional.todo.member.todos.update(
      connection,
      {
        todoId: createdTodo.id,
        body: { completed: shouldComplete } satisfies ITodoTodo.ITodoUpdate,
      },
    );
    typia.assert(updatedTodo);

    TestValidator.predicate(
      "toggle state updated correctly",
      updatedTodo.completed === shouldComplete &&
        (shouldComplete
          ? updatedTodo.completed_at !== undefined
          : updatedTodo.completed_at === undefined),
    );

    currentTodo = updatedTodo;
  }

  // 9. Final verification - should be incomplete
  TestValidator.equals(
    "final todo state incomplete",
    currentTodo.completed,
    false,
  );
}
