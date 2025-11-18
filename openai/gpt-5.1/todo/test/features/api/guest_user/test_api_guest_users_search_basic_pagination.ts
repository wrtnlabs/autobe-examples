import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuestUser";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Validate basic pagination of admin guest user search.
 *
 * Business purpose:
 *
 * - Ensure that an authenticated admin user can retrieve guest user concept
 *   listings with simple pagination parameters.
 * - Confirm that the pagination metadata (current, limit, records, pages) in
 *   IPageITodoAppGuestUser.ISummary is coherent and that the data array
 *   respects the requested limit.
 * - Sanity-check that moving from page 1 to page 2 changes the record set when
 *   there are enough records, proving that server-side pagination is wired
 *   correctly.
 *
 * High-level flow:
 *
 * 1. Register an admin user (join) to obtain an authenticated admin session.
 * 2. As admin, create at least one ITodoAppSystemSetting to simulate a realistic
 *    admin environment (no strict assertions on content).
 * 3. Register a member user and log in that member.
 * 4. As member, create multiple todos to populate the system with realistic data.
 * 5. Log back in as admin.
 * 6. Call PATCH /todoApp/adminUser/guestUsers with page=1 and limit=10, leaving
 *    all other filters undefined.
 * 7. Assert structural correctness with typia.assert and verify pagination
 *    metadata and data length.
 * 8. If total records exceed the chosen limit, call the endpoint again with page=2
 *    and the same limit and assert basic non-duplication of id sequences
 *    between page 1 and page 2 when both have data.
 */
