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
 * Validate that an authenticated admin can filter their own admin user sessions
 * by IP address through the PATCH
 * /todoApp/adminUser/adminUsers/{adminUserId}/sessions endpoint using
 * ITodoAppAdminUserSession.IRequest.ip, and that pagination metadata is
 * consistent.
 *
 * Business flow:
 *
 * 1. Register a new admin user via /auth/adminUser/join, explicitly specifying a
 *    fixed IP string (e.g., "192.168.0.10") in ITodoAppAdminUser.IJoin.ip so
 *    that the initial session is recorded with that IP, and capture the
 *    returned ITodoAppAdminUser.IAuthorized to obtain adminUserId.
 * 2. Optionally perform an additional admin login via /auth/adminUser/login with
 *    the same IP value to create a second session row for the same admin; this
 *    grows the dataset but is not strictly required for correctness.
 * 3. As the admin, initialize at least one ITodoAppSystemSetting via
 *    /todoApp/adminUser/systemSettings (e.g., a key like
 *    "session_audit_enabled") with enabled=true to simulate that session
 *    auditing features are turned on. The actual key semantics do not influence
 *    the filtering behavior, so any valid ICreate payload is fine.
 * 4. Register a member user via /auth/memberUser/join and then log that member in
 *    via /auth/memberUser/login to create member-side sessions and realistic
 *    traffic context.
 * 5. As the authenticated member, create at least one todo via
 *    /todoApp/memberUser/todos with ITodoAppTodo.ICreate to ensure normal
 *    application activity is present, even though it does not directly affect
 *    admin session queries.
 * 6. Switch authentication context back to the admin using /auth/adminUser/login
 *    with the same credentials and IP to guarantee a fresh, recent session and
 *    consistent Authorization header for subsequent admin calls.
 * 7. Invoke api.functional.todoApp.adminUser.adminUsers.sessions.index with:
 *
 *    - AdminUserId set to the id from ITodoAppAdminUser.IAuthorized
 *    - Body satisfying ITodoAppAdminUserSession.IRequest with page = 1, limit = 20,
 *         ip = the fixed IP string used during join/login, orderByCreatedAt =
 *         "desc" and assert that:
 *    - Typia.assert passes for the returned IPageITodoAppAdminuserSession.ISummary
 *    - Pagination.current equals 1 and pagination.limit equals 20
 *    - Pagination.records is >= 1
 *    - Every ITodoAppAdminUserSession.ISummary in data has ip exactly equal to the
 *         requested filter IP, validated via TestValidator.predicate/equals.
 * 8. Perform a second call to sessions.index for the same adminUserId where the
 *    request body uses a deliberately non-matching ip value (e.g., "10.0.0.1")
 *    while keeping page=1, limit=20, orderByCreatedAt="desc". Assert that:
 *
 *    - Typia.assert passes for the response type
 *    - Data is an empty array
 *    - Pagination.records equals 0 (no matching sessions), confirming that the ip
 *         filter excludes all sessions without causing an error.
 *
 * Implementation notes:
 *
 * - Do not manipulate connection.headers directly; rely on the SDK to manage
 *   Authorization tokens after join/login calls.
 * - Use `satisfies` with the correct DTO variants for all request bodies to
 *   maintain strict type safety without resorting to `as any`.
 * - Avoid any tests that intentionally send type-invalid payloads; focus solely
 *   on logical filtering behavior and pagination consistency.
 */
