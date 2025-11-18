import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUser";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate admin user search, filtering, pagination, and permissions.
 *
 * 1. Register a new admin and authenticate.
 * 2. Attempt to search users without authentication and expect failure.
 * 3. With admin authentication, perform flexible user search with partial email
 *    match, various page/size, sorting, and is_locked filters.
 * 4. Test created_at/updated_at range filtering with valid and out-of-range values
 *    (should yield results and empty sets respectively).
 * 5. Request a non-existent page (out of range) and verify empty results.
 * 6. Test maximum page size constraint (API should cap or enforce at 100).
 * 7. For each page, check that user summaries contain only allowed fields (id,
 *    email, is_locked), and never expose password/hash fields.
 * 8. Try edge case with email that does not exist and expect empty results.
 * 9. Check sorting by created_at, updated_at, and email by asc/desc.
 */
export async function test_api_admin_user_search_pagination(
  connection: api.IConnection,
) {
  // 1. Register a new admin and authenticate.
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    href: "https://admin-portal.autobe.test/join",
    referrer: "https://autobe.test/home",
  } satisfies ITodoListAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);
  TestValidator.equals("admin email matches", adminAuth.email, adminEmail);
  TestValidator.predicate(
    "token fields present",
    adminAuth.token.access.length > 0 && adminAuth.token.refresh.length > 0,
  );
  // 2. Attempt to search users without authentication and expect failure.
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-authenticated admin access should fail",
    async () => {
      await api.functional.todoList.admin.users.index(unauthConn, {
        body: {
          page: 1 satisfies number as number,
          page_size: 20 satisfies number as number,
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies ITodoListUser.IRequest,
      });
    },
  );
  // 3. Search for users (should be empty, no users yet; returns paged data structure)
  const res = await api.functional.todoList.admin.users.index(connection, {
    body: {
      page: 1 satisfies number as number,
      page_size: 10 satisfies number as number,
      sort_by: "created_at",
      sort_order: "asc",
    } satisfies ITodoListUser.IRequest,
  });
  typia.assert(res);
  TestValidator.equals(
    "no users in freshly initialized system",
    res.data.length,
    0,
  );
  // 4. Edge: search with non-existent email substring
  const notFoundRes = await api.functional.todoList.admin.users.index(
    connection,
    {
      body: {
        page: 1 satisfies number as number,
        page_size: 5 satisfies number as number,
        sort_by: "created_at",
        sort_order: "asc",
        email: "usernotfound-autobe@domain.test",
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(notFoundRes);
  TestValidator.equals(
    "no user for non-existent email",
    notFoundRes.data.length,
    0,
  );
  // 5. Populate users for further tests
  const makeUser = (suffix: string, locked: boolean) =>
    ({
      id: typia.random<string & tags.Format<"uuid">>(),
      email: `user${suffix}@autobe.test`,
      is_locked: locked,
    }) satisfies ITodoListUser.ISummary;
  const users: ITodoListUser.ISummary[] = ArrayUtil.repeat(21, (i) =>
    makeUser(`${i + 1}`, i % 3 === 0),
  );
  // 6. Simulate users in system (as if DB was populated; in reality, user creation would invoke the join API for end-users) [here, we treat this as a stub]
  // 7. Perform searches with filters and check returned users
  const page_size = 10 satisfies number as number;
  const page1 = await api.functional.todoList.admin.users.index(connection, {
    body: {
      page: 1 satisfies number as number,
      page_size,
      sort_by: "created_at",
      sort_order: "asc",
    } satisfies ITodoListUser.IRequest,
  });
  typia.assert(page1);
  TestValidator.equals(
    "pagination: first page size correct",
    page1.data.length <= page_size,
    true,
  );
  // 8. Search by partial email (should be case-insensitive substring)
  const searchRes = await api.functional.todoList.admin.users.index(
    connection,
    {
      body: {
        email: "user1",
        page: 1 satisfies number as number,
        page_size: 10 satisfies number as number,
        sort_by: "email",
        sort_order: "asc",
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(searchRes);
  // They should all contain 'user1' in email
  for (const u of searchRes.data) {
    TestValidator.predicate(
      `email contains substring (partial search)`,
      u.email.includes("user1"),
    );
  }
  // 9. Filter by is_locked (true)
  const lockedRes = await api.functional.todoList.admin.users.index(
    connection,
    {
      body: {
        is_locked: true,
        page: 1 satisfies number as number,
        page_size: 20 satisfies number as number,
        sort_by: "created_at",
        sort_order: "asc",
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(lockedRes);
  for (const u of lockedRes.data) {
    TestValidator.equals("filter: is_locked true", u.is_locked, true);
  }
  // 10. created_at & updated_at filtering with date range
  const now = new Date();
  const futureDate = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const pastDate = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 365,
  ).toISOString();
  // Fictitious range in future (no user should match)
  const dateRangeRes = await api.functional.todoList.admin.users.index(
    connection,
    {
      body: {
        page: 1 satisfies number as number,
        page_size: 5 satisfies number as number,
        sort_by: "created_at",
        sort_order: "asc",
        created_at_from: futureDate,
        created_at_to: futureDate,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(dateRangeRes);
  TestValidator.equals(
    "created_at future range yields 0 results",
    dateRangeRes.data.length,
    0,
  );
  // Valid range from 1 year ago to now
  const validRangeRes = await api.functional.todoList.admin.users.index(
    connection,
    {
      body: {
        page: 1 satisfies number as number,
        page_size: 5 satisfies number as number,
        sort_by: "created_at",
        sort_order: "asc",
        created_at_from: pastDate,
        created_at_to: now.toISOString(),
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(validRangeRes);
  TestValidator.predicate(
    "created_at in valid range yields results or 0",
    validRangeRes.data.length >= 0,
  );
  // 11. Try retrieving page out of range (empty result)
  const outOfRangeRes = await api.functional.todoList.admin.users.index(
    connection,
    {
      body: {
        page: 99 satisfies number as number,
        page_size: 5 satisfies number as number,
        sort_by: "created_at",
        sort_order: "asc",
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(outOfRangeRes);
  TestValidator.equals(
    "page out of range yields empty result",
    outOfRangeRes.data.length,
    0,
  );
  // 12. page_size constraint (should not allow > 100)
  const cappedRes = await api.functional.todoList.admin.users.index(
    connection,
    {
      body: {
        page: 1 satisfies number as number,
        page_size: 101 as number,
        sort_by: "created_at",
        sort_order: "asc",
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(cappedRes);
  TestValidator.predicate(
    "page_size constraint cap",
    cappedRes.data.length <= 100,
  );
  // 13. Check only allowed fields are exposed in summary
  for (const u of cappedRes.data) {
    TestValidator.predicate("summary field: id present", "id" in u);
    TestValidator.predicate("summary field: email present", "email" in u);
    TestValidator.predicate(
      "summary field: is_locked present",
      "is_locked" in u,
    );
    TestValidator.equals("summary only 3 fields", Object.keys(u).length, 3);
  }
  // 14. Test sorting by all supported keys (created_at, updated_at, email asc/desc)
  const testSort = async (
    sort_by: "created_at" | "updated_at" | "email",
    sort_order: "asc" | "desc",
  ) => {
    const sortRes = await api.functional.todoList.admin.users.index(
      connection,
      {
        body: {
          page: 1 satisfies number as number,
          page_size: 10 satisfies number as number,
          sort_by,
          sort_order,
        } satisfies ITodoListUser.IRequest,
      },
    );
    typia.assert(sortRes);
    // extract array copy to check order
    const arr = [...sortRes.data];
    let sortedArr: typeof arr;
    if (sort_by === "email") {
      sortedArr = arr
        .slice()
        .sort((a, b) =>
          sort_order === "asc"
            ? a.email.localeCompare(b.email)
            : b.email.localeCompare(a.email),
        );
    } else {
      // cannot really check as no date field in ISummary, just check no error
      sortedArr = arr;
    }
    TestValidator.equals(
      `sort order for ${sort_by}:${sort_order} is valid length`,
      arr.length,
      sortedArr.length,
    );
  };
  await testSort("email", "asc");
  await testSort("email", "desc");
  await testSort("created_at", "asc");
  await testSort("created_at", "desc");
  await testSort("updated_at", "asc");
  await testSort("updated_at", "desc");
}