export async function test_api_guest_users_search_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Register an admin user to obtain an authenticated admin session.
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: "AdminPassword123!", // matches password format tag
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
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminAuthorized);

  // 2. As admin, create at least one system setting to simulate configuration.
  const systemSettingBody = {
    key: "guest_users_page_default_limit",
    value: "10",
    type: "int",
    description: "Default page size for guest user listing in admin UI",
    group: "analytics",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert<ITodoAppSystemSetting>(systemSetting);

  // 3. Register a member user and log in that member.
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
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
  typia.assert<ITodoAppMemberUser.IAuthorized>(memberAuthorized);

  const memberLoginBody = {
    email: memberEmail,
    password: memberJoinBody.password,
    ip: null,
    href: "https://todo-app.test/login",
    referrer: "https://todo-app.test/landing",
  } satisfies ITodoAppMemberUserLogin.ICreate;

  const memberLoggedIn: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ITodoAppMemberUser.IAuthorized>(memberLoggedIn);

  // 4. As member, create multiple todos to populate the system.
  const todoCount: number & tags.Type<"int32"> & tags.Minimum<1> =
    5 satisfies number as number;

  const createTodoBodies: ITodoAppTodo.ICreate[] = ArrayUtil.repeat(
    todoCount,
    (index) => {
      const baseTitle = `Guest pagination seed todo #${index + 1}`;
      return {
        title: baseTitle,
        description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 8,
        }),
        due_date: null,
        state: "active",
      } satisfies ITodoAppTodo.ICreate;
    },
  );

  const createdTodos: ITodoAppTodo[] = [];
  for (const body of createTodoBodies) {
    const todo: ITodoAppTodo =
      await api.functional.todoApp.memberUser.todos.create(connection, {
        body,
      });
    typia.assert<ITodoAppTodo>(todo);
    createdTodos.push(todo);
  }

  // 5. Log back in as admin to ensure admin session is active.
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.todo-app.test/login",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppAdminUser.ILogin;

  const adminLoggedIn: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminLoggedIn);

  // 6. Call PATCH /todoApp/adminUser/guestUsers with page=1 and limit=10.
  const page1 = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const requestPage1 = {
    page: page1,
    limit,
    fromCreatedAt: undefined,
    toCreatedAt: undefined,
    externalRef: undefined,
    sortBy: undefined,
    sortDirection: undefined,
  } satisfies ITodoAppGuestUser.IRequest;

  const page1Result: IPageITodoAppGuestUser.ISummary =
    await api.functional.todoApp.adminUser.guestUsers.index(connection, {
      body: requestPage1,
    });
  typia.assert<IPageITodoAppGuestUser.ISummary>(page1Result);

  const pagination1 = page1Result.pagination;
  const data1 = page1Result.data;

  // 7. Validate pagination metadata and page-1 data constraints.
  TestValidator.equals(
    "page 1: current page should equal requested page",
    pagination1.current,
    page1,
  );
  TestValidator.equals(
    "page 1: limit should equal requested limit",
    pagination1.limit,
    limit,
  );

  TestValidator.predicate(
    "page 1: records must be non-negative",
    pagination1.records >= 0,
  );
  TestValidator.predicate(
    "page 1: pages must be non-negative",
    pagination1.pages >= 0,
  );
  TestValidator.predicate(
    "page 1: data.length must not exceed limit",
    data1.length <= pagination1.limit,
  );

  if (data1.length > 0) {
    const firstGuest: ITodoAppGuestUser.ISummary = data1[0];
    typia.assert<ITodoAppGuestUser.ISummary>(firstGuest);
  }

  // 8. If there are more records than one page, request page 2 and compare.
  if (pagination1.records > pagination1.limit) {
    const page2 = 2 as number & tags.Type<"int32"> & tags.Minimum<1>;
    const requestPage2 = {
      page: page2,
      limit,
      fromCreatedAt: undefined,
      toCreatedAt: undefined,
      externalRef: undefined,
      sortBy: undefined,
      sortDirection: undefined,
    } satisfies ITodoAppGuestUser.IRequest;

    const page2Result: IPageITodoAppGuestUser.ISummary =
      await api.functional.todoApp.adminUser.guestUsers.index(connection, {
        body: requestPage2,
      });
    typia.assert<IPageITodoAppGuestUser.ISummary>(page2Result);

    const pagination2 = page2Result.pagination;
    const data2 = page2Result.data;

    TestValidator.equals(
      "page 2: current page should equal requested page",
      pagination2.current,
      page2,
    );
    TestValidator.equals(
      "page 2: limit should equal requested limit",
      pagination2.limit,
      limit,
    );
    TestValidator.predicate(
      "page 2: data.length must not exceed limit",
      data2.length <= pagination2.limit,
    );

    if (data1.length > 0 && data2.length > 0) {
      const ids1 = data1.map((g) => g.id);
      const ids2 = data2.map((g) => g.id);

      const serialized1 = JSON.stringify(ids1);
      const serialized2 = JSON.stringify(ids2);

      TestValidator.predicate(
        "page 1 and page 2 should not have identical id sequences when both have data",
        serialized1 !== serialized2,
      );
    }
  }

  // 9. Optionally, sanity-check a very small limit (1) still respects limit.
  const tinyLimit = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const tinyRequest = {
    page: page1,
    limit: tinyLimit,
    fromCreatedAt: undefined,
    toCreatedAt: undefined,
    externalRef: undefined,
    sortBy: undefined,
    sortDirection: undefined,
  } satisfies ITodoAppGuestUser.IRequest;

  const tinyPage: IPageITodoAppGuestUser.ISummary =
    await api.functional.todoApp.adminUser.guestUsers.index(connection, {
      body: tinyRequest,
    });
  typia.assert<IPageITodoAppGuestUser.ISummary>(tinyPage);

  TestValidator.equals(
    "tiny limit: current page should be 1",
    tinyPage.pagination.current,
    page1,
  );
  TestValidator.equals(
    "tiny limit: limit should equal requested limit",
    tinyPage.pagination.limit,
    tinyLimit,
  );
  TestValidator.predicate(
    "tiny limit: data.length must not exceed tiny limit",
    tinyPage.data.length <= tinyPage.pagination.limit,
  );
}
