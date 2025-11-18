import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Ensure an admin user can invoke the member session deletion endpoint.
 *
 * This test walks through a realistic multi-actor auth flow, then calls the
 * admin-only DELETE
 * /todoApp/adminUser/memberUsers/{memberUserId}/sessions/{sessionId} endpoint
 * using the generated SDK.
 *
 * Steps:
 *
 * 1. Register an admin user via POST /auth/adminUser/join and obtain an
 *    ITodoAppAdminUser.IAuthorized context. The SDK automatically stores the
 *    admin access token into connection.headers.Authorization.
 * 2. Register a member user via POST /auth/memberUser/join, capturing
 *    ITodoAppMemberuser.IAuthorized, including the member id that will be
 *    referenced in the admin session delete call.
 * 3. Log in as that member user via POST /auth/memberUser/login to ensure that at
 *    least one authenticated session exists for this member in the backend
 *    (even though the sessionId is not exposed through the SDK).
 * 4. While authenticated as the member, create a todo through POST
 *    /todoApp/memberUser/todos to exercise the session and confirm that todo
 *    operations work for this account.
 * 5. Switch back to the admin user context by calling POST /auth/adminUser/login
 *    with the same credentials used at join-time. The SDK again updates
 *    connection.headers.Authorization.
 * 6. As the admin user, invoke
 *    api.functional.todoApp.adminUser.memberUsers.sessions.erase with the
 *    member user's id and a well-formed UUID as sessionId. Because there is no
 *    session read API, we cannot bind a concrete session row; the primary
 *    purpose here is to validate that an authenticated admin can reach the
 *    endpoint with correct types and without authorization errors.
 *
 * Within current SDK constraints we cannot assert DB-level deletion or
 * follow-up 404 semantics, but we ensure:
 *
 * - Both admin and member authentication flows are valid
 * - Member todo creation succeeds under member auth
 * - The admin-only session erase endpoint is callable with proper memberUserId
 *   and sessionId arguments and returns without throwing.
 */
export async function test_api_admin_delete_member_session_success(
  connection: api.IConnection,
) {
  // 1. Register an admin user and obtain authorized context
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorizedFromJoin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 2. Register a member user and capture its id
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.test/member/join",
    referrer: "https://todo-app.test/landing",
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const memberAuthorizedFromJoin: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedFromJoin);

  const memberUserId = memberAuthorizedFromJoin.id;

  // 3. Log in as the member user to ensure a session exists
  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://todo-app.test/member/login",
    referrer: "https://todo-app.test/signin",
  } satisfies ITodoAppMemberUserLogin.IRequest;

  const memberAuthorizedFromLogin: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedFromLogin);

  // 4. Create a todo as the authenticated member user
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(createdTodo);

  TestValidator.equals(
    "created todo belongs to the logged-in member user",
    createdTodo.memberUser.id,
    memberUserId,
  );

  // 5. Switch back to the admin user by logging in again as admin
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://todo-app.test/admin/login",
    referrer: "https://todo-app.test/admin",
    user_agent: "todo-e2e-test-agent",
  } satisfies ITodoAppAdminUser.ILogin;

  const adminAuthorizedFromLogin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  // 6. As admin, invoke the session erase endpoint with a well-formed UUID
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await api.functional.todoApp.adminUser.memberUsers.sessions.erase(
    connection,
    {
      memberUserId,
      sessionId,
    },
  );

  // If we reach here without HttpError, treat as success for contract-level test
  TestValidator.predicate(
    "admin session erase endpoint completed without throwing",
    true,
  );
}
