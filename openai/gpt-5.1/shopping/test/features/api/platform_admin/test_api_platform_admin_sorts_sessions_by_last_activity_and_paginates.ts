import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPlatformadminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPlatformadminSession";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallPlatformadminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformadminSession";

export async function test_api_platform_admin_sorts_sessions_by_last_activity_and_paginates(
  connection: api.IConnection,
) {
  /**
   * Validate that a platform administrator can list their own authentication
   * sessions sorted by last activity time with proper pagination.
   *
   * Business workflow:
   *
   * 1. Register a new platform administrator through the join endpoint, which also
   *    creates an initial session for that admin.
   * 2. Perform several login operations for the same admin account to create
   *    multiple additional sessions, ensuring there is enough data to span
   *    multiple pages.
   * 3. Call the platform-admin sessions listing endpoint twice with sortBy =
   *    "last_activity_at", sortDirection = "desc" and a small pageSize so that
   *    at least two pages of results are returned.
   * 4. Verify pagination metadata (current index, limit, total records) and
   *    confirm that sessions within each page are ordered by lastActivityAt in
   *    descending order whenever timestamps are present.
   * 5. Ensure that the two pages are disjoint by session id and that the first
   *    element of the first page is at least as recent as any other session
   *    returned on that page.
   */

  // 1. Register a new platform administrator (also creates the initial session)
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphabets(12),
    ip: "203.0.113.10",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const joined: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  const platformAdminId = joined.id;

  // 2. Perform several login cycles to create multiple sessions
  const loginBodyBase = {
    email: joined.email,
    password: joinBody.password,
    ip: "203.0.113.10",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const sessionCount = 5;
  for (let i = 0; i < sessionCount; i += 1) {
    const loginBody = {
      ...loginBodyBase,
      href: `https://admin.example.com/login?i=${i}`,
      referrer: `https://admin.example.com/landing?i=${i}`,
    } satisfies IShoppingMallPlatformAdminLogin.IRequest;

    const loginResult: IShoppingMallPlatformAdmin.IAuthorized =
      await api.functional.auth.platformAdmin.login(connection, {
        body: loginBody,
      });
    typia.assert(loginResult);
  }

  // 3. Call sessions.index with sortBy last_activity_at, desc and small pageSize
  const pageSize = 2 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const firstPage: IPageIShoppingMallPlatformadminSession.ISummary =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.sessions.index(
      connection,
      {
        platformAdminId,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          pageSize,
          sortBy: "last_activity_at",
          sortDirection: "desc",
        } satisfies IShoppingMallPlatformadminSession.IRequest,
      },
    );
  typia.assert(firstPage);

  const secondPage: IPageIShoppingMallPlatformadminSession.ISummary =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.sessions.index(
      connection,
      {
        platformAdminId,
        body: {
          page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
          pageSize,
          sortBy: "last_activity_at",
          sortDirection: "desc",
        } satisfies IShoppingMallPlatformadminSession.IRequest,
      },
    );
  typia.assert(secondPage);

  const pagination1 = firstPage.pagination;
  const pagination2 = secondPage.pagination;

  // Basic pagination invariants
  TestValidator.predicate(
    "first page index should be 0",
    pagination1.current === 0,
  );
  TestValidator.predicate(
    "second page index should be 1",
    pagination2.current === 1,
  );
  TestValidator.predicate(
    "limit should equal requested pageSize",
    pagination1.limit === pageSize && pagination2.limit === pageSize,
  );

  TestValidator.predicate(
    "records should be >= number of created sessions",
    pagination1.records >= sessionCount,
  );

  // 4. Within each page, verify ordering by lastActivityAt desc when present
  const assertDescByLastActivity = (
    title: string,
    data: IShoppingMallPlatformadminSession.ISummary[],
  ) => {
    for (let i = 1; i < data.length; i += 1) {
      const prev = data[i - 1].lastActivityAt;
      const curr = data[i].lastActivityAt;
      if (prev !== undefined && curr !== undefined) {
        TestValidator.predicate(
          `${title} lastActivityAt[${i - 1}] >= lastActivityAt[${i}]`,
          prev >= curr,
        );
      }
    }
  };

  assertDescByLastActivity("first page", firstPage.data);
  assertDescByLastActivity("second page", secondPage.data);

  // 5. Ensure that pages are disjoint by session id
  const firstIds = firstPage.data.map((s) => s.id);
  const secondIds = secondPage.data.map((s) => s.id);

  const intersection = firstIds.filter((id) => secondIds.includes(id));
  TestValidator.equals(
    "first and second pages should be disjoint by id",
    intersection.length,
    0,
  );

  // 6. Ensure that the very first element of the first page is the most recent
  if (firstPage.data.length > 1) {
    const mostRecent = firstPage.data[0];
    for (let i = 1; i < firstPage.data.length; i += 1) {
      const candidate = firstPage.data[i];
      if (
        mostRecent.lastActivityAt !== undefined &&
        candidate.lastActivityAt !== undefined
      ) {
        TestValidator.predicate(
          "most recent session should not be older than others on first page",
          mostRecent.lastActivityAt >= candidate.lastActivityAt,
        );
      }
    }
  }
}
