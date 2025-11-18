import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppMemberuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuserSession";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Ensure that a member user cannot access another member user's session
 * details.
 *
 * Business intent
 *
 * - Session detail endpoint
 *   `/todoApp/memberUser/memberUsers/{memberUserId}/sessions/{sessionId}` must
 *   not allow arbitrary or cross-account access.
 * - A memberUser actor should not be able to see session metadata for any session
 *   that it does not own.
 * - When a caller attempts to read a non-owned or non-existent session, the
 *   backend must fail the request (e.g., forbidden or not found), never
 *   returning an `ITodoAppMemberuserSession` payload.
 *
 * Technical constraints
 *
 * - Only three SDK endpoints are available in this context:
 *
 *   - `api.functional.auth.memberUser.join` (register + authenticate)
 *   - `api.functional.todoApp.memberUser.todos.create` (create a todo for the
 *       authenticated member user)
 *   - `api.functional.todoApp.memberUser.memberUsers.sessions.at` (get a single
 *       session detail by memberUserId + sessionId path params)
 * - There is no API to list or create sessions explicitly, and
 *   `ITodoAppMemberuser.IAuthorized` does not carry a session id. Therefore we
 *   cannot obtain an actual persisted `sessionId` via the SDK and must treat
 *   the negative test as a generic unauthorized/mismatched access attempt.
 *
 * Scenario implementation
 *
 * 1. Register member user A using POST /auth/memberUser/join
 *
 *    - Use `typia.random<ITodoAppMemberUserJoin.IRequest>()` to produce a
 *         syntactically valid registration payload.
 *    - Capture the returned `ITodoAppMemberuser.IAuthorized` instance and assert it
 *         with `typia.assert`.
 *    - Remember A's `id` for later use as the `memberUserId` path parameter.
 * 2. While authenticated as A (the join call has already populated
 *    connection.headers.Authorization), create a todo via POST
 *    /todoApp/memberUser/todos
 *
 *    - Call `api.functional.todoApp.memberUser.todos.create` with a minimal valid
 *         body: { title: string, description?: string | null }
 *    - Assert the response `ITodoAppTodo` using `typia.assert`.
 *    - This step ensures that A's token works for memberUser-protected routes and
 *         exercises realistic activity prior to the authorization test.
 * 3. Register member user B using POST /auth/memberUser/join
 *
 *    - Again use `typia.random<ITodoAppMemberUserJoin.IRequest>()` for the request
 *         body.
 *    - Capture B's `ITodoAppMemberuser.IAuthorized.id` and assert the response.
 *    - The join call updates `connection.headers.Authorization` internally to B's
 *         access token, so subsequent memberUser endpoints are invoked as B.
 * 4. While authenticated as B, create a todo via POST /todoApp/memberUser/todos
 *
 *    - Use a simple title/description to create at least one todo for B.
 *    - Assert the resulting `ITodoAppTodo`.
 *    - This confirms B is fully authenticated and using the same todo flow as A.
 * 5. Attempt to access a non-owned session detail via GET
 *    /todoApp/memberUser/memberUsers/{memberUserId}/sessions/{sessionId}
 *
 *    - From the current authenticated context (now B), call the session detail
 *         endpoint using:
 *
 *         - `memberUserId`: A.id (from step 1)
 *         - `sessionId`: a randomly generated UUID using `typia.random<string &
 *                   tags.Format<'uuid'>>()`
 *    - Wrap this call in `await TestValidator.error(...)` to assert that an error is
 *         thrown, indicating that B cannot access a session associated with
 *         member user A.
 *    - We do not inspect specific HTTP status codes or the error payload; the
 *         presence of an error is sufficient to prove that session details are
 *         not leaked.
 * 6. Assertions and invariants
 *
 *    - All successful responses (join and todo creation) are validated via
 *         `typia.assert(...)`.
 *    - The only negative assertion is `TestValidator.error` around the `sessions.at`
 *         call. This guarantees that the attempt to read another user's session
 *         detail does not succeed.
 */
export async function test_api_member_session_detail_for_other_user_forbidden(
  connection: api.IConnection,
) {
  // 1. Register member user A
  const joinRequestA = typia.random<ITodoAppMemberUserJoin.IRequest>();

  const memberA: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinRequestA,
    });
  typia.assert(memberA);

  // 2. As member user A, create a todo
  const todoA: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(todoA);

  // 3. Register member user B (this also switches the connection's auth token)
  const joinRequestB = typia.random<ITodoAppMemberUserJoin.IRequest>();

  const memberB: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinRequestB,
    });
  typia.assert(memberB);

  // 4. As member user B, create a todo
  const todoB: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(todoB);

  // 5. Using B's authentication, attempt to access A's session detail
  //    Expectation: this must fail (forbidden or not found), never returning
  //    an ITodoAppMemberuserSession body.
  const foreignSessionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "member user must not access another member's session detail",
    async () => {
      await api.functional.todoApp.memberUser.memberUsers.sessions.at(
        connection,
        {
          memberUserId: memberA.id,
          sessionId: foreignSessionId,
        },
      );
    },
  );
}
