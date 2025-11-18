import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Validate that a brand new member user sees an empty todo list.
 *
 * Business context:
 *
 * - Admins can configure global system settings that gate todo behavior.
 * - Member users own personal todos; listing must be scoped to the authenticated
 *   member.
 * - A freshly registered member with no todos should see an empty, well-formed
 *   paginated response when listing todos.
 *
 * Steps:
 *
 * 1. Register an admin user and login as admin.
 * 2. As admin, create a system setting that enables or configures todo behavior.
 * 3. Register a new member user and login as that member.
 * 4. As the authenticated member, call PATCH /todoApp/memberUser/todos with a
 *    simple ITodoAppTodo.IRequest (page=0, limit>0, no filters).
 * 5. Assert that the response page metadata reflects zero records and the data
 *    array is empty.
 */
export async function test_api_todo_list_initial_empty_for_new_member_user(
  connection: api.IConnection,
) {
  // 1. Register an admin user
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(1),
    status: "active",
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 1-2. Exercise admin login as well to validate login flow and token handling.
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdminUser.ILogin;

  const adminLoginAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 2. Create a baseline system setting as admin
  const systemSettingKeyBase = "e2e_todo_feature_flag_";
  const systemSettingKey =
    systemSettingKeyBase + RandomGenerator.alphaNumeric(8);

  const systemSettingBody = {
    key: systemSettingKey,
    value: "true",
    type: "boolean",
    description: "Enable todo listing for member users (E2E test)",
    group: "e2e-tests",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert(systemSetting);

  TestValidator.equals(
    "system setting key should match request",
    systemSetting.key,
    systemSettingKey,
  );

  // 3. Register a new member user
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    displayName: RandomGenerator.name(1),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3-2. Exercise member login flow
  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserLogin.ICreate;

  const memberLoginAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 4. As the authenticated member, list todos with no filters.
  const pageTagged = typia.assert<number & tags.Type<"int32">>(0);
  const limitTagged = typia.assert<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >(10);

  const todoRequestBody = {
    page: pageTagged,
    limit: limitTagged,
    search: null,
    state: null,
    createdFrom: null,
    createdTo: null,
    dueFrom: null,
    dueTo: null,
    completed: null,
  } satisfies ITodoAppTodo.IRequest;

  const todoPage: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.memberUser.todos.index(connection, {
      body: todoRequestBody,
    });
  typia.assert(todoPage);

  const pagination = todoPage.pagination;
  const data = todoPage.data;

  // 5. Assert pagination and empty data conditions.
  TestValidator.equals(
    "current page should equal requested page (0)",
    Number(pagination.current),
    0,
  );
  TestValidator.equals(
    "limit should equal requested limit",
    Number(pagination.limit),
    Number(limitTagged),
  );
  TestValidator.equals(
    "records should be zero for new member user",
    Number(pagination.records),
    0,
  );
  TestValidator.equals(
    "pages should be zero when there are no records",
    Number(pagination.pages),
    0,
  );
  TestValidator.equals(
    "todo data array should be empty for new member user",
    data.length,
    0,
  );
}
