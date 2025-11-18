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
 * Validate that an admin can erase a member user session after the member has
 * been active.
 *
 * Business flow:
 *
 * 1. Admin self-registers via /auth/adminUser/join and becomes authenticated.
 * 2. Admin logs in again via /auth/adminUser/login to rotate tokens and confirm
 *    login flow.
 * 3. Admin creates at least one global system setting via POST
 *    /todoApp/adminUser/systemSettings.
 * 4. Member self-registers via /auth/memberUser/join and becomes authenticated;
 *    capture memberUser.id.
 * 5. Member logs in via /auth/memberUser/login to simulate additional sessions.
 * 6. As the authenticated member, create a todo via POST /todoApp/memberUser/todos
 *    to ensure activity exists.
 * 7. Switch back to admin via /auth/adminUser/login.
 * 8. Call DELETE
 *    /todoApp/adminUser/memberUsers/{memberUserId}/sessions/{sessionId} with a
 *    valid memberUserId and a random UUID sessionId to verify that the erase
 *    endpoint accepts scoped parameters and completes without error.
 *
 * Since the SDK does not expose session listing or concrete session IDs, this
 * test treats `sessionId` as an opaque UUID and only validates that the
 * endpoint is callable in a realistic admin/member lifecycle.
 */
export async function test_api_admin_memberuser_session_erase_after_member_activity(
  connection: api.IConnection,
) {
  // 1. Admin joins (registers) and becomes authenticated
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "AdminPassword!123",
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/join",
    referrer: "https://landing.todo-app.test/",
  } satisfies ITodoAppAdminUser.IJoin;

  const joinedAdmin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(joinedAdmin);

  // Basic sanity checks on admin identity
  TestValidator.predicate(
    "admin id must be a non-empty UUID string",
    () => joinedAdmin.id.length > 0,
  );

  // 2. Admin logs in again to confirm login flow and rotate token
  const adminLoginBody = {
    email: joinedAdmin.email,
    password: adminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/login",
    referrer: "https://landing.todo-app.test/",
  } satisfies ITodoAppAdminUser.ILogin;

  const loggedInAdmin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(loggedInAdmin);

  TestValidator.equals(
    "admin id must be stable across join and login",
    loggedInAdmin.id,
    joinedAdmin.id,
  );

  // 3. Admin creates at least one system setting
  const systemSettingBody = {
    key: `max_active_todos_${RandomGenerator.alphaNumeric(6)}`,
    value: "100",
    type: "int",
    description: "Maximum number of active todos per member user for testing",
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert(systemSetting);

  TestValidator.equals(
    "created system setting key must match requested key",
    systemSetting.key,
    systemSettingBody.key,
  );

  // 4. Member joins and becomes authenticated; capture memberUser.id
  const memberJoinBody = {
    email: `member+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "MemberPassword!123",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://member.todo-app.test/join",
    referrer: "https://landing.todo-app.test/",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const joinedMember: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(joinedMember);

  TestValidator.predicate(
    "member id must be a non-empty UUID string",
    () => joinedMember.id.length > 0,
  );

  TestValidator.notEquals(
    "admin and member must be distinct principals",
    joinedMember.id,
    joinedAdmin.id,
  );

  // 5. Member logs in again to establish another session
  const memberLoginBody = {
    email: joinedMember.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://member.todo-app.test/login",
    referrer: "https://landing.todo-app.test/",
  } satisfies ITodoAppMemberUserLogin.ICreate;

  const loggedInMember: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(loggedInMember);

  TestValidator.equals(
    "member id must be stable across join and login",
    loggedInMember.id,
    joinedMember.id,
  );

  // 6. As member, create a todo to ensure activity
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(createdTodo);

  TestValidator.equals(
    "todo owner must be the logged-in member user",
    createdTodo.memberUser.id,
    loggedInMember.id,
  );

  // 7. Switch back to admin via login (SDK updates Authorization header)
  const adminReloginBody = {
    email: joinedAdmin.email,
    password: adminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/login2",
    referrer: "https://landing.todo-app.test/",
  } satisfies ITodoAppAdminUser.ILogin;

  const reLoggedInAdmin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminReloginBody,
    });
  typia.assert(reLoggedInAdmin);

  TestValidator.equals(
    "admin id must remain consistent after re-login",
    reLoggedInAdmin.id,
    joinedAdmin.id,
  );

  // 8. Admin erases a specific member user session
  const randomSessionId = typia.random<string & tags.Format<"uuid">>();

  await api.functional.todoApp.adminUser.memberUsers.sessions.erase(
    connection,
    {
      memberUserId: joinedMember.id,
      sessionId: randomSessionId,
    },
  );

  // There is no return body, so reaching here without error is success.
  TestValidator.predicate("erase endpoint completed without throwing", true);
}
