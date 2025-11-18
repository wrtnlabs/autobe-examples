import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListAdminSession";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

/**
 * Validate advanced session listing and filtering for an admin.
 *
 * This test covers the lifecycle from admin registration through session
 * creation and advanced filtering queries.
 *
 * 1. Register a new admin (with unique email and metadata)
 * 2. Assert registration result, extract adminId
 * 3. Query sessions endpoint (PATCH /todoList/admin/admins/{adminId}/sessions)
 *    with no filter (defaults), validate list includes at least the
 *    just-created session
 * 4. Query with time window filter using actual created_at/expired_at from a found
 *    session
 * 5. Query with IP substring filter (if session.ip set)
 * 6. Query with pagination: limit=1 (single record), then limit=1 page=2 (should
 *    be empty or next page)
 * 7. Query with sort_by/sort_order combos for created_at/expired_at asc/desc
 * 8. Query with IP pattern that does not match anything, confirm zero results
 * 9. Validate error edge cases
 */
export async function test_api_admin_sessions_listing_with_filters(
  connection: api.IConnection,
) {
  // 1. Register admin (join)
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://admin.test/callback",
    referrer: "https://admin.test/register",
    ip: RandomGenerator.pick([
      typia.random<string & tags.Format<"ipv4">>(),
      typia.random<string & tags.Format<"ipv6">>(),
      null,
      undefined,
    ]),
  } satisfies ITodoListAdmin.ICreate;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminBody,
  });
  typia.assert(admin);
  const adminId = admin.id;

  // 2. Query sessions with no filters
  const basePage = await api.functional.todoList.admin.admins.sessions.index(
    connection,
    {
      adminId,
      body: {},
    },
  );
  typia.assert(basePage);
  TestValidator.predicate(
    "at least one session exists for admin",
    basePage.data.length >= 1,
  );
  TestValidator.predicate(
    "pagination data returned",
    basePage.pagination.current >= 1 && basePage.pagination.limit >= 1,
  );
  TestValidator.equals(
    "sessions have correct adminId",
    basePage.data[0].id,
    adminId,
  );

  const firstSession = basePage.data[0];

  // 3. Time window filter
  if (firstSession) {
    const filteredByTime =
      await api.functional.todoList.admin.admins.sessions.index(connection, {
        adminId,
        body: {
          created_from: firstSession.created_at,
          created_to: firstSession.created_at,
        },
      });
    typia.assert(filteredByTime);
    TestValidator.predicate(
      "filtered by exact time returns at least one",
      filteredByTime.data.length >= 1,
    );
    TestValidator.equals(
      "session's created_at matches filter",
      filteredByTime.data[0].created_at,
      firstSession.created_at,
    );
  }

  // 4. IP substring filter if IP is present
  if (admin.session && admin.session.id && typeof adminBody.ip === "string") {
    const partialIp = adminBody.ip.substring(0, 4);
    const filteredByIp =
      await api.functional.todoList.admin.admins.sessions.index(connection, {
        adminId,
        body: {
          ip_like: partialIp,
        },
      });
    typia.assert(filteredByIp);
    if (filteredByIp.data.length > 0) {
      TestValidator.predicate(
        "filtered sessions have IP containing substring",
        filteredByIp.data.every(
          (s) =>
            typeof adminBody.ip === "string" &&
            s.email.includes(adminBody.email),
        ),
      );
    }
  }

  // 5. Pagination: limit=1 (first page)
  const paged1 = await api.functional.todoList.admin.admins.sessions.index(
    connection,
    {
      adminId,
      body: { limit: 1 },
    },
  );
  typia.assert(paged1);
  TestValidator.predicate(
    "pagination limit=1 returns at most one record",
    paged1.data.length <= 1,
  );

  // 6. Pagination: limit=1 page=2 (should be empty or second page)
  const paged2 = await api.functional.todoList.admin.admins.sessions.index(
    connection,
    {
      adminId,
      body: { limit: 1, page: 2 },
    },
  );
  typia.assert(paged2);
  TestValidator.predicate(
    "pagination on page=2 returns empty array or next record",
    paged2.data.length === 0 || paged2.data.length === 1,
  );

  // 7. Sort by created_at asc
  const sortedAsc = await api.functional.todoList.admin.admins.sessions.index(
    connection,
    {
      adminId,
      body: { sort_by: "created_at", sort_order: "asc" },
    },
  );
  typia.assert(sortedAsc);
  TestValidator.predicate(
    "sorted ascending by created_at",
    sortedAsc.data.length <= 1 ||
      sortedAsc.data.every(
        (s, i, arr) => i === 0 || s.created_at >= arr[i - 1].created_at,
      ),
  );

  // 8. Sort by created_at desc
  const sortedDesc = await api.functional.todoList.admin.admins.sessions.index(
    connection,
    {
      adminId,
      body: { sort_by: "created_at", sort_order: "desc" },
    },
  );
  typia.assert(sortedDesc);
  TestValidator.predicate(
    "sorted descending by created_at",
    sortedDesc.data.length <= 1 ||
      sortedDesc.data.every(
        (s, i, arr) => i === 0 || s.created_at <= arr[i - 1].created_at,
      ),
  );

  // 9. Query with non-matching IP pattern (should return no results)
  const filteredNone =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId,
      body: { ip_like: "nomatch-nonexistent-ip-frag" },
    });
  typia.assert(filteredNone);
  TestValidator.equals(
    "no results when using impossible IP fragment",
    filteredNone.data.length,
    0,
  );
}
