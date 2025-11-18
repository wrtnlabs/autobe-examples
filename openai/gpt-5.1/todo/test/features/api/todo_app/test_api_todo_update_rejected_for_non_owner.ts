import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Ensure a member user cannot update another member user's todo.
 *
 * Business goal:
 *
 * - Enforce strict per-user ownership on todo updates.
 * - Validate that an authenticated member user (B) cannot modify a todo owned by
 *   member user (A).
 * - Validation is based on the update operation failing for non-owners.
 *
 * Flow:
 *
 * 1. Register member user A via POST /auth/memberUser/join and obtain an
 *    authenticated context.
 * 2. Under user A's authentication, create a todo via POST
 *    /todoApp/memberUser/todos.
 * 3. Register member user B via POST /auth/memberUser/join; this switches the SDK
 *    connection Authorization to user B.
 * 4. While authenticated as B, attempt to update A's todo via PUT
 *    /todoApp/memberUser/todos/{todoId}.
 * 5. Assert that the update attempt results in an error (authorization
 *    enforcement) via TestValidator.error().
 *
 * Due to current SDK surface, there is no read endpoint for re-fetching the
 * todo, so we validate ownership enforcement solely by ensuring B's update
 * attempt fails.
 */
export async function test_api_todo_update_rejected_for_non_owner(
  connection: api.IConnection,
) {
  // 1. Register member user A (owner of the todo)
  const joinBodyA = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const memberA: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBodyA,
    });
  typia.assert(memberA);

  // 2. Under user A's context, create a todo
  const createBodyA = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITodoAppTodo.ICreate;

  const todoOfA: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: createBodyA,
    });
  typia.assert(todoOfA);

  // 3. Register member user B (non-owner attempting the update)
  const joinBodyB = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const memberB: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBodyB,
    });
  typia.assert(memberB);

  // 4. While authenticated as B, attempt to update A's todo
  const updateBodyByB = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    status: "completed",
  } satisfies ITodoAppTodo.IUpdate;

  await TestValidator.error(
    "non-owner should not be able to update another user's todo",
    async () => {
      await api.functional.todoApp.memberUser.todos.update(connection, {
        todoId: todoOfA.id,
        body: updateBodyByB,
      });
    },
  );
}
