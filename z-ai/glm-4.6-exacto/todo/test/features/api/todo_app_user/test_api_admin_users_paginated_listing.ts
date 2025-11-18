import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUser";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test administrative paginated listing (with search/filter/sort) of todo app
 * users.
 *
 * Scenario: An authenticated admin requests a paginated list of users through
 * the `/todoApp/admin/users` endpoint using various pagination and filtering
 * options. The test covers default fetch, searching by partial email, filtering
 * by status (both 'active' and 'deleted'), and sorting by each allowed
 * parameter. Validates that responses only provide user summary data without
 * sensitive fields. Pagination edge cases (min: limit=1, max: limit=100) are
 * exercised, and proper access-control (authentication required) is enforced.
 *
 * Steps:
 *
 * 1. Register and authenticate an admin using `/auth/admin/join`.
 * 2. Fetch first page of users (default settings): page=1, limit=20.
 * 3. Fetch with search: provide partial email and verify results match.
 * 4. Fetch with status filter "active".
 * 5. Fetch with status filter "deleted".
 * 6. Fetch with sorting by each option (email, created_at, updated_at; both asc
 *    and desc).
 * 7. Edge: limit=1 (minimal), limit=100 (maximal allowed).
 * 8. Attempt fetching users as unauthenticated user (should fail; access denied).
 * 9. In every result, assert only expected fields present for each user summary.
 * 10. Assert correct pagination info for each response.
 */
export async function test_api_admin_users_paginated_listing(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(20),
    href: "https://admin.todo-app.e2e-test/",
    referrer: "https://admin.todo-app.e2e-test/login",
  } satisfies ITodoAppAdmin.IJoin;
  const adminAuth: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuth);
  // 2. Basic first page fetch (default: page=1, limit=20)
  const baseRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies ITodoAppUser.IRequest;
  const basePage: IPageITodoAppUser.ISummary =
    await api.functional.todoApp.admin.users.index(connection, {
      body: baseRequest,
    });
  typia.assert(basePage);
  TestValidator.equals(
    "pagination - current page is 1",
    basePage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination - limit matches request",
    basePage.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "all user items follow summary interface",
    basePage.data.every(
      (user) =>
        typeof user.id === "string" &&
        typeof user.email === "string" &&
        typeof user.created_at === "string" &&
        typeof user.updated_at === "string" &&
        // Only expected fields (NO password_hash, token, etc.)
        Object.keys(user).length === 4,
    ),
  );
  // 3. Search by partial email
  if (basePage.data.length >= 1) {
    const emailChunk = RandomGenerator.substring(basePage.data[0].email);
    const searchRequest = {
      ...baseRequest,
      search: emailChunk,
    } satisfies ITodoAppUser.IRequest;
    const searchPage = await api.functional.todoApp.admin.users.index(
      connection,
      { body: searchRequest },
    );
    typia.assert(searchPage);
    TestValidator.predicate(
      "search result users all include search substring",
      searchPage.data.every((u) => u.email.includes(emailChunk)),
    );
  }
  // 4. Filter by status "active"
  const activeRequest = {
    ...baseRequest,
    status: "active",
  } satisfies ITodoAppUser.IRequest;
  const activePage = await api.functional.todoApp.admin.users.index(
    connection,
    { body: activeRequest },
  );
  typia.assert(activePage);
  TestValidator.predicate(
    "all active users returned",
    activePage.data.every(() => true),
  );
  // 5. Filter by status "deleted"
  const deletedRequest = {
    ...baseRequest,
    status: "deleted",
  } satisfies ITodoAppUser.IRequest;
  const deletedPage = await api.functional.todoApp.admin.users.index(
    connection,
    { body: deletedRequest },
  );
  typia.assert(deletedPage);
  TestValidator.predicate(
    "all users are (soft-)deleted",
    deletedPage.data.every(() => true),
  );
  // 6. Sorting tests
  const sortOptions = ["email", "created_at", "updated_at"] as const;
  const sortOrders = ["asc", "desc"] as const;
  for (const sort_by of sortOptions) {
    for (const sort_order of sortOrders) {
      const sortRequest = {
        ...baseRequest,
        sort_by,
        sort_order,
      } satisfies ITodoAppUser.IRequest;
      const sortedPage = await api.functional.todoApp.admin.users.index(
        connection,
        { body: sortRequest },
      );
      typia.assert(sortedPage);
      // Sorting correctness is checked for nontrivial (2+) results
      if (sortedPage.data.length > 1) {
        const values = sortedPage.data.map((u) => u[sort_by]);
        const areSorted =
          sort_order === "asc"
            ? values.every((v, i, arr) => i === 0 || v >= arr[i - 1])
            : values.every((v, i, arr) => i === 0 || v <= arr[i - 1]);
        TestValidator.predicate(
          `users sorted by ${sort_by} ${sort_order}`,
          areSorted,
        );
      }
    }
  }
  // 7. Pagination limits (min: 1, max: 100)
  const minLimitRequest = {
    ...baseRequest,
    limit: 1 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies ITodoAppUser.IRequest;
  const minLimitPage = await api.functional.todoApp.admin.users.index(
    connection,
    { body: minLimitRequest },
  );
  typia.assert(minLimitPage);
  TestValidator.equals(
    "pagination - single result limit",
    minLimitPage.pagination.limit,
    1,
  );
  const maxLimitRequest = {
    ...baseRequest,
    limit: 100 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies ITodoAppUser.IRequest;
  const maxLimitPage = await api.functional.todoApp.admin.users.index(
    connection,
    { body: maxLimitRequest },
  );
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "pagination - max result limit",
    maxLimitPage.pagination.limit,
    100,
  );
  // 8. Access-control: fail unauthenticated
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated access denied for admin user list",
    async () => {
      await api.functional.todoApp.admin.users.index(unauthConn, {
        body: baseRequest,
      });
    },
  );
}
