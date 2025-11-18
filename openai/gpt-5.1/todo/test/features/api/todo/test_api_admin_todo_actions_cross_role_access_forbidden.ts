import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAdminTodoAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdminTodoAction";
import type { ITodoAppAdminTodoAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminTodoAction";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_admin_todo_actions_cross_role_access_forbidden(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user (guest -> memberUser)
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const memberAuthorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // SDK has now stored memberUser token into connection.headers.Authorization
  // Sanity check that member user context looks valid
  TestValidator.predicate(
    "memberUser authorized has member id",
    () =>
      typeof memberAuthorized.id === "string" && memberAuthorized.id.length > 0,
  );

  // Prepare a minimal but valid search request body for admin todo actions
  const searchRequest: ITodoAppAdminTodoAction.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  };

  // 2. Try to call the admin-only endpoint as memberUser and expect authorization error
  await TestValidator.httpError(
    "memberUser cannot access admin todo actions endpoint",
    [401, 403],
    async () => {
      await api.functional.todoApp.adminUser.adminTodoActions.index(
        connection,
        {
          body: searchRequest,
        },
      );
    },
  );

  // 3. Register and authenticate an admin user; this will override Authorization header
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  TestValidator.predicate(
    "adminUser authorized has admin id",
    () =>
      typeof adminAuthorized.id === "string" && adminAuthorized.id.length > 0,
  );

  // 4. Call the admin-only endpoint as adminUser; expect success and valid page response
  const adminResult: IPageITodoAppAdminTodoAction.ISummary =
    await api.functional.todoApp.adminUser.adminTodoActions.index(connection, {
      body: searchRequest,
    });
  typia.assert(adminResult);

  // Basic business validations on pagination metadata
  TestValidator.predicate(
    "admin todo actions page has non-negative pagination values",
    () =>
      adminResult.pagination.current >= 0 &&
      adminResult.pagination.limit >= 0 &&
      adminResult.pagination.records >= 0 &&
      adminResult.pagination.pages >= 0,
  );

  // 5. (Optional) If any data exists, check that each element has core fields set
  if (adminResult.data.length > 0) {
    const first = adminResult.data[0];
    TestValidator.predicate(
      "admin todo action summary has required identifiers",
      () =>
        typeof first.id === "string" &&
        typeof first.adminUser.id === "string" &&
        typeof first.memberUser.id === "string" &&
        typeof first.todo.id === "string" &&
        typeof first.action_type === "string" &&
        typeof first.reason_category === "string",
    );
  }
}
