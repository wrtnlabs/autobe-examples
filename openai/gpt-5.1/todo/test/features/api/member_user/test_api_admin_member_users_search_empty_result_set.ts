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

export async function test_api_admin_member_users_search_empty_result_set(
  connection: api.IConnection,
) {
  // 1. Create and auto-login an admin user via join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "Admin1234!", // any strong-ish password string
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/join",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Initialize at least one system setting so configuration exists
  const settingCreateBody = {
    key: `test_empty_member_search_${RandomGenerator.alphaNumeric(8)}`,
    value: "true",
    type: "boolean",
    description: "Enable member search for E2E empty-result test",
    group: "e2e-test",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: settingCreateBody,
    });
  typia.assert(systemSetting);

  // 3. Create a baseline member user and a todo, so database is not globally empty
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberJoinBody = {
    email: memberEmail,
    password: typia.random<string & tags.Format<"password">>(),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.test/signup",
    referrer: "https://todo-app.test/landing",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // Member login (not strictly required if join already authenticates, but
  // exercise the login flow as dependency describes multi-actor switching).
  const memberLoginBody = {
    email: memberEmail,
    password: memberJoinBody.password,
    ip: null,
    href: "https://todo-app.test/login",
    referrer: "https://todo-app.test/landing",
  } satisfies ITodoAppMemberUserLogin.ICreate;

  const memberAuthorizedAfterLogin: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedAfterLogin);

  // Create at least one todo for the member user
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

  // 4. Switch back to admin context by logging in as the admin user
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.todo-app.test/login",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppAdminUser.ILogin;

  const adminAuthorizedAfterLogin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedAfterLogin);

  // 5a. Control call: relaxed filter expected to return at least one member
  const relaxedRequestBody = {
    page: 1,
    limit: 10,
  } satisfies ITodoAppMemberUser.IRequest;

  const relaxedPage: IPageITodoAppMemberUser.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.index(connection, {
      body: relaxedRequestBody,
    });
  typia.assert(relaxedPage);

  TestValidator.predicate(
    "relaxed member search should return at least one record",
    relaxedPage.data.length > 0,
  );
  TestValidator.predicate(
    "relaxed pagination.records must be >= data.length",
    relaxedPage.pagination.records >= relaxedPage.data.length,
  );

  // 5b. Main scenario: choose filters that intentionally yield an empty set.
  // Use a created_from in the far future to guarantee no matches.
  const futureFrom: string = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const futureTo: string = new Date(
    Date.now() + 366 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const emptyRequestBody = {
    page: 1,
    limit: 10,
    created_from: futureFrom,
    created_to: futureTo,
  } satisfies ITodoAppMemberUser.IRequest;

  const emptyPage: IPageITodoAppMemberUser.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.index(connection, {
      body: emptyRequestBody,
    });
  typia.assert(emptyPage);

  // 6. Validate empty result set and consistent pagination metadata
  TestValidator.equals(
    "empty filter should return empty data array",
    emptyPage.data.length,
    0,
  );

  TestValidator.equals(
    "empty filter should report zero records",
    emptyPage.pagination.records,
    0,
  );

  TestValidator.predicate(
    "pages should be zero or one when there are no records",
    emptyPage.pagination.pages === 0 || emptyPage.pagination.pages === 1,
  );

  TestValidator.predicate(
    "pagination.current should be non-negative even for empty results",
    emptyPage.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination.limit should be non-negative",
    emptyPage.pagination.limit >= 0,
  );
}
