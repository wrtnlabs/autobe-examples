import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberUser";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Validate basic member user search pagination for admin users.
 *
 * Business goal:
 *
 * - Ensure that an authenticated admin can list member users without applying
 *   additional filters, using explicit pagination parameters page=1 and
 *   limit=10.
 * - Confirm that the endpoint respects the requested pagination settings and
 *   returns at least one member user when data exists.
 *
 * High-level workflow:
 *
 * 1. Register an admin user (join) so we have an administrative actor.
 * 2. (Optional but explicit) Login as the same admin to confirm token-based
 *    authentication works and that the SDK switches the Authorization header
 *    appropriately.
 * 3. As the admin actor, create at least one system setting entry required by the
 *    todoApp backend (e.g., a limit-related or feature-flag configuration).
 * 4. Register a member user (join) so that there is at least one member account to
 *    be listed, and ensure the member has at least one todo.
 * 5. Perform a member login for that member and create a todo item to satisfy the
 *    dependency "member user with at least one todo exists".
 * 6. Switch back to the admin actor (login) so that subsequent admin APIs are
 *    authorized as an admin user.
 * 7. Call PATCH /todoApp/adminUser/memberUsers with an ITodoAppMemberUser.IRequest
 *    body specifying:
 *
 *    - Page: 1
 *    - Limit: 10
 *    - No search/status/date filters (all omitted)
 * 8. Validate the response:
 *
 *    - Typia.assert on the IPageITodoAppMemberUser.ISummary response.
 *    - Pagination.current === 1.
 *    - Pagination.limit === 10.
 *    - Pagination.records >= 1.
 *    - Pagination.pages >= 1.
 *    - Data array is non-empty and has length <= 10.
 *    - At least one entry in data has required fields:
 *
 *         - Id: UUID string.
 *         - Email: valid email format.
 *         - Status: non-empty string.
 *         - Created_at: valid date-time string. and display_name may be null or string
 *                   (no extra validation beyond type).
 *    - Optionally, verify that the specific member we created is present in the
 *         result set (by matching its id or email) when it falls into the first
 *         page.
 */
export async function test_api_admin_member_users_search_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Register an admin user via /auth/adminUser/join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/join",
    referrer: "https://admin.todo-app.test/",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorizedFromJoin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 2. Explicitly login as the same admin to validate token swap and ensure
  //    we have a clean admin authentication context.
  const adminAuthorizedFromLogin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: {
        email: adminJoinBody.email,
        password: adminJoinBody.password,
        ip: "127.0.0.1",
        href: "https://admin.todo-app.test/login",
        referrer: "https://admin.todo-app.test/",
      } satisfies ITodoAppAdminUser.ILogin,
    });
  typia.assert(adminAuthorizedFromLogin);

  // 3. As the admin actor, create a system setting entry that might influence
  //    todo limits or feature flags.
  const systemSettingCreateBody = {
    key: `max_active_todos_per_user_${RandomGenerator.alphaNumeric(8)}`,
    value: "100",
    type: "int",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const createdSystemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingCreateBody,
    });
  typia.assert(createdSystemSetting);

  // 4. Register a member user via /auth/memberUser/join so that there is at
  //    least one member to be found.
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.test/join",
    referrer: "https://todo-app.test/landing",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorizedFromJoin: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedFromJoin);

  // 5. Login as the member and create at least one todo so that the member has
  //    concrete activity in the system.
  const memberAuthorizedFromLogin: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        email: memberJoinBody.email,
        password: memberJoinBody.password,
        ip: null,
        href: "https://todo-app.test/login",
        referrer: "https://todo-app.test/landing",
      } satisfies ITodoAppMemberUserLogin.ICreate,
    });
  typia.assert(memberAuthorizedFromLogin);

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

  // 6. Switch back to the admin actor by logging in again as the admin user.
  const adminAuthorizedForSearch: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: {
        email: adminJoinBody.email,
        password: adminJoinBody.password,
        ip: "127.0.0.1",
        href: "https://admin.todo-app.test/login",
        referrer: "https://admin.todo-app.test/",
      } satisfies ITodoAppAdminUser.ILogin,
    });
  typia.assert(adminAuthorizedForSearch);

  // 7. Perform the admin-side member user search with explicit page and limit
  //    and no other filters.
  const requestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies ITodoAppMemberUser.IRequest;

  const pageResult: IPageITodoAppMemberUser.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.index(connection, {
      body: requestBody,
    });
  typia.assert(pageResult);

  const pagination = pageResult.pagination;
  typia.assert<IPage.IPagination>(pagination);

  // 8. Validate pagination metadata and data collection.
  TestValidator.equals(
    "pagination current page should be 1",
    pagination.current,
    1,
  );

  TestValidator.equals("pagination limit should be 10", pagination.limit, 10);

  TestValidator.predicate(
    "pagination records should be at least 1 when member exists",
    pagination.records >= 1,
  );

  TestValidator.predicate(
    "pagination pages should be at least 1",
    pagination.pages >= 1,
  );

  TestValidator.predicate(
    "data array should not be empty when records >= 1",
    pageResult.data.length >= 1,
  );

  TestValidator.predicate(
    "data array length should not exceed requested limit",
    pageResult.data.length <= requestBody.limit!,
  );

  // Pick the first summary entry to validate its fields.
  const firstSummary: ITodoAppMemberUser.ISummary = pageResult.data[0];
  typia.assert(firstSummary);

  TestValidator.predicate(
    "member summary id should be a non-empty string",
    typeof firstSummary.id === "string" && firstSummary.id.length > 0,
  );

  TestValidator.predicate(
    "member summary email should be a non-empty string",
    typeof firstSummary.email === "string" && firstSummary.email.length > 0,
  );

  TestValidator.predicate(
    "member summary status should be a non-empty string",
    typeof firstSummary.status === "string" && firstSummary.status.length > 0,
  );

  TestValidator.predicate(
    "member summary created_at should be a non-empty string",
    typeof firstSummary.created_at === "string" &&
      firstSummary.created_at.length > 0,
  );

  // Confirm that the specific member we created is included in the dataset of
  // the first page when possible (best-effort, soft assertion).
  const createdMemberId = memberAuthorizedFromJoin.id;
  const createdMemberInPage = pageResult.data.find(
    (item) => item.id === createdMemberId,
  );

  TestValidator.predicate(
    "created member should appear in at least one page of results (best-effort)",
    createdMemberInPage !== undefined,
  );
}
