import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";

/**
 * Validate that admin session search results can be sorted by creation time.
 *
 * Business goal: Ensure that the admin sessions search endpoint for a specific
 * admin (/shoppingMall/admin/admins/{adminId}/sessions) respects sort_by and
 * sort_direction when listing sessions, particularly when sorting by
 * `created_at`. The test also validates that pagination metadata is stable
 * across sort directions and that all returned sessions belong to the target
 * admin.
 *
 * Scenario:
 *
 * 1. Create a new admin via POST /auth/admin/join.
 * 2. Perform multiple logins for that admin using POST /auth/admin/login to
 *    generate multiple session rows.
 * 3. Query sessions with sort_by = "created_at" and sort_direction = "asc".
 * 4. Query sessions again with sort_by = "created_at" and sort_direction = "desc".
 * 5. Validate that:
 *
 *    - Sessions in the asc result are ordered from oldest to newest.
 *    - Sessions in the desc result are ordered from newest to oldest.
 *    - The set of session ids is identical between asc and desc results.
 *    - Pagination metadata is identical between asc and desc responses.
 *    - Each session.admin.id equals the created admin id.
 */
export async function test_api_admin_session_search_sorting_by_creation_time(
  connection: api.IConnection,
) {
  // 1. Create a new admin via join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // ip is optional and nullable; provide an ipv4 for realism
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const joined: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  const adminId: string & tags.Format<"uuid"> = joined.id;

  // 2. Perform multiple logins for that admin to create multiple sessions
  // Use a small fixed count to keep the test fast but meaningful
  const loginCount = 5;

  const loginBodyTemplate = {
    email: joined.email,
    password: joinBody.password,
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  for (let i = 0; i < loginCount; i++) {
    // Slightly vary href/referrer/ip per login to keep sessions distinct
    const loginBody = {
      ...loginBodyTemplate,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdminLogin.ICreate;

    const loggedIn: IShoppingMallAdmin.IAuthorized =
      await api.functional.auth.admin.login(connection, {
        body: loginBody,
      });
    typia.assert(loggedIn);

    // SDK already updates Authorization header; we don't inspect tokens here
  }

  // 3. Query sessions with sort_by = "created_at", sort_direction = "asc"
  const requestAsc = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    sort_by: "created_at",
    sort_direction: "asc" as const,
  } satisfies IShoppingMallAdminSession.IRequest;

  const ascPage: IPageIShoppingMallAdminSession.ISummary =
    await api.functional.shoppingMall.admin.admins.sessions.index(connection, {
      adminId,
      body: requestAsc,
    });
  typia.assert(ascPage);

  const ascSessions = ascPage.data;

  // Basic sanity: all sessions belong to our admin
  for (const session of ascSessions) {
    typia.assert<IShoppingMallAdminSession.ISummary>(session);
    TestValidator.equals(
      "session.admin.id should match admin id (asc)",
      session.admin.id,
      adminId,
    );
  }

  // If fewer than 2 sessions returned, sorting order checks become trivial
  if (ascSessions.length >= 2) {
    // Verify non-decreasing order on created_at
    for (let i = 1; i < ascSessions.length; i++) {
      const prev = ascSessions[i - 1].created_at;
      const curr = ascSessions[i].created_at;

      TestValidator.predicate(
        `created_at ascending order at index ${i}`,
        new Date(prev).getTime() <= new Date(curr).getTime(),
      );
    }
  }

  // 4. Query sessions with sort_direction = "desc"
  const requestDesc = {
    page: requestAsc.page,
    limit: requestAsc.limit,
    sort_by: requestAsc.sort_by,
    sort_direction: "desc" as const,
  } satisfies IShoppingMallAdminSession.IRequest;

  const descPage: IPageIShoppingMallAdminSession.ISummary =
    await api.functional.shoppingMall.admin.admins.sessions.index(connection, {
      adminId,
      body: requestDesc,
    });
  typia.assert(descPage);

  const descSessions = descPage.data;

  // Sanity: all sessions belong to our admin in desc result as well
  for (const session of descSessions) {
    typia.assert<IShoppingMallAdminSession.ISummary>(session);
    TestValidator.equals(
      "session.admin.id should match admin id (desc)",
      session.admin.id,
      adminId,
    );
  }

  // 5. Validate sorting order for desc
  if (descSessions.length >= 2) {
    for (let i = 1; i < descSessions.length; i++) {
      const prev = descSessions[i - 1].created_at;
      const curr = descSessions[i].created_at;

      TestValidator.predicate(
        `created_at descending order at index ${i}`,
        new Date(prev).getTime() >= new Date(curr).getTime(),
      );
    }
  }

  // 6. Assert same set of IDs in asc and desc for the page
  const ascIds = ascSessions.map((s) => s.id).sort();
  const descIds = descSessions.map((s) => s.id).sort();

  TestValidator.equals("session id multiset should be equal", ascIds, descIds);

  // If there are at least 2 sessions, check that desc order is reverse of asc order
  if (ascSessions.length >= 2 && ascSessions.length === descSessions.length) {
    const reversedAscIds = [...ascSessions].reverse().map((s) => s.id);
    const descIdsInOrder = descSessions.map((s) => s.id);

    TestValidator.equals(
      "descending order should be exact reverse of ascending order",
      descIdsInOrder,
      reversedAscIds,
    );
  }

  // 7. Validate pagination metadata consistency
  const ascPagination = ascPage.pagination;
  const descPagination = descPage.pagination;

  typia.assert<IPage.IPagination>(ascPagination);
  typia.assert<IPage.IPagination>(descPagination);

  TestValidator.equals(
    "pagination.current should be same between asc and desc",
    ascPagination.current,
    descPagination.current,
  );
  TestValidator.equals(
    "pagination.limit should be same between asc and desc",
    ascPagination.limit,
    descPagination.limit,
  );
  TestValidator.equals(
    "pagination.records should be same between asc and desc",
    ascPagination.records,
    descPagination.records,
  );
  TestValidator.equals(
    "pagination.pages should be same between asc and desc",
    ascPagination.pages,
    descPagination.pages,
  );
}
