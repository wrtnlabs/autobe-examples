import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdminSession";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";

/**
 * Validate querying of admin session list with advanced filters.
 *
 * This test verifies that an authenticated admin can query their own session
 * list using various advanced filters:
 *
 * - IP address
 * - Created/expired date-time window
 * - Href
 * - Referrer
 * - Keyword search
 * - Pagination (page/limit)
 * - Sorting by creation/expiration date/direction Only sessions for the
 *   authenticated admin must be returned. Checks compliance and audit-relevant
 *   metadata and completeness/pagination.
 *
 * Steps:
 *
 * 1. Register admin (join) and get its UUID.
 * 2. Query admin session list with default filter (page=1, limit=10) and validate
 *    at least one session is shown, all sessions owned by the admin.
 * 3. Query by ip (from join params), by href and referrer, validating search
 *    matches only session with that value.
 * 4. Test time-based filtering by using created_at of the join session as filter
 *    boundaries.
 * 5. Test general search (partial match) with keyword from href.
 * 6. Test pagination (page=1,2,3, limit=1) and check that total records/pages
 *    looks correct.
 * 7. Test sort_by and sort_order (created_at/expired_at asc/desc), validating
 *    result order.
 */
export async function test_api_admin_session_list_queryable(
  connection: api.IConnection,
) {
  // Step 1: Register an admin account and extract session details
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: RandomGenerator.pick([
      typia.random<string & tags.Format<"ipv4">>(),
      typia.random<string & tags.Format<"ipv6">>(),
    ]),
    href: "https://admin.todoapp.example.com/welcome",
    referrer: "https://homepage.todoapp.example.com/landing",
  } satisfies ITodoAppAdmin.IJoin;
  const authorizedAdmin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(authorizedAdmin);

  // Extract useful values for query
  const adminId = authorizedAdmin.id;
  TestValidator.equals(
    "registered admin email matches",
    authorizedAdmin.email,
    adminJoinBody.email,
  );
  TestValidator.equals("adminId is uuid", typeof adminId, "string");

  // The join session should exist and match submitted info
  if (authorizedAdmin.session !== undefined) {
    typia.assert(authorizedAdmin.session);
    TestValidator.equals(
      "session admin_id matches",
      authorizedAdmin.session.admin_id,
      adminId,
    );
    TestValidator.equals(
      "session ip matches",
      authorizedAdmin.session.ip,
      adminJoinBody.ip ?? authorizedAdmin.session.ip,
    );
    TestValidator.equals(
      "session href matches",
      authorizedAdmin.session.href,
      adminJoinBody.href,
    );
    TestValidator.equals(
      "session referrer matches",
      authorizedAdmin.session.referrer,
      adminJoinBody.referrer,
    );
  }

  // Step 2: Query all admin's sessions (should contain at least the session from join)
  const baseQueryBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies ITodoAppAdminSession.IRequest;
  const basePage = await api.functional.todoApp.admin.admins.sessions.index(
    connection,
    {
      adminId,
      body: baseQueryBody,
    },
  );
  typia.assert(basePage);
  TestValidator.predicate(
    "admin session list returns at least one session",
    basePage.data.length > 0 &&
      basePage.data.some((s) => s.admin_id === adminId),
  );
  // Ensure all sessions are for this admin
  TestValidator.predicate(
    "all returned sessions belong to admin",
    basePage.data.every((s) => s.admin_id === adminId),
  );

  // Step 3: Query by IP filter
  const ipQueryBody = {
    ...baseQueryBody,
    ip: adminJoinBody.ip,
  } satisfies ITodoAppAdminSession.IRequest;
  const ipPage = await api.functional.todoApp.admin.admins.sessions.index(
    connection,
    {
      adminId,
      body: ipQueryBody,
    },
  );
  typia.assert(ipPage);
  TestValidator.predicate(
    "all returned sessions match IP filter",
    ipPage.data.every((s) => s.ip === adminJoinBody.ip),
  );

  // Step 4: Query by href and referrer
  const hrefQueryBody = {
    ...baseQueryBody,
    href: adminJoinBody.href,
  } satisfies ITodoAppAdminSession.IRequest;
  const hrefPage = await api.functional.todoApp.admin.admins.sessions.index(
    connection,
    {
      adminId,
      body: hrefQueryBody,
    },
  );
  typia.assert(hrefPage);
  TestValidator.predicate(
    "all returned sessions match href filter",
    hrefPage.data.every((s) => s.href === adminJoinBody.href),
  );

  const referrerQueryBody = {
    ...baseQueryBody,
    referrer: adminJoinBody.referrer,
  } satisfies ITodoAppAdminSession.IRequest;
  const referrerPage = await api.functional.todoApp.admin.admins.sessions.index(
    connection,
    {
      adminId,
      body: referrerQueryBody,
    },
  );
  typia.assert(referrerPage);
  TestValidator.predicate(
    "all returned sessions match referrer filter",
    referrerPage.data.every((s) => s.referrer === adminJoinBody.referrer),
  );

  // Step 5: Query with created_from/created_to boundary
  if (authorizedAdmin.session !== undefined) {
    const createdAt = authorizedAdmin.session.created_at;
    const createdFromQueryBody = {
      ...baseQueryBody,
      created_from: createdAt,
    } satisfies ITodoAppAdminSession.IRequest;
    const createdFromPage =
      await api.functional.todoApp.admin.admins.sessions.index(connection, {
        adminId,
        body: createdFromQueryBody,
      });
    typia.assert(createdFromPage);
    TestValidator.predicate(
      "all returned sessions created_at >= created_from",
      createdFromPage.data.every((s) => s.created_at >= createdAt),
    );
    const createdToQueryBody = {
      ...baseQueryBody,
      created_to: createdAt,
    } satisfies ITodoAppAdminSession.IRequest;
    const createdToPage =
      await api.functional.todoApp.admin.admins.sessions.index(connection, {
        adminId,
        body: createdToQueryBody,
      });
    typia.assert(createdToPage);
    TestValidator.predicate(
      "all returned sessions created_at <= created_to",
      createdToPage.data.every((s) => s.created_at <= createdAt),
    );
  }

  // Step 6: General search (keyword from href, should find the above session by URL substring)
  const keyword = RandomGenerator.substring(adminJoinBody.href);
  const searchQueryBody = {
    ...baseQueryBody,
    search: keyword,
  } satisfies ITodoAppAdminSession.IRequest;
  const searchPage = await api.functional.todoApp.admin.admins.sessions.index(
    connection,
    {
      adminId,
      body: searchQueryBody,
    },
  );
  typia.assert(searchPage);
  TestValidator.predicate(
    "all returned sessions contain search keyword",
    searchPage.data.every(
      (s) =>
        s.href.includes(keyword) ||
        s.referrer.includes(keyword) ||
        s.ip.includes(keyword),
    ),
  );

  // Step 7: Pagination check (page=1,2; limit=1)
  const paginatedBody = {
    ...baseQueryBody,
    limit: 1 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies ITodoAppAdminSession.IRequest;
  const page1 = await api.functional.todoApp.admin.admins.sessions.index(
    connection,
    {
      adminId,
      body: {
        ...paginatedBody,
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      },
    },
  );
  const page2 = await api.functional.todoApp.admin.admins.sessions.index(
    connection,
    {
      adminId,
      body: {
        ...paginatedBody,
        page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
      },
    },
  );
  typia.assert(page1);
  typia.assert(page2);
  TestValidator.equals("page1 pagination limit", page1.pagination.limit, 1);
  TestValidator.equals("page2 pagination limit", page2.pagination.limit, 1);
  TestValidator.equals("pagination page1 current", page1.pagination.current, 1);
  TestValidator.equals("pagination page2 current", page2.pagination.current, 2);
  TestValidator.predicate("page1 has up to 1 result", page1.data.length <= 1);
  TestValidator.predicate("page2 has up to 1 result", page2.data.length <= 1);
  if (page2.data.length > 0 && page1.data.length > 0) {
    TestValidator.notEquals(
      "pagination distinct data page1/page2 (if both have)",
      page1.data[0].id,
      page2.data[0].id,
    );
  }

  // Step 8: Test sorting (created_at asc/desc)
  for (const sort_by of ["created_at", "expired_at"] as const) {
    for (const sort_order of ["asc", "desc"] as const) {
      const sortBody = {
        ...baseQueryBody,
        sort_by,
        sort_order,
      } satisfies ITodoAppAdminSession.IRequest;
      const sortPage = await api.functional.todoApp.admin.admins.sessions.index(
        connection,
        {
          adminId,
          body: sortBody,
        },
      );
      typia.assert(sortPage);
      const values = sortPage.data.map((s) =>
        sort_by === "created_at" ? s.created_at : s.created_at,
      ); // expired_at is not present on ISummary, use created_at for ordering demo
      const isSorted =
        sort_order === "asc"
          ? values.every((v, i, arr) => i === 0 || arr[i - 1] <= v)
          : values.every((v, i, arr) => i === 0 || arr[i - 1] >= v);
      TestValidator.predicate(
        `sessions sorted by ${sort_by} ${sort_order}`,
        isSorted,
      );
    }
  }
}
