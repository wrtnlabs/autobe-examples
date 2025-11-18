import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAdminuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdminuserSession";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppAdminUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUserSession";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_adminuser_session_detail_with_expired_session(
  connection: api.IConnection,
) {
  // 1. Admin joins and gets initial authorized context
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.test.com`,
    password: "AdminPassw0rd!",
    display_name: RandomGenerator.name(2),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/join",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorizedOnJoin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedOnJoin);

  const adminId: string & tags.Format<"uuid"> = adminAuthorizedOnJoin.id;

  // 2. As admin, create a system setting to simulate typical admin activity
  const systemSettingBody = {
    key: `max_active_todos_${RandomGenerator.alphabets(6)}`,
    value: "100",
    type: "int",
    description: "Maximum active todos per member user for load management",
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const createdSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert(createdSetting);

  // 3. Create a member user and log them in to generate member-side activity
  const memberJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@member.test.com`,
    password: "MemberPassw0rd!",
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://todo-app.test/signup",
    referrer: "https://todo-app.test/landing",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorizedOnJoin: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedOnJoin);

  const memberLoginBody = {
    email: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://todo-app.test/login",
    referrer: "https://todo-app.test/landing",
  } satisfies ITodoAppMemberUserLogin.ICreate;

  const memberAuthorizedOnLogin: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedOnLogin);

  // 4. As member, create a todo to simulate workload
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: null,
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(createdTodo);

  // 5. Log in again as the admin user to create at least one additional session
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/login",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppAdminUser.ILogin;

  const adminAuthorizedOnLogin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedOnLogin);

  // 6. List sessions for the admin user
  const sessionsRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    fromCreatedAt: null,
    toCreatedAt: null,
    ip: null,
    orderByCreatedAt: "desc" as const,
  } satisfies ITodoAppAdminUserSession.IRequest;

  const sessionsPageBefore: IPageITodoAppAdminuserSession.ISummary =
    await api.functional.todoApp.adminUser.adminUsers.sessions.index(
      connection,
      {
        adminUserId: adminId,
        body: sessionsRequestBody,
      },
    );
  typia.assert(sessionsPageBefore);

  TestValidator.predicate(
    "admin sessions list should contain at least one session",
    sessionsPageBefore.pagination.records > 0,
  );

  const sessionsBefore: ITodoAppAdminUserSession.ISummary[] =
    sessionsPageBefore.data;

  // Prefer a session that appears expired (expired_at != null), otherwise
  // just use the last session in the list as the target for detail inspection
  const candidateExpired = sessionsBefore.find(
    (s) => s.expired_at !== null && s.expired_at !== undefined,
  );

  const targetSessionSummary =
    candidateExpired !== undefined
      ? candidateExpired
      : sessionsBefore[sessionsBefore.length - 1];

  const targetSessionId = targetSessionSummary.id;

  // 7. Fetch detailed information for the chosen session
  const detail1: ITodoAppAdminUserSession =
    await api.functional.todoApp.adminUser.adminUsers.sessions.at(connection, {
      adminUserId: adminId,
      sessionId: targetSessionId,
    });
  typia.assert(detail1);

  // 8. Basic consistency checks between summary and detail
  TestValidator.equals(
    "detailed session id should match summary id",
    detail1.id,
    targetSessionSummary.id,
  );

  TestValidator.equals(
    "detailed admin id should match admin user id",
    detail1.adminUser.id,
    adminId,
  );

  TestValidator.equals(
    "summary and detail ip should match",
    detail1.ip,
    targetSessionSummary.ip,
  );

  TestValidator.equals(
    "summary and detail href should match",
    detail1.href,
    targetSessionSummary.href,
  );

  TestValidator.equals(
    "summary and detail referrer should match",
    detail1.referrer,
    targetSessionSummary.referrer,
  );

  TestValidator.equals(
    "summary and detail created_at should match",
    detail1.created_at,
    targetSessionSummary.created_at,
  );

  if (
    targetSessionSummary.expired_at !== null &&
    targetSessionSummary.expired_at !== undefined
  ) {
    TestValidator.equals(
      "summary and detail expired_at should both be non-null and equal",
      detail1.expired_at,
      targetSessionSummary.expired_at,
    );
  } else {
    TestValidator.equals(
      "summary and detail expired_at should both be null when summary is null",
      detail1.expired_at,
      null,
    );
  }

  // 9. Confirm that repeated GET calls are read-only
  const detail2: ITodoAppAdminUserSession =
    await api.functional.todoApp.adminUser.adminUsers.sessions.at(connection, {
      adminUserId: adminId,
      sessionId: targetSessionId,
    });
  typia.assert(detail2);

  TestValidator.equals(
    "repeated session detail fetch should return identical data (read-only)",
    detail2,
    detail1,
  );

  // Optional: re-fetch the sessions index and ensure the targeted session
  // still has the same expired_at value, confirming the detail call did not
  // mutate state.
  const sessionsPageAfter: IPageITodoAppAdminuserSession.ISummary =
    await api.functional.todoApp.adminUser.adminUsers.sessions.index(
      connection,
      {
        adminUserId: adminId,
        body: sessionsRequestBody,
      },
    );
  typia.assert(sessionsPageAfter);

  const sessionsAfter: ITodoAppAdminUserSession.ISummary[] =
    sessionsPageAfter.data;

  const targetAfter = sessionsAfter.find((s) => s.id === targetSessionId);

  TestValidator.predicate(
    "target session should still be present after detail inspection",
    targetAfter !== undefined,
  );

  if (targetAfter !== undefined) {
    TestValidator.equals(
      "expired_at should remain unchanged after detail inspection",
      targetAfter.expired_at ?? null,
      targetSessionSummary.expired_at ?? null,
    );
  }
}
