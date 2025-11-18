import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoStatusSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatusSummary";

export async function test_api_todo_status_summary_excludes_deleted_todos(
  connection: api.IConnection,
) {
  // 1. Register a new member user to obtain an authenticated context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // display_name is optional, so we can either provide or omit it. Provide for realism.
    display_name: RandomGenerator.name(),
    // ip is optional and nullable; omit it to let server derive it.
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const authorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);
  typia.assert<IAuthorizationToken>(authorized.token);

  // 2. Create a set of todos in various lifecycle states.
  // - pendingActive: pending, never completed, never deleted
  // - completedActive: completed, not deleted
  // - pendingDeleted: pending, then deleted
  // - completedThenDeleted: completed, then deleted
  // Only the first two must contribute to counts.

  const pendingActive: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(pendingActive);

  const completedActiveBase: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(completedActiveBase);

  const pendingDeletedBase: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(pendingDeletedBase);

  const completedThenDeletedBase: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(completedThenDeletedBase);

  // 3. Transition some todos through complete and delete operations.

  // 3-1. Complete the `completedActiveBase` todo but do not delete it.
  const completedActive: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.complete(connection, {
      todoId: completedActiveBase.id,
    });
  typia.assert(completedActive);
  TestValidator.equals(
    "completedActive remains non-deleted",
    completedActive.deleted_at,
    null,
  );

  // 3-2. Delete the pendingDeletedBase todo while it is still pending.
  const pendingDeleted: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.erase(connection, {
      todoId: pendingDeletedBase.id,
    });
  typia.assert(pendingDeleted);
  TestValidator.predicate(
    "pendingDeleted should have deleted_at set",
    pendingDeleted.deleted_at !== null &&
      pendingDeleted.deleted_at !== undefined,
  );

  // 3-3. Complete then delete the completedThenDeletedBase todo.
  const completedThenDeletedCompleted: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.complete(connection, {
      todoId: completedThenDeletedBase.id,
    });
  typia.assert(completedThenDeletedCompleted);

  const completedThenDeleted: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.erase(connection, {
      todoId: completedThenDeletedCompleted.id,
    });
  typia.assert(completedThenDeleted);
  TestValidator.predicate(
    "completedThenDeleted should have deleted_at set",
    completedThenDeleted.deleted_at !== null &&
      completedThenDeleted.deleted_at !== undefined,
  );

  // Sanity checks on status values to keep expectations meaningful.
  TestValidator.equals(
    "pendingActive status should be pending",
    pendingActive.status,
    "pending",
  );
  TestValidator.equals(
    "completedActive status should be completed",
    completedActive.status,
    "completed",
  );

  // 4. Fetch status summary.
  const summary: ITodoAppTodoStatusSummary =
    await api.functional.todoApp.memberUser.todos.statusSummary.at(connection);
  typia.assert(summary);

  // 5. Validate that logically deleted todos are excluded from all counts.
  // Only pendingActive and completedActive should be counted.
  TestValidator.equals(
    "total_count should include only non-deleted todos",
    summary.total_count,
    2,
  );

  TestValidator.equals(
    "pending_count should count only non-deleted pending todos",
    summary.pending_count,
    1,
  );

  TestValidator.equals(
    "completed_count should count only non-deleted completed todos",
    summary.completed_count,
    1,
  );

  // For recently_completed_count we cannot know exact window length,
  // but we can assert that deleted completed todos are not counted by
  // asserting it is at most 1 (the non-deleted completed todo) and at least 0.
  TestValidator.predicate(
    "recently_completed_count should not exceed non-deleted completed todos",
    summary.recently_completed_count === 0 ||
      summary.recently_completed_count === 1,
  );
}
