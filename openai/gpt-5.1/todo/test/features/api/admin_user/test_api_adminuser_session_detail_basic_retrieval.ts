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
 * Validate that an authenticated admin user can successfully call the admin
 * session detail endpoint and receive a well-typed session object.
 *
 * Original business scenario:
 *
 * - Admin joins/logs in, generating an authentication session
 * - Admin drills down into a specific session record using GET
 *   /todoApp/adminUser/adminUsers/{adminUserId}/sessions/{sessionId}
 * - Response contains detailed connection metadata (ip, href, referrer,
 *   created_at, expired_at)
 *
 * Practical constraint with provided SDK:
 *
 * - There is no sessions listing endpoint, so we cannot obtain a real sessionId
 *   belonging to the admin from prior calls.
 * - In simulate mode, the sessions.at call ignores real persistence and returns
 *   typia.random<ITodoAppAdminuserSession>(), so any valid UUID values for
 *   adminUserId and sessionId are acceptable.
 * - In real mode, we can at least use a real adminUserId for the admin, but
 *   sessionId must still be synthetically generated because we lack a discovery
 *   API; we rely on the backend to enforce foreign-key constraints.
 *
 * Therefore this E2E test focuses on:
 *
 * 1. Creating realistic authentication context and app activity
 *
 *    - Create an adminUser with /auth/adminUser/join
 *    - Create a memberUser and log them in
 *    - As the memberUser, create a todo via /todoApp/memberUser/todos
 *    - Log back in as the adminUser so the connection headers contain the admin
 *         token when we call the session detail endpoint
 * 2. Calling the admin session detail API
 *
 *    - Use the real admin.id as adminUserId
 *    - Use a randomly generated UUID as sessionId (since we cannot discover a
 *         concrete one through the public SDK)
 *    - Call api.functional.todoApp.adminUser.adminUsers.sessions.at(connection, {
 *         adminUserId, sessionId })
 * 3. Validating the result
 *
 *    - Use typia.assert to guarantee the response matches ITodoAppAdminuserSession
 *         at runtime
 *    - Use TestValidator.equals to ensure that the returned id is a non-empty string
 *         and matches its own value (sanity check)
 *    - Use TestValidator.predicate to document expectations about created_at and
 *         expired_at, acknowledging that expired_at may be null for active
 *         sessions
 *
 * The test deliberately avoids any type error scenarios or validation of
 * internal foreign-key relationships, which are beyond the capabilities of the
 * exposed SDK.
 */
export async function test_api_adminuser_session_detail_basic_retrieval(
  connection: api.IConnection,
) {
  // 1. Register an admin user (this also authenticates the connection as that admin)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const admin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a member user and associated activity (todo) to reflect real usage context
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.example.com/signup",
    referrer: "https://landing.example.com/ads/todo-app",
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const member: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(member);

  // Explicitly log in as the member to simulate ongoing usage
  const memberLoginBody = {
    email: member.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://todo-app.example.com/login",
    referrer: "https://todo-app.example.com/signup-complete",
  } satisfies ITodoAppMemberUserLogin.IRequest;

  const memberAfterLogin: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAfterLogin);

  // As the authenticated member, create a todo item
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ITodoAppTodo.ICreate;

  const todo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(todo);

  // 3. Switch authentication context back to the admin user
  const adminLoginBody = {
    email: admin.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://todo-app.example.com/admin/login",
    referrer: "https://todo-app.example.com/admin",
    user_agent: "E2E-Test-Agent/1.0",
  } satisfies ITodoAppAdminUser.ILogin;

  const adminAfterLogin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAfterLogin);

  // 4. Call the admin session detail endpoint with a valid UUID pair
  const adminUserId = adminAfterLogin.id;
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  const session: ITodoAppAdminuserSession =
    await api.functional.todoApp.adminUser.adminUsers.sessions.at(connection, {
      adminUserId,
      sessionId,
    });
  typia.assert(session);

  // 5. Business-level sanity checks
  TestValidator.predicate(
    "session id should be non-empty string",
    session.id.length > 0,
  );

  TestValidator.predicate(
    "session created_at should be a non-empty date-time string",
    session.created_at.length > 0,
  );

  // expired_at is allowed to be null or a date-time string; we only assert
  // that, when non-null, it is non-empty.
  if (session.expired_at !== null && session.expired_at !== undefined) {
    TestValidator.predicate(
      "expired_at, when present, should be non-empty",
      session.expired_at.length > 0,
    );
  }
}