export async function test_api_adminuser_sessions_index_ip_filtering(
  connection: api.IConnection,
) {
  // 1. Admin registration with fixed IP for deterministic filtering
  const adminIp = "192.168.0.10";
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "AdminPassw0rd!",
    display_name: RandomGenerator.name(),
    status: "active",
    ip: adminIp,
    href: "https://admin.todo-app.test/join",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorizedFromJoin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 2. Optional additional admin login with same IP to create another session
  const adminLoginBody = {
    email: adminAuthorizedFromJoin.email,
    password: adminJoinBody.password,
    ip: adminIp,
    href: "https://admin.todo-app.test/login",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppAdminUser.ILogin;

  const adminAuthorizedFromLogin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  // 3. Create a system setting to simulate enabling session audit features
  const systemSettingBody = {
    key: `session_audit_${RandomGenerator.alphabets(6)}`,
    value: "true",
    type: "boolean",
    description: "Enable admin session auditing in tests",
    group: "audit",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert(systemSetting);

  // 4. Register a member user
  const memberJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@member.example.com`,
    password: "MemberPassw0rd!" as string & tags.Format<"password">,
    displayName: RandomGenerator.name(),
    ip: "203.0.113.5" as string & tags.Format<"ipv4">,
    href: "https://app.todo-app.test/join",
    referrer: "https://app.todo-app.test/landing",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorizedFromJoin: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedFromJoin);

  // 5. Member login to create additional member sessions
  const memberLoginBody = {
    email: memberAuthorizedFromJoin.email,
    password: memberJoinBody.password,
    ip: memberJoinBody.ip ?? null,
    href: "https://app.todo-app.test/login",
    referrer: "https://app.todo-app.test/landing",
  } satisfies ITodoAppMemberUserLogin.ICreate;

  const memberAuthorizedFromLogin: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedFromLogin);

  // 6. As authenticated member, create at least one todo
  const todoCreateBody = {
    title: `Todo - ${RandomGenerator.paragraph({ sentences: 3 })}`,
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
    due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const todo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(todo);

  // 7. Switch back to admin context with a fresh login (ensures Authorization header is admin)
  const adminAuthorizedForListing: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedForListing);

  const adminId: string & tags.Format<"uuid"> = adminAuthorizedForListing.id;

  // 8. Positive-path IP-filtered session listing
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 20 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const filterRequestBody = {
    page,
    limit,
    fromCreatedAt: null,
    toCreatedAt: null,
    ip: adminIp,
    orderByCreatedAt: "desc",
  } satisfies ITodoAppAdminUserSession.IRequest;

  const filteredPage: IPageITodoAppAdminuserSession.ISummary =
    await api.functional.todoApp.adminUser.adminUsers.sessions.index(
      connection,
      {
        adminUserId: adminId,
        body: filterRequestBody,
      },
    );
  typia.assert(filteredPage);

  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page should be 1",
    filteredPage.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit should be 20",
    filteredPage.pagination.limit,
    limit,
  );

  // There should be at least one session for this admin from join/login
  TestValidator.predicate(
    "filtered session records should be at least 1 for matching IP",
    filteredPage.pagination.records >= 1,
  );
  TestValidator.predicate(
    "filtered session data length should be at least 1",
    filteredPage.data.length >= 1,
  );

  // Every summary should have IP exactly matching the filter
  for (const summary of filteredPage.data) {
    TestValidator.equals(
      "session summary ip should equal filter ip",
      summary.ip,
      adminIp,
    );
  }

  // 9. Negative-path IP filtering: query sessions with an IP that should not exist
  const nonMatchingIp = "10.0.0.1";
  const negativeRequestBody = {
    page,
    limit,
    fromCreatedAt: null,
    toCreatedAt: null,
    ip: nonMatchingIp,
    orderByCreatedAt: "desc",
  } satisfies ITodoAppAdminUserSession.IRequest;

  const negativePage: IPageITodoAppAdminuserSession.ISummary =
    await api.functional.todoApp.adminUser.adminUsers.sessions.index(
      connection,
      {
        adminUserId: adminId,
        body: negativeRequestBody,
      },
    );
  typia.assert(negativePage);

  TestValidator.equals(
    "negative IP filter should return zero records",
    negativePage.pagination.records,
    0,
  );
  TestValidator.equals(
    "negative IP filter should return empty data array",
    negativePage.data.length,
    0,
  );
}
