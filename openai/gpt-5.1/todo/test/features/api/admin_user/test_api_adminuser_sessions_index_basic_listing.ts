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
 * Basic listing of admin user sessions for the authenticated admin.
 *
 * This scenario verifies that:
 *
 * - An admin who has joined and logged in can retrieve a paginated list of their
 *   own sessions through PATCH
 *   /todoApp/adminUser/adminUsers/{adminUserId}/sessions.
 * - Global system settings exist (at least one ITodoAppSystemSetting created).
 * - Regular member activity (member join + todo creation) has taken place before
 *   auditing sessions, proving the system is in a realistic state.
 * - The listing respects simple pagination arguments (page, limit) and returns
 *   only sessions belonging to the specified admin user.
 *
 * Steps
 *
 * 1. Admin join: create a new admin user and capture id + token.
 * 2. Extra admin login: perform an additional login to ensure multiple sessions
 *    for this admin (join may already create one session).
 * 3. Create a system setting as that admin so that global configuration exists.
 * 4. Member join: register a member user account.
 * 5. Member todo create: create at least one todo for the member to simulate
 *    normal app usage.
 * 6. Admin login again: ensure the current connection represents the admin actor
 *    when calling sessions.index.
 * 7. Call sessions.index with page=1 and limit=10 for the admin’s id.
 * 8. Validate response type and pagination metadata with typia.assert and
 *    TestValidator.
 * 9. Ensure every returned session belongs to the admin and core fields are
 *    well-formed, allowing expired_at to be null for active sessions.
 */
export async function test_api_adminuser_sessions_index_basic_listing(
  connection: api.IConnection,
) {
  // 1. Admin join: register a new admin user and capture authorized response
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
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todoapp.local/join",
    referrer: "https://admin.todoapp.local/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorizedOnJoin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminAuthorizedOnJoin);

  const adminId: string & tags.Format<"uuid"> = adminAuthorizedOnJoin.id;

  // 2. Extra admin login to ensure additional session exists
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: "127.0.0.1",
    href: "https://admin.todoapp.local/login",
    referrer: "https://admin.todoapp.local/landing",
  } satisfies ITodoAppAdminUser.ILogin;

  const adminAuthorizedOnLogin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminAuthorizedOnLogin);

  TestValidator.equals(
    "admin id should be consistent between join and login",
    adminAuthorizedOnLogin.id,
    adminId,
  );

  // 3. Create a system setting as the admin to ensure configuration exists
  const systemSettingCreateBody = {
    key: "feature_admin_session_audit",
    value: "true",
    type: "boolean",
    description: "Enable admin session audit listing tests",
    group: "features",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingCreateBody,
    });
  typia.assert<ITodoAppSystemSetting>(systemSetting);

  // 4. Member join: register a member user
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberJoinBody = {
    email: memberEmail,
    password: typia.random<string & tags.Format<"password">>(),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://app.todoapp.local/join",
    referrer: "https://app.todoapp.local/landing",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorizedOnJoin: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ITodoAppMemberUser.IAuthorized>(memberAuthorizedOnJoin);

  // 5. Member todo create: create at least one todo for the member
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: new Date().toISOString(),
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert<ITodoAppTodo>(createdTodo);

  TestValidator.equals(
    "created todo should have state 'active'",
    createdTodo.state,
    "active",
  );

  // 6. Switch back to admin context via login (member join/login modified token)
  const adminAuthorizedAfterMemberOps: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminAuthorizedAfterMemberOps);

  TestValidator.equals(
    "admin id should remain the same after re-login",
    adminAuthorizedAfterMemberOps.id,
    adminId,
  );

  // 7. Call sessions.index for the admin with simple pagination request
  const sessionRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    fromCreatedAt: null,
    toCreatedAt: null,
    ip: undefined,
    orderByCreatedAt: "desc" as const,
  } satisfies ITodoAppAdminUserSession.IRequest;

  const pageOfSessions: IPageITodoAppAdminuserSession.ISummary =
    await api.functional.todoApp.adminUser.adminUsers.sessions.index(
      connection,
      {
        adminUserId: adminId,
        body: sessionRequestBody,
      },
    );
  typia.assert<IPageITodoAppAdminuserSession.ISummary>(pageOfSessions);

  const pagination = pageOfSessions.pagination;
  TestValidator.predicate(
    "pagination.current must be non-negative int",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit must be positive or zero",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records must be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages must be non-negative",
    pagination.pages >= 0,
  );

  // 8. Ensure data array is non-empty and each session matches admin id
  TestValidator.predicate(
    "session list should not be empty for active admin",
    pageOfSessions.data.length > 0,
  );

  for (const session of pageOfSessions.data) {
    // validate each summary
    typia.assert<ITodoAppAdminUserSession.ISummary>(session);

    TestValidator.equals(
      "each session must belong to requested admin",
      session.adminUser.id,
      adminId,
    );

    TestValidator.predicate(
      "session.ip should be a non-empty string",
      typeof session.ip === "string" && session.ip.length > 0,
    );
    TestValidator.predicate(
      "session.href should be a non-empty string",
      typeof session.href === "string" && session.href.length > 0,
    );
    TestValidator.predicate(
      "session.referrer should be a non-empty string",
      typeof session.referrer === "string" && session.referrer.length > 0,
    );
    TestValidator.predicate(
      "session.created_at should be a non-empty string",
      typeof session.created_at === "string" && session.created_at.length > 0,
    );

    if (session.expired_at !== null && session.expired_at !== undefined) {
      TestValidator.predicate(
        "expired_at when present must be non-empty string",
        typeof session.expired_at === "string" && session.expired_at.length > 0,
      );
    }
  }

  // 9. Optionally ensure at least one active session (expired_at null)
  const hasActiveSession: boolean = pageOfSessions.data.some(
    (s) => s.expired_at === null || s.expired_at === undefined,
  );

  TestValidator.predicate(
    "there should be at least one active (non-expired) session",
    hasActiveSession,
  );
}
