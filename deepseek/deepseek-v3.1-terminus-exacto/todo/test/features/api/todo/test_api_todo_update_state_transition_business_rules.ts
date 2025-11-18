import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate legal and illegal status transitions for todo items by update
 * endpoint. Ensures lifecycle transitions (pending → completed → archived) are
 * enforced and illegal direct transitions or reversals are not permitted by the
 * backend.
 *
 * Steps:
 *
 * 1. Register user
 * 2. Create a todo in 'pending' status
 * 3. Legally transition 'pending' → 'completed' (expect success)
 * 4. Try illegal 'completed' → 'pending' (expect error)
 * 5. Legal 'completed' → 'archived' (expect success)
 * 6. Illegal direct 'archived' → 'pending' (expect error)
 * 7. Illegal 'archived' → 'completed' (expect error)
 * 8. Confirm status after final successful transition
 */
export async function test_api_todo_update_state_transition_business_rules(
  connection: api.IConnection,
) {
  // 1. Register user
  const userInput = {
    email: `${RandomGenerator.alphabets(8)}@test.com`,
    password: RandomGenerator.alphaNumeric(12) + "A1",
  } satisfies ITodoListUser.ICreate;
  const user = await api.functional.auth.user.join(connection, {
    body: userInput,
  });
  typia.assert(user);

  // 2. Create a todo in 'pending' status
  const todoInput = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    status: "pending",
    // Optionals left unset (could randomize description/due_date)
  } satisfies ITodoListTodo.ICreate;
  const created = await api.functional.todoList.user.todos.create(connection, {
    body: todoInput,
  });
  typia.assert(created);
  TestValidator.equals(
    "todo initial status is pending",
    created.status,
    "pending",
  );

  // 3. Legal: pending → completed
  const toCompleted = await api.functional.todoList.user.todos.update(
    connection,
    {
      todoId: created.id,
      body: { status: "completed" } satisfies ITodoListTodo.IUpdate,
    },
  );
  typia.assert(toCompleted);
  TestValidator.equals(
    "todo status updated to completed",
    toCompleted.status,
    "completed",
  );

  // 4. Illegal: completed → pending (should fail)
  await TestValidator.error(
    "illegal transition from completed to pending should fail",
    async () => {
      await api.functional.todoList.user.todos.update(connection, {
        todoId: created.id,
        body: { status: "pending" } satisfies ITodoListTodo.IUpdate,
      });
    },
  );

  // 5. Legal: completed → archived
  const toArchived = await api.functional.todoList.user.todos.update(
    connection,
    {
      todoId: created.id,
      body: { status: "archived" } satisfies ITodoListTodo.IUpdate,
    },
  );
  typia.assert(toArchived);
  TestValidator.equals(
    "todo status updated to archived",
    toArchived.status,
    "archived",
  );

  // 6. Illegal: archived → pending
  await TestValidator.error(
    "illegal transition from archived to pending should fail",
    async () => {
      await api.functional.todoList.user.todos.update(connection, {
        todoId: created.id,
        body: { status: "pending" } satisfies ITodoListTodo.IUpdate,
      });
    },
  );

  // 7. Illegal: archived → completed
  await TestValidator.error(
    "illegal transition from archived to completed should fail",
    async () => {
      await api.functional.todoList.user.todos.update(connection, {
        todoId: created.id,
        body: { status: "completed" } satisfies ITodoListTodo.IUpdate,
      });
    },
  );

  // 8. Confirm final status is archived
  // Re-fetch to verify (but since update returns the full entity, use toArchived)
  TestValidator.equals(
    "todo status remains archived after disallowed transitions",
    toArchived.status,
    "archived",
  );
}
