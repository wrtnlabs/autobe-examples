import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdminuser";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * End-to-end integration test for admin user listing in the presence of
 * existing member todos.
 *
 * Business context:
 *
 * - The system supports two authorization actors: memberUser and adminUser.
 * - Member users own todos (todo_app_todos), while admin users supervise and
 *   manage the system using their own accounts in todo_app_adminusers.
 * - The admin listing endpoint must work correctly regardless of how many member
 *   users or todos exist. Its response must be scoped strictly to admin
 *   accounts and never intermingle todo records.
 *
 * Scenario steps:
 *
 * 1. Register a member user (POST /auth/memberUser/join), which also authenticates
 *    that user and attaches their token to the connection.
 * 2. As the member user, create at least one todo (POST /todoApp/memberUser/todos)
 *    using ITodoAppTodo.ICreate.
 * 3. Register an admin user (POST /auth/adminUser/join); this also authenticates
 *    the admin and sets the admin token into the connection.
 * 4. Call the admin user index endpoint (PATCH /todoApp/adminUser/adminUsers) with
 *    a simple ITodoAppAdminUser.IRequest where page = 0 and limit = 10 and no
 *    additional filters.
 * 5. Validate that a page of admin user summaries is returned, that pagination
 *    metadata is coherent, and that the newly created admin appears in the data
 *    array.
 * 6. Implicitly confirm that the previously created member todos have no impact on
 *    the admin listing response by ensuring all records are
 *    ITodoAppAdminUser.ISummary objects and that no todo-specific fields are
 *    present.
 */
export async function test_api_admin_user_index_integration_with_member_todos_context(
  connection: api.IConnection,
) {
  // 1. Register a member user and obtain authenticated context
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.example.com/member/join",
    referrer: "https://todo-app.example.com/landing",
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const memberAuthorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a todo for the member user to ensure there is domain data
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(createdTodo);

  // basic sanity check that the todo belongs to the joined member user
  TestValidator.equals(
    "created todo belongs to member user",
    createdTodo.memberUser.id,
    memberAuthorized.id,
  );

  // 3. Register an admin user and obtain authenticated context
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

  // 4. Call admin user index with simple pagination request
  const requestBody = {
    page: 0,
    limit: 10,
    keyword: null,
    status: null,
    created_from: null,
    created_to: null,
    order_by: null,
    order_direction: null,
  } satisfies ITodoAppAdminUser.IRequest;

  const page: IPageITodoAppAdminuser.ISummary =
    await api.functional.todoApp.adminUser.adminUsers.index(connection, {
      body: requestBody,
    });
  typia.assert(page);

  // 5. Validate pagination meta-information
  const pagination: IPage.IPagination = page.pagination;
  typia.assert(pagination);

  TestValidator.equals(
    "admin listing current page should be 0",
    requestBody.page ?? 0,
    pagination.current,
  );

  TestValidator.equals(
    "admin listing limit should match request",
    requestBody.limit ?? 10,
    pagination.limit,
  );

  TestValidator.predicate(
    "admin listing records count is non-negative",
    pagination.records >= 0,
  );

  TestValidator.predicate(
    "admin listing pages count is non-negative",
    pagination.pages >= 0,
  );

  // 6. Validate that at least one admin user is present and that
  // the newly created admin appears in the result set.
  TestValidator.predicate(
    "admin listing contains at least one admin user",
    page.data.length >= 1,
  );

  const matched = page.data.some((summary) => {
    typia.assert(summary);
    return (
      summary.id === adminAuthorized.id ||
      summary.email === adminAuthorized.email
    );
  });

  TestValidator.predicate(
    "admin listing includes the newly created admin user",
    matched,
  );

  // 7. Implicit structural independence check: ensure that returned
  // items look like admin summaries, not todos. Since typia.assert has
  // already validated the type, we only need some light sanity checks
  // on representative fields.
  for (const adminSummary of page.data) {
    typia.assert<ITodoAppAdminUser.ISummary>(adminSummary);

    TestValidator.predicate(
      "admin summary has non-empty email",
      adminSummary.email.length > 0,
    );

    // status is a generic string; just confirm it's present
    TestValidator.predicate(
      "admin summary has status field",
      typeof adminSummary.status === "string",
    );
  }
}
