import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Validate reopening a completed todo by its owning member user.
 *
 * Business goal: Ensure that when a member user completes one of their todos
 * and then calls the reopen operation on the same todo id, the backend
 * correctly transitions the lifecycle of that todo from completed back to an
 * active/open state, preserving ownership and id while updating lifecycle
 * timestamps appropriately.
 *
 * Covered workflow:
 *
 * 1. Register a fresh member user using /auth/memberUser/join.
 * 2. Create a todo for that user using /todoApp/memberUser/todos.
 * 3. Complete that todo using /todoApp/memberUser/todos/{todoId}/complete.
 * 4. Reopen the same todo using /todoApp/memberUser/todos/{todoId}/reopen.
 * 5. Validate lifecycle consistency and ownership across all steps.
 */
export async function test_api_todo_reopen_after_completion_by_owner(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member user.
  const joinBody = {
    email: `member+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.example.com/signup",
    referrer: "https://todo-app.example.com/landing",
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const authorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppMemberuser.IAuthorized>(authorized);

  // Newly joined member accounts must not be logically deleted.
  TestValidator.equals(
    "newly joined member should not be deleted",
    authorized.deleted_at ?? null,
    null,
  );

  // 2. Create a new todo for the authenticated member user.
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITodoAppTodo.ICreate;

  const created: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: createBody,
    });
  typia.assert<ITodoAppTodo>(created);

  // Validate created todo basics.
  TestValidator.equals(
    "created todo title matches request",
    created.title,
    createBody.title,
  );
  TestValidator.equals(
    "created todo description matches request",
    created.description ?? null,
    createBody.description ?? null,
  );
  TestValidator.equals(
    "created todo should not be completed yet",
    created.completed_at ?? null,
    null,
  );
  TestValidator.equals(
    "created todo should not be deleted",
    created.deleted_at ?? null,
    null,
  );

  // Ownership consistency: memberUser.id should match authorized.id.
  TestValidator.equals(
    "todo owner id should equal authorized member id",
    created.memberUser.id,
    authorized.id,
  );

  // 3. Complete the todo.
  const completed: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.complete(connection, {
      todoId: created.id,
    });
  typia.assert<ITodoAppTodo>(completed);

  // Validate completion lifecycle.
  TestValidator.equals(
    "completed todo id should equal created id",
    completed.id,
    created.id,
  );
  TestValidator.equals(
    "completed todo owner id should remain the same",
    completed.memberUser.id,
    created.memberUser.id,
  );
  TestValidator.equals(
    "completed todo should not be deleted",
    completed.deleted_at ?? null,
    null,
  );
  TestValidator.predicate(
    "completed_at should be set after completion",
    completed.completed_at !== null && completed.completed_at !== undefined,
  );

  const completedStatus: string = completed.status;

  // 4. Reopen the todo.
  const reopened: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.reopen(connection, {
      todoId: created.id,
    });
  typia.assert<ITodoAppTodo>(reopened);

  // 5. Validate reopen lifecycle.
  TestValidator.equals(
    "reopened todo id should equal created id",
    reopened.id,
    created.id,
  );
  TestValidator.equals(
    "reopened todo owner id should remain the same",
    reopened.memberUser.id,
    created.memberUser.id,
  );
  TestValidator.equals(
    "reopened todo should not be deleted",
    reopened.deleted_at ?? null,
    null,
  );
  TestValidator.equals(
    "reopened todo should have completed_at cleared",
    reopened.completed_at ?? null,
    null,
  );

  // Status should reflect a change relative to the completed state, if the
  // backend uses distinct values for completed vs active.
  TestValidator.notEquals(
    "reopened todo status should differ from completed status when lifecycle changes",
    reopened.status,
    completedStatus,
  );
}
