import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Ensure that soft-deleted todos cannot be updated.
 *
 * Business goal:
 *
 * - Once a todo has been logically deleted (deleted_at set), the update endpoint
 *   must reject any modification attempts, preserving deletion semantics and
 *   preventing accidental resurrection or mutation of deleted records.
 *
 * Scenario steps:
 *
 * 1. Register a member user via /auth/memberUser/join so that we have a valid
 *    authenticated memberUser context (token is auto-bound to the connection by
 *    the SDK).
 * 2. Create a todo for this member via /todoApp/memberUser/todos.
 * 3. Logically delete that todo using /todoApp/memberUser/todos/{todoId} DELETE,
 *    which according to ITodoAppTodo marks deleted_at.
 * 4. Attempt to update the deleted todo via /todoApp/memberUser/todos/{todoId} PUT
 *    with a valid ITodoAppTodo.IUpdate payload that changes
 *    title/description/status.
 * 5. Assert that the update call fails (throws) and that the todo returned from
 *    erase has a non-null deleted_at, confirming the record remains in a
 *    deleted state.
 */
export async function test_api_todo_update_rejected_for_deleted_todo(
  connection: api.IConnection,
) {
  // 1. Register a member user to obtain an authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const authorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppMemberuser.IAuthorized>(authorized);

  // 2. Create a todo for this member user
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ITodoAppTodo.ICreate;

  const created: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: createBody,
    });
  typia.assert<ITodoAppTodo>(created);

  TestValidator.equals(
    "created todo should not be deleted initially",
    created.deleted_at,
    null,
  );

  // 3. Logically delete the todo
  const erased: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.erase(connection, {
      todoId: created.id,
    });
  typia.assert<ITodoAppTodo>(erased);

  await TestValidator.predicate(
    "erased todo should have non-null deleted_at",
    async () => erased.deleted_at !== null && erased.deleted_at !== undefined,
  );

  // 4. Attempt to update the logically deleted todo and expect failure
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    status: "completed",
  } satisfies ITodoAppTodo.IUpdate;

  await TestValidator.error(
    "cannot update logically deleted todo",
    async () => {
      await api.functional.todoApp.memberUser.todos.update(connection, {
        todoId: created.id,
        body: updateBody,
      });
    },
  );
}
