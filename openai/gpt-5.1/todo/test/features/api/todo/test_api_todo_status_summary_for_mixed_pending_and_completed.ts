import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoStatusSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatusSummary";

/**
 * Validate aggregated todo status summary for a member user with mixed pending
 * and completed todos.
 *
 * Business goal: Ensure that GET /todoApp/memberUser/todos/statusSummary
 * correctly reflects the counts of total, pending, completed, and recently
 * completed todos for a single authenticated member user after creating and
 * completing a subset of todos.
 *
 * Scenario steps:
 *
 * 1. Register a new member user via POST /auth/memberUser/join, using
 *    ITodoAppMemberUserJoin.IRequest and letting the SDK attach the access
 *    token to the connection.
 * 2. Create four todos for that member user via POST /todoApp/memberUser/todos
 *    (ITodoAppTodo.ICreate):
 *
 *    - 2 todos that will remain pending.
 *    - 2 todos that will be immediately completed in a later step.
 * 3. Complete the two selected todos using POST
 *    /todoApp/memberUser/todos/{todoId}/complete.
 * 4. Call GET /todoApp/memberUser/todos/statusSummary.
 * 5. Assert business rules on ITodoAppTodoStatusSummary:
 *
 *    - Total_count === 4 (all created are non-deleted).
 *    - Pending_count === 2 (never-completed todos).
 *    - Completed_count === 2 (completed todos).
 *    - Recently_completed_count >= 2 (the two just-completed todos fall within
 *         whatever recent window the implementation uses).
 *
 * Notes and constraints:
 *
 * - No deletion API is provided, so we do not test logical deletion; all created
 *   todos remain visible and should be counted.
 * - All APIs must be invoked with `await`, and every non-void response must be
 *   validated with `typia.assert` to enforce runtime type guarantees.
 * - Request bodies must be constructed using `satisfies` with the precise DTO
 *   type (ITodoAppMemberUserJoin.IRequest, ITodoAppTodo.ICreate).
 * - Business assertions must use TestValidator with descriptive titles and follow
 *   the actual-first, expected-second parameter ordering.
 */
export async function test_api_todo_status_summary_for_mixed_pending_and_completed(
  connection: api.IConnection,
) {
  // 1. Register a new member user so that subsequent todo operations are
  //    performed in an authenticated memberUser context.
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    // For href and referrer, use random but valid URIs.
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    // ip is optional and may be null; we can omit it to let the server infer.
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const memberAuthorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinRequest,
    });
  typia.assert(memberAuthorized);

  // 2. Create four todos for this member user.
  //    Use simple deterministic titles so counts are easy to reason about.
  const todoCreateBodies: ITodoAppTodo.ICreate[] = [
    { title: "pending-1", description: "First pending todo" },
    { title: "pending-2", description: "Second pending todo" },
    { title: "complete-1", description: "First todo to complete" },
    { title: "complete-2", description: "Second todo to complete" },
  ];

  const createdTodos: ITodoAppTodo[] = [];
  for (const body of todoCreateBodies) {
    const created: ITodoAppTodo =
      await api.functional.todoApp.memberUser.todos.create(connection, {
        body: body satisfies ITodoAppTodo.ICreate,
      });
    typia.assert(created);
    createdTodos.push(created);
  }

  TestValidator.equals(
    "exactly four todos must have been created",
    createdTodos.length,
    4,
  );

  // 3. Complete the last two todos (indexes 2 and 3) so we have two pending
  //    and two completed todos for this member user.
  const todosToComplete: ITodoAppTodo[] = createdTodos.slice(2);
  const completedTodos: ITodoAppTodo[] = [];
  for (const todo of todosToComplete) {
    const completed: ITodoAppTodo =
      await api.functional.todoApp.memberUser.todos.complete(connection, {
        todoId: todo.id,
      });
    typia.assert(completed);
    completedTodos.push(completed);
  }

  TestValidator.equals(
    "two todos must have been completed",
    completedTodos.length,
    todosToComplete.length,
  );

  // Sanity-check the local status fields on the objects returned from
  // completion; this helps ensure lifecycle correctness in addition to the
  // summary endpoint.
  for (const completed of completedTodos) {
    TestValidator.equals(
      "completed todo status should be 'completed'",
      completed.status,
      "completed",
    );
    await TestValidator.predicate(
      "completed todo must have a non-null completed_at timestamp",
      () =>
        completed.completed_at !== null && completed.completed_at !== undefined,
    );
  }

  // 4. Call the status summary endpoint for this authenticated member user.
  const summary: ITodoAppTodoStatusSummary =
    await api.functional.todoApp.memberUser.todos.statusSummary.at(connection);
  typia.assert(summary);

  // 5. Validate the aggregated counts.
  TestValidator.equals(
    "summary.total_count should equal number of created todos",
    summary.total_count,
    createdTodos.length,
  );

  TestValidator.equals(
    "summary.completed_count should equal number of completed todos",
    summary.completed_count,
    completedTodos.length,
  );

  const expectedPendingCount = createdTodos.length - completedTodos.length;
  TestValidator.equals(
    "summary.pending_count should equal number of never-completed todos",
    summary.pending_count,
    expectedPendingCount,
  );

  // recently_completed_count is implementation-defined over some recent
  // window, but our just-completed todos should fall within that window,
  // so the summary value must be at least the number we just completed.
  await TestValidator.predicate(
    "summary.recently_completed_count should be at least number of just-completed todos",
    () => summary.recently_completed_count >= completedTodos.length,
  );
}
