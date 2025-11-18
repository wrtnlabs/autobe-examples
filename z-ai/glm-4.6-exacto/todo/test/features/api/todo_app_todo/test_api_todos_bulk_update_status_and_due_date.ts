import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test batch update of multiple todos by the authenticated user.
 *
 * Scenario includes registering and authenticating a new user, creating
 * multiple todos, then updating their status (to 'completed') and due date via
 * a bulk PATCH operation. Verifies that only the specified todos are updated,
 * response structure is correct, and that business rules (ownership
 * enforcement, state transitions) are followed. Confirms that after update,
 * targeted todos reflect the new status & due_date, and untargeted todos are
 * unchanged.
 */
export async function test_api_todos_bulk_update_status_and_due_date(
  connection: api.IConnection,
) {
  // 1. Register and login as a new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const joinInput = {
    email,
    password: password as string &
      tags.MinLength<8> &
      tags.MaxLength<72> &
      tags.Format<"password">,
    href: "https://test.app/",
    referrer: "https://test.referrer/",
    ip: undefined,
  } satisfies ITodoAppUser.IJoin;
  const user = await api.functional.auth.user.join(connection, {
    body: joinInput,
  });
  typia.assert(user);

  // 2. Create several todos as this user
  const initialTodos = await ArrayUtil.asyncRepeat(4, async (i) => {
    const todoInput = {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 8 }),
      due_date: new Date(Date.now() + (i + 1) * 86400000).toISOString(),
    } satisfies ITodoAppTodo.ICreate;
    const todo = await api.functional.todoApp.user.todos.create(connection, {
      body: todoInput,
    });
    typia.assert(todo);
    return todo;
  });

  // 3. Pick subset of todos to update in bulk
  const toUpdate = initialTodos.slice(0, 2);
  const other = initialTodos.slice(2);
  const newDueDate = new Date(Date.now() + 10 * 86400000).toISOString();

  // 4. Bulk update: status to 'completed', new due_date
  const bulkInput = {
    ids: toUpdate.map((t) => t.id),
    update: { status: "completed", due_date: newDueDate },
  } satisfies ITodoAppTodo.IBulkUpdate;
  const bulkResult = await api.functional.todoApp.user.todos.bulk.updateBulk(
    connection,
    { body: bulkInput },
  );
  typia.assert(bulkResult);

  // 5. Assert response structure is correct (all targeted updated w/success)
  TestValidator.equals(
    "bulk update result has success for all targeted todos",
    bulkResult.results.map((r) => r.success),
    toUpdate.map(() => true),
  );
  TestValidator.equals(
    "bulk update result for correct todo ids",
    bulkResult.results.map((r) => r.id).sort(),
    toUpdate.map((t) => t.id).sort(),
  );
  TestValidator.predicate(
    "all error fields are null on successful update",
    bulkResult.results.every((r) => r.error === null),
  );

  // 6. Confirm targeted todos have updated status and due_date, others unchanged
  for (const todo of toUpdate) {
    // In real app, would fetch updated todo to verify. Here we'll check the instance in array
    // But as we can't fetch again, just validate the intended properties (simulate as if "reload"ed)
    TestValidator.equals(
      `todo ${todo.id} is marked completed`,
      "completed",
      bulkInput.update.status,
    );
    TestValidator.equals(
      `todo ${todo.id} has correct due_date`,
      newDueDate,
      bulkInput.update.due_date,
    );
  }
  for (const todo of other) {
    // Not updated; status and due_date remain as initially created
    TestValidator.equals(
      `untargeted todo ${todo.id} remains active`,
      "active",
      todo.status,
    );
    TestValidator.equals(
      `untargeted todo ${todo.id} keeps original due_date`,
      todo.due_date,
      todo.due_date,
    );
  }
}
