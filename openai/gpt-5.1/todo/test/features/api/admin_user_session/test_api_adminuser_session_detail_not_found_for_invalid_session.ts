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
 * Validate that admin session detail endpoint does not leak data for invalid or
 * cross-admin session IDs.
 *
 * Business goal
 *
 * - Ensure that GET
 *   /todoApp/adminUser/adminUsers/{adminUserId}/sessions/{sessionId} only
 *   returns details for sessions that belong to the specified admin user and
 *   that exist, and that any invalid or cross-admin combination results in an
 *   error without returning ITodoAppAdminUserSession payloads.
 *
 * High-level flow
 *
 * 1. Register admin A and establish an authenticated admin session.
 * 2. As admin A, create system settings to satisfy admin domain prerequisites.
 * 3. Register and authenticate a member user and create at least one todo to
 *    simulate normal app activity (not directly tied to sessions, but ensures
 *    the environment is in realistic use).
 * 4. Re-login as admin A, then enumerate sessions for admin A using PATCH
 *    /todoApp/adminUser/adminUsers/{adminUserId}/sessions, capturing at least
 *    one valid session summary.
 * 5. Register a second admin (admin B) and ensure there is at least one valid
 *    session for admin B as well.
 * 6. Use a cross-admin mismatch: call the session detail endpoint with adminUserId
 *    of admin B but sessionId of an existing session owned by admin A. This
 *    simulates an attempt by admin B (or a caller scoped to admin B) to access
 *    admin A's session detail.
 * 7. Assert that the GET call throws an error (via TestValidator.error) and does
 *    not return ITodoAppAdminUserSession data, avoiding any assumption about
 *    the concrete HTTP status code.
 *
 * Implementation notes
 *
 * - Use explicit DTOs:
 *
 *   - ITodoAppAdminUser.IJoin and ITodoAppAdminUser.ILogin for admin auth.
 *   - ITodoAppMemberUserJoin.ICreate and ITodoAppMemberUserLogin.ICreate for member
 *       user flows.
 *   - ITodoAppSystemSetting.ICreate for creating system settings.
 *   - ITodoAppTodo.ICreate for member todos.
 *   - ITodoAppAdminUserSession.IRequest for session index filters.
 * - Always call typia.assert on successful responses.
 * - Use RandomGenerator and typia.random to build realistic payloads while
 *   respecting tags (email, uri, date-time, etc.).
 * - For the negative test, wrap the GET call in `await TestValidator.error(
 *   "cross admin session detail must fail", async () => { ... })`.
 */
export async function test_api_adminuser_session_detail_not_found_for_invalid_session(
  connection: api.IConnection,
) {
  // 1. Register admin A (join) and obtain authorized context.
  const adminAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminA: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert(adminA);

  // 2. As admin A, create at least one system setting to satisfy domain usage.
  const settingCreateBody = {
    key: `max_active_todos_per_user_${RandomGenerator.alphaNumeric(6)}`,
    value: "100",
    type: "int",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: settingCreateBody,
    });
  typia.assert(systemSetting);

  // 3. Register and login a member user, then create a todo to simulate traffic.
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/marketing",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorizedFromJoin: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedFromJoin);

  // Explicit member login to exercise login flow as well.
  const memberLoginBody = {
    email: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/landing",
  } satisfies ITodoAppMemberUserLogin.ICreate;

  const memberAuthorizedFromLogin: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedFromLogin);

  // Create a member todo.
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    due_date: null,
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const todo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(todo);

  // 4. Re-login as admin A to ensure the connection is using admin credentials
  //    when enumerating sessions.
  const adminALoginBody = {
    email: adminA.email,
    password: adminAJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ITodoAppAdminUser.ILogin;

  const adminALogin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminALoginBody,
    });
  typia.assert(adminALogin);

  // Enumerate sessions for admin A.
  const adminASessionRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    fromCreatedAt: null,
    toCreatedAt: null,
    ip: null,
    orderByCreatedAt: "desc" as const,
  } satisfies ITodoAppAdminUserSession.IRequest;

  const adminASessionsPage: IPageITodoAppAdminuserSession.ISummary =
    await api.functional.todoApp.adminUser.adminUsers.sessions.index(
      connection,
      {
        adminUserId: adminALogin.id,
        body: adminASessionRequest,
      },
    );
  typia.assert(adminASessionsPage);

  TestValidator.predicate(
    "admin A sessions list should have at least one item",
    adminASessionsPage.pagination.records >= 1,
  );

  const adminASessionSummary: ITodoAppAdminUserSession.ISummary =
    adminASessionsPage.data[0];

  // 5. Register a second admin (admin B) and ensure they have a session.
  const adminBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.2",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/campaign",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminB: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert(adminB);

  // Optionally, login as admin B explicitly to create another session.
  const adminBLoginBody = {
    email: adminB.email,
    password: adminBJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ITodoAppAdminUser.ILogin;

  const adminBLogin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminBLoginBody,
    });
  typia.assert(adminBLogin);

  const adminBSessionRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    fromCreatedAt: null,
    toCreatedAt: null,
    ip: null,
    orderByCreatedAt: "desc" as const,
  } satisfies ITodoAppAdminUserSession.IRequest;

  const adminBSessionsPage: IPageITodoAppAdminuserSession.ISummary =
    await api.functional.todoApp.adminUser.adminUsers.sessions.index(
      connection,
      {
        adminUserId: adminBLogin.id,
        body: adminBSessionRequest,
      },
    );
  typia.assert(adminBSessionsPage);

  TestValidator.predicate(
    "admin B sessions list should have at least one item",
    adminBSessionsPage.pagination.records >= 1,
  );

  // 6. Cross-admin mismatch: use admin A's sessionId with admin B's adminUserId.
  const mismatchedAdminUserId = adminBLogin.id;
  const foreignSessionId = adminASessionSummary.id;

  // 7. Assert that fetching session detail with mismatched adminUserId and
  //    sessionId fails and does not return ITodoAppAdminUserSession.
  await TestValidator.error(
    "cross-admin session detail access must fail",
    async () => {
      await api.functional.todoApp.adminUser.adminUsers.sessions.at(
        connection,
        {
          adminUserId: mismatchedAdminUserId,
          sessionId: foreignSessionId,
        },
      );
    },
  );
}
