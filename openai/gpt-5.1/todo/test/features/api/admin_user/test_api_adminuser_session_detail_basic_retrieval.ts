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

/**
 * Validate that an authenticated admin user can retrieve detailed information
 * for one of their own sessions and that the detail endpoint is read-only.
 *
 * Business flow:
 *
 * 1. Register an admin account (join) which implicitly creates an initial admin
 *    session; capture the admin id and ensure tokens are issued.
 * 2. Log in again as the same admin to create at least one more adminUserSession
 *    row.
 * 3. While authenticated as that admin, create a system setting so the admin side
 *    of the system has some configuration data.
 * 4. Create a member user and at least one member todo so there is general
 *    application activity (not strictly required by the API contract but
 *    reflects realistic context).
 * 5. Log in again as the admin to ensure a fresh, recent session exists and that
 *    the Authorization header is set for admin-only APIs.
 * 6. List the admin’s sessions using the PATCH
 *    /todoApp/adminUser/adminUsers/{adminUserId}/sessions endpoint with a
 *    simple IRequest filter; select one concrete session summary from the
 *    returned page.
 * 7. Call GET /todoApp/adminUser/adminUsers/{adminUserId}/sessions/{sessionId} for
 *    the selected session and verify that the returned ITodoAppAdminUserSession
 *    matches the summary: id matches, adminUser.id matches the admin id,
 *    created_at matches, and expired_at is consistent.
 * 8. Assert basic field-level sanity (ip is non-empty, href/referrer are non-empty
 *    valid URIs via typia, etc.).
 * 9. Call the same detail endpoint again for the same session id and assert that
 *    the response is unchanged, confirming the detail view is read-only and
 *    does not mutate session attributes on read.
 */
export async function test_api_adminuser_session_detail_basic_retrieval(
  connection: api.IConnection,
) {
  // 1. Register an admin account (join)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(),
    status: "active",
    ip: RandomGenerator.mobile(),
    href: "https://admin.todoapp.example.com/join",
    referrer: "https://admin.todoapp.example.com/",
  } satisfies ITodoAppAdminUser.IJoin;

  const joinedAdmin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(joinedAdmin);

  const adminId = joinedAdmin.id;

  // 2. Log in again as the same admin to create additional session
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.todoapp.example.com/login",
    referrer: "https://admin.todoapp.example.com/login",
  } satisfies ITodoAppAdminUser.ILogin;

  const loggedInAdmin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(loggedInAdmin);

  TestValidator.equals(
    "admin id remains stable between join and login",
    loggedInAdmin.id,
    adminId,
  );

  // 3. Create at least one system setting as admin
  const systemSettingBody = {
    key: `max_active_todos_${RandomGenerator.alphaNumeric(8)}`,
    value: "100",
    type: "int",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert(systemSetting);

  TestValidator.equals(
    "system setting key matches input",
    systemSetting.key,
    systemSettingBody.key,
  );

  // 4. Create a member user and one todo for context
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberJoinBody = {
    email: memberEmail,
    password: typia.random<string & tags.Format<"password">>(),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://todoapp.example.com/join",
    referrer: "https://todoapp.example.com/",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

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

  TestValidator.equals(
    "todo title matches input",
    createdTodo.title,
    todoCreateBody.title,
  );

  // 5. Switch back to admin actor with another login to ensure a fresh session
  const adminLoginForListingBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.todoapp.example.com/sessions",
    referrer: "https://admin.todoapp.example.com/dashboard",
  } satisfies ITodoAppAdminUser.ILogin;

  const adminForListing: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginForListingBody,
    });
  typia.assert(adminForListing);

  TestValidator.equals(
    "admin id after relogin remains the same",
    adminForListing.id,
    adminId,
  );

  // 6. List sessions for this admin
  const sessionIndexBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    fromCreatedAt: null,
    toCreatedAt: null,
    ip: null,
    orderByCreatedAt: "desc" as const,
  } satisfies ITodoAppAdminUserSession.IRequest;

  const sessionPage: IPageITodoAppAdminuserSession.ISummary =
    await api.functional.todoApp.adminUser.adminUsers.sessions.index(
      connection,
      {
        adminUserId: adminId,
        body: sessionIndexBody,
      },
    );
  typia.assert(sessionPage);

  TestValidator.predicate(
    "at least one admin session is listed",
    sessionPage.data.length > 0,
  );

  const targetSummary: ITodoAppAdminUserSession.ISummary = sessionPage.data[0];
  typia.assert<ITodoAppAdminUserSession.ISummary>(targetSummary);

  TestValidator.equals(
    "session summary admin user id matches admin id",
    targetSummary.adminUser.id,
    adminId,
  );

  // 7. Retrieve detailed session information for the selected session
  const detail1: ITodoAppAdminUserSession =
    await api.functional.todoApp.adminUser.adminUsers.sessions.at(connection, {
      adminUserId: adminId,
      sessionId: targetSummary.id,
    });
  typia.assert(detail1);

  TestValidator.equals(
    "detailed session id matches summary id",
    detail1.id,
    targetSummary.id,
  );

  TestValidator.equals(
    "detailed admin user id matches joined admin id",
    detail1.adminUser.id,
    adminId,
  );

  TestValidator.equals(
    "detail created_at equals summary created_at",
    detail1.created_at,
    targetSummary.created_at,
  );

  TestValidator.equals(
    "detail expired_at equals summary expired_at",
    detail1.expired_at,
    targetSummary.expired_at ?? null,
  );

  TestValidator.predicate(
    "session ip is a non-empty string",
    detail1.ip.length > 0,
  );

  TestValidator.predicate(
    "session href is a non-empty string",
    detail1.href.length > 0,
  );

  TestValidator.predicate(
    "session referrer is a non-empty string",
    detail1.referrer.length > 0,
  );

  // 8. Re-fetch the same session detail and verify it is stable (read-only)
  const detail2: ITodoAppAdminUserSession =
    await api.functional.todoApp.adminUser.adminUsers.sessions.at(connection, {
      adminUserId: adminId,
      sessionId: targetSummary.id,
    });
  typia.assert(detail2);

  TestValidator.equals(
    "session detail is stable between reads",
    detail2,
    detail1,
  );
}
