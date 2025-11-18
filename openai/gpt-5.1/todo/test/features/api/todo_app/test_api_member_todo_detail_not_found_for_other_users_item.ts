import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Ensure that a member user cannot retrieve another member's todo details.
 *
 * Business goal:
 *
 * - Validate the authorization/ownership boundary on the todo detail endpoint GET
 *   /todoApp/memberUser/todos/{todoId}.
 * - Even if an intruder somehow knows or guesses the UUID of another user's todo,
 *   the API must not return the ITodoAppTodo details to them.
 *
 * Test workflow:
 *
 * 1. Register an Owner member user via POST /auth/memberUser/join using the shared
 *    connection (SDK attaches Owner's access token to the connection).
 * 2. As Owner, create a todo via POST /todoApp/memberUser/todos and capture its
 *    id, verifying that the created todo is owned by the Owner.
 * 3. Register an Intruder member user via another POST /auth/memberUser/join on
 *    the same connection (Authorization header is switched to Intruder's
 *    token).
 * 4. While authenticated as the Intruder, call GET
 *    /todoApp/memberUser/todos/{todoId} using the Owner's todo id.
 * 5. Assert that this cross-user access attempt fails (throws an error) and
 *    therefore does not return an ITodoAppTodo instance to the Intruder.
 */
export async function test_api_member_todo_detail_not_found_for_other_users_item(
  connection: api.IConnection,
) {
  // 1. Register Owner (member user A)
  const ownerJoinBody = typia.random<ITodoAppMemberUserJoin.IRequest>();
  const ownerAuth = await api.functional.auth.memberUser.join(connection, {
    body: ownerJoinBody,
  });
  typia.assert<ITodoAppMemberuser.IAuthorized>(ownerAuth);

  const ownerId = ownerAuth.id;

  // 2. Create todo as Owner
  const createTodoBody = typia.random<ITodoAppTodo.ICreate>();
  const ownerTodo = await api.functional.todoApp.memberUser.todos.create(
    connection,
    {
      body: createTodoBody,
    },
  );
  typia.assert<ITodoAppTodo>(ownerTodo);

  // Sanity check: created todo is owned by Owner
  TestValidator.equals(
    "todo should belong to owner",
    ownerTodo.memberUser.id,
    ownerId,
  );

  const ownerTodoId = ownerTodo.id;

  // 3. Register Intruder (member user B) on the same connection
  const intruderJoinBody = typia.random<ITodoAppMemberUserJoin.IRequest>();
  const intruderAuth = await api.functional.auth.memberUser.join(connection, {
    body: intruderJoinBody,
  });
  typia.assert<ITodoAppMemberuser.IAuthorized>(intruderAuth);

  // 4. As Intruder, attempt to fetch Owner's todo detail
  await TestValidator.error(
    "intruder cannot access foreign member's todo",
    async () => {
      await api.functional.todoApp.memberUser.todos.at(connection, {
        todoId: ownerTodoId,
      });
    },
  );
}
