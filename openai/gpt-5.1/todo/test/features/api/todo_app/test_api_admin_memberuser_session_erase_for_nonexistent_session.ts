import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Validate erasing a nonexistent member user session as admin.
 *
 * Business goal: Ensure that when an admin tries to erase a member user's
 * session that does not exist (for that member), the API responds with an error
 * and does not affect other valid sessions for that member. This protects
 * against improper cross-account or stale-session manipulation and confirms
 * that the scoping of memberUserId + sessionId is enforced.
 *
 * Steps:
 *
 * 1. Create a baseline system setting using POST /todoApp/adminUser/systemSettings
 *    so that the todoApp environment behaves as in a configured system.
 * 2. Register an admin actor via POST /auth/adminUser/join; this both creates the
 *    admin account and authenticates it, giving us a privileged context for
 *    admin-only APIs.
 * 3. Register a member user via POST /auth/memberUser/join to create a real member
 *    in the todo_app_memberusers table, including an initial session.
 * 4. As that member, create a todo via POST /todoApp/memberUser/todos to confirm
 *    the member account and session are operational and to have a concrete todo
 *    resource associated with the member.
 * 5. Capture the member user's id from the join response; this value will be used
 *    as the memberUserId path parameter in the admin session erase endpoint.
 * 6. Generate a fresh random UUID value for sessionId that is never used as a real
 *    session id in the test. This guarantees that the targeted session does not
 *    exist for the given member scope.
 * 7. Ensure the connection is authenticated as the admin (if necessary, call
 *    /auth/adminUser/login again to switch actor back to admin).
 * 8. Call DELETE
 *    /todoApp/adminUser/memberUsers/{memberUserId}/sessions/{sessionId} using
 *    api.functional.todoApp.adminUser.memberUsers.sessions.erase with the real
 *    memberUserId and bogus sessionId.
 * 9. Use await TestValidator.error("nonexistent member session erase should fail",
 *    async () => ...) to assert that this operation fails. Do not check the
 *    exact status code or error payload; only that an error is thrown according
 *    to the testing guidelines.
 * 10. After the failed erase attempt, switch authentication back to the member user
 *     by calling /auth/memberUser/login with the member's credentials.
 * 11. As the member user, create another todo via POST /todoApp/memberUser/todos.
 *     This demonstrates that legitimate sessions for that member remain
 *     operational and unaffected by the admin's failed erase attempt on a
 *     nonexistent session.
 * 12. Assert via typia.assert that both todo responses conform to ITodoAppTodo and
 *     that their embedded memberUser.id matches the member user's id from
 *     join/login, confirming continuity of ownership.
 */
export async function test_api_admin_memberuser_session_erase_for_nonexistent_session(
  connection: api.IConnection,
) {
  // 1. Create a baseline system setting as admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassword!123" as string & tags.Format<"password">,
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todoapp.test/join",
    referrer: "https://landing.todoapp.test/",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const settingBody = {
    key: "max_active_todos_per_user",
    value: "100",
    type: "int",
    description: "Maximum number of active todos per member user in tests",
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const setting = await api.functional.todoApp.adminUser.systemSettings.create(
    connection,
    {
      body: settingBody,
    },
  );
  typia.assert(setting);

  // 2. Register a member user and create initial session
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPassword!123" as string & tags.Format<"password">,
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://app.todoapp.test/join",
    referrer: "https://landing.todoapp.test/",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberId = memberAuthorized.id;

  // 3. Create first todo as the member user
  const firstTodoBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    due_date: null,
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const firstTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: firstTodoBody,
    });
  typia.assert(firstTodo);

  // Verify ownership of first todo
  TestValidator.equals(
    "first todo owner should be the joined member",
    firstTodo.memberUser.id,
    memberId,
  );

  // 4. Generate a bogus sessionId that does not exist for this member
  const bogusSessionId = typia.random<string & tags.Format<"uuid">>();

  // 5. Ensure we are authenticated as admin again (switch actor if needed)
  const adminLoginBody = {
    email: adminAuthorized.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.todoapp.test/login",
    referrer: "https://admin.todoapp.test/",
  } satisfies ITodoAppAdminUser.ILogin;

  const adminLoggedIn: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 6. Attempt to erase a nonexistent session for the existing member user
  await TestValidator.error(
    "nonexistent member session erase should fail",
    async () => {
      await api.functional.todoApp.adminUser.memberUsers.sessions.erase(
        connection,
        {
          memberUserId: memberId,
          sessionId: bogusSessionId,
        },
      );
    },
  );

  // 7. Switch back to member user by logging in again
  const memberLoginBody = {
    email: memberAuthorized.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://app.todoapp.test/login",
    referrer: "https://app.todoapp.test/",
  } satisfies ITodoAppMemberUserLogin.ICreate;

  const memberLoggedIn: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoggedIn);

  TestValidator.equals(
    "member id after login should match original member id",
    memberLoggedIn.id,
    memberId,
  );

  // 8. Create a second todo as the member user to confirm session unaffected
  const secondTodoBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    due_date: null,
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const secondTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: secondTodoBody,
    });
  typia.assert(secondTodo);

  // 9. Validate second todo ownership and continued usability
  TestValidator.equals(
    "second todo owner should still be the same member",
    secondTodo.memberUser.id,
    memberId,
  );

  TestValidator.equals(
    "member id in second login payload should equal owner of second todo",
    memberLoggedIn.id,
    secondTodo.memberUser.id,
  );
}
