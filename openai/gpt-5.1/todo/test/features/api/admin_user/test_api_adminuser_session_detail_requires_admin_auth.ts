import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppAdminuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminuserSession";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Verify that admin session detail endpoint is protected by admin
 * authentication.
 *
 * Business purpose:
 *
 * - Ensure that detailed administrative session metadata, represented by
 *   ITodoAppAdminuserSession, cannot be fetched without a valid adminUser
 *   authentication context.
 * - Demonstrate that the endpoint rejects unauthenticated access attempts.
 * - Ground the test in realistic usage by creating both a memberUser with todo
 *   activity and an adminUser with an active session, even though the concrete
 *   sessionId cannot be discovered from the provided APIs.
 *
 * Scenario steps:
 *
 * 1. Register a new member user via POST /auth/memberUser/join.
 *
 *    - Use ITodoAppMemberUserJoin.IRequest to provide email, password, href, and
 *         referrer, plus optional display_name and ip.
 *    - Assert the returned ITodoAppMemberuser.IAuthorized using typia.assert.
 * 2. As the authenticated memberUser, create at least one todo via POST
 *    /todoApp/memberUser/todos.
 *
 *    - Use ITodoAppTodo.ICreate with realistic title and optional description.
 *    - Assert the returned ITodoAppTodo structure.
 *    - This step ensures the system has real todo activity, aligning with the
 *         business requirement that admin sessions are inspected in a live
 *         system.
 * 3. Register a new adminUser via POST /auth/adminUser/join.
 *
 *    - Use ITodoAppAdminUser.IJoin to provide email, password, and optional
 *         display_name.
 *    - The SDK automatically stores the admin token in connection.headers.
 *    - Assert returned ITodoAppAdminUser.IAuthorized with typia.assert and capture
 *         the adminUserId from the response.
 * 4. Attempt to read an admin session detail without authentication.
 *
 *    - Construct an unauthenticated connection by shallow-cloning the original
 *         connection and overriding headers with an empty object, without any
 *         further header mutation.
 *    - Choose a concrete adminUserId from the admin join response and a UUID for
 *         sessionId via typia.random<string & tags.Format<"uuid">>().
 *    - Call api.functional.todoApp.adminUser.adminUsers.sessions.at with the
 *         unauthenticated connection and the (adminUserId, sessionId) pair
 *         inside TestValidator.error, asserting that an error is thrown. We do
 *         not check status codes or error body; we only require that the call
 *         fails, proving that unauthenticated actors cannot read admin session
 *         details.
 *
 * Note:
 *
 * - Due to the lack of a session listing API in the provided SDK, there is no
 *   type-safe way to discover a real sessionId. Therefore this test is
 *   intentionally focused on the negative path (unauthenticated access
 *   failure), which still validates the core security boundary that the
 *   endpoint requires admin authentication.
 *
 * Constraints and caveats:
 *
 * - No deliberate type errors: all request bodies use the exact DTO types and
 *   required fields.
 * - No HTTP status code assertions: we only validate that an error occurs.
 * - No direct mutation of connection.headers beyond creating an independent
 *   unauthenticated connection object with headers: {}.
 */
export async function test_api_adminuser_session_detail_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Register a new member user
  const memberJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(1),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const memberAuthorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinRequest,
    });
  typia.assert(memberAuthorized);

  // 2. Create a todo as the authenticated member user
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(createdTodo);

  // 3. Register a new admin user and obtain authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(1),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminUserId = adminAuthorized.id;

  // 4. Attempt to read session detail without authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const randomSessionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "unauthenticated access to admin session should fail",
    async () => {
      await api.functional.todoApp.adminUser.adminUsers.sessions.at(
        unauthConn,
        {
          adminUserId,
          sessionId: randomSessionId,
        },
      );
    },
  );
}
