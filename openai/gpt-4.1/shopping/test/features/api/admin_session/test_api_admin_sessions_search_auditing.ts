import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";

/**
 * Validate admin session log search and auditing.
 *
 * This test ensures a platform admin can retrieve their own session log records
 * using filtering and pagination.
 *
 * Step-by-step:
 *
 * 1. Register a new admin using valid random data (email, password, name)
 * 2. Query session logs for that admin (filters: random referrer string, random
 *    page/limit)
 * 3. Verify result is paginated, and each session record contains required keys
 *    (id, ip, href, referrer, created_at, expired_at)
 * 4. Validate field types and data consistency, especially the filter criteria
 *    (referrer-matching sessions only)
 * 5. Verify that the request is authorized – if possible, check unauthenticated
 *    access is disallowed (not implemented due to SDK auto-auth)
 */
export async function test_api_admin_sessions_search_auditing(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();
  const adminName: string = RandomGenerator.name();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Search for sessions (with random filtering/pagination)
  const filterReferrer: string = RandomGenerator.paragraph({ sentences: 2 });
  const filterHref: string = RandomGenerator.paragraph({ sentences: 2 });

  // We expect at least ONE session (this login), but filterReferrer is random (might not exist)
  // So use undefined on first query (fetch all), filter by referrer in second round
  const page: number & tags.Type<"int32"> = 1 satisfies number as number;
  const limit: number & tags.Type<"int32"> = 10 satisfies number as number;
  const baseRequest = {
    page,
    limit,
  } satisfies IShoppingMallAdminSession.IRequest;

  const allSessions: IPageIShoppingMallAdminSession.ISummary =
    await api.functional.shoppingMall.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: baseRequest,
    });
  typia.assert(allSessions);
  TestValidator.predicate(
    "session results must be array",
    Array.isArray(allSessions.data),
  );
  if (allSessions.data.length > 0) {
    // Check required fields & types
    allSessions.data.forEach((session, idx) => {
      TestValidator.predicate(
        `session[${idx}] must have id`,
        typeof session.id === "string",
      );
      TestValidator.predicate(
        `session[${idx}] must have ip`,
        typeof session.ip === "string",
      );
      TestValidator.predicate(
        `session[${idx}] must have href`,
        typeof session.href === "string",
      );
      TestValidator.predicate(
        `session[${idx}] must have referrer`,
        typeof session.referrer === "string",
      );
      TestValidator.predicate(
        `session[${idx}] must have valid created_at`,
        typeof session.created_at === "string",
      );
      // expired_at can be string or null/undefined
      if (session.expired_at !== null && session.expired_at !== undefined) {
        TestValidator.predicate(
          `session[${idx}] expired_at, if present, must be string`,
          typeof session.expired_at === "string",
        );
      }
    });
  }
  // 3. Now filter with random referrer (expecting likely 0 results, but test filter mechanics)
  const filteredSessions: IPageIShoppingMallAdminSession.ISummary =
    await api.functional.shoppingMall.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: {
        ...baseRequest,
        referrer: filterReferrer,
      },
    });
  typia.assert(filteredSessions);
  filteredSessions.data.forEach((session, idx) => {
    TestValidator.equals(
      `filteredSessions[${idx}] must have referrer = filterReferrer`,
      session.referrer,
      filterReferrer,
    );
  });

  // 4. Pagination edge case: query a page number beyond available pages
  const outOfRangePage = (allSessions.pagination.pages +
    1) satisfies number as number;
  const emptyPageSessions: IPageIShoppingMallAdminSession.ISummary =
    await api.functional.shoppingMall.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: {
        ...baseRequest,
        page: outOfRangePage,
      },
    });
  typia.assert(emptyPageSessions);
  TestValidator.equals(
    "empty page must return zero sessions",
    emptyPageSessions.data.length,
    0,
  );
}
