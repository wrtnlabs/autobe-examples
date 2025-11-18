import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Validate lifecycle transition of a todo from pending to completed via the
 * generic update endpoint.
 *
 * Business goals:
 *
 * - A freshly joined member user can create a todo.
 * - The created todo starts in a non-completed state with completed_at null and
 *   deleted_at null.
 * - Updating the todo's status to a completed value transitions status and sets
 *   completed_at while keeping deleted_at null.
 * - Updated_at advances when the todo is updated and never goes backwards
 *   relative to created_at.
 *
 * High level flow:
 *
 * 1. Join as a member user using /auth/memberUser/join.
 * 2. Create a new todo using /todoApp/memberUser/todos (ITodoAppTodo.ICreate).
 * 3. Update the todo using /todoApp/memberUser/todos/{todoId} with
 *    ITodoAppTodo.IUpdate that sets status to "completed".
 * 4. Assert status, completed_at, updated_at, and deleted_at behave according to
 *    lifecycle expectations.
 */
export async function test_api_todo_update_status_to_completed(
  connection: api.IConnection,
) {
  // 1. Register a member user so that subsequent calls are authenticated as this user.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const authorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppMemberuser.IAuthorized>(authorized);

  // 2. Create a new todo for this member user.
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ITodoAppTodo.ICreate;

  const created: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: createBody,
    });
  typia.assert<ITodoAppTodo>(created);

  // Basic invariants on freshly created todo.
  TestValidator.equals(
    "created todo has same title as request",
    created.title,
    createBody.title,
  );

  // Lifecycle expectations before completion
  TestValidator.predicate(
    "created_at is not empty",
    created.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is not empty",
    created.updated_at.length > 0,
  );

  if (created.completed_at !== null && created.completed_at !== undefined) {
    TestValidator.predicate(
      "if completed_at is already set, it must be non-empty string",
      created.completed_at.length > 0,
    );
  }

  // For a newly created todo, deleted_at should not be set.
  TestValidator.predicate(
    "deleted_at should not be set for a newly created todo",
    created.deleted_at === null || created.deleted_at === undefined,
  );

  // 3. Update the todo status to completed using the generic update endpoint.
  const completedStatus = "completed";
  const updateBody = {
    status: completedStatus,
  } satisfies ITodoAppTodo.IUpdate;

  const updated: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.update(connection, {
      todoId: created.id,
      body: updateBody,
    });
  typia.assert<ITodoAppTodo>(updated);

  // 4. Business assertions after update

  // Status must reflect the completed state we requested.
  TestValidator.equals(
    "todo status should be updated to completed",
    updated.status,
    completedStatus,
  );

  // completed_at should now be non-null, indicating completion time recorded.
  TestValidator.predicate(
    "completed_at is set after marking todo as completed",
    updated.completed_at !== null && updated.completed_at !== undefined,
  );

  if (updated.completed_at !== null && updated.completed_at !== undefined) {
    TestValidator.predicate(
      "completed_at string is non-empty",
      updated.completed_at.length > 0,
    );
  }

  // deleted_at should remain null for a normal completion.
  TestValidator.predicate(
    "deleted_at remains null after completion",
    updated.deleted_at === null || updated.deleted_at === undefined,
  );

  // updated_at should be >= created_at and should advance between create and update.
  const createdAtMs = Date.parse(created.created_at);
  const createdUpdatedAtMs = Date.parse(created.updated_at);
  const updatedUpdatedAtMs = Date.parse(updated.updated_at);

  TestValidator.predicate(
    "created.updated_at is not earlier than created.created_at",
    !Number.isNaN(createdAtMs) &&
      !Number.isNaN(createdUpdatedAtMs) &&
      createdUpdatedAtMs >= createdAtMs,
  );

  TestValidator.predicate(
    "updated.updated_at is not earlier than created.updated_at",
    !Number.isNaN(createdUpdatedAtMs) &&
      !Number.isNaN(updatedUpdatedAtMs) &&
      updatedUpdatedAtMs >= createdUpdatedAtMs,
  );
}
