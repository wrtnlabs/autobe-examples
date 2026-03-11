import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_sessions_filters_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins system
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Pre-create multiple sessions by logging in with different times
  const baseDate = new Date();
  // Create multiple sessions with known characteristics for testing
  for (let i = 0; i < 10; i++) {
    const testConnection: api.IConnection = { host: connection.host };
    const sellerEmail = `seller_${i}@test.com`;
    // Join seller account
    await authorize_admin_join(testConnection, {
      body: {
        email: sellerEmail,
        password: RandomGenerator.alphaNumeric(16),
        href: `http://test${i}.com/page`,
        referrer: `http://referrer${i}.com`,
        ip: `192.168.1.${i}`,
      } satisfies IEcommerceMallAdmin.IJoin,
    });
  }
  // 3. Test empty results: filter by IP address that doesn't exist
  const nonExistentIP = "999.999.999.999";
  const emptyResult = await api.functional.ecommerceMall.admin.sessions.index(
    adminConnection,
    {
      body: {
        search: {
          ip: nonExistentIP,
        },
      },
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals("empty IP filter result", emptyResult.data.length, 0);
  // 4. Test date range filtering (broad range to capture existing sessions)
  const dateRangeStart = new Date(
    baseDate.getTime() - 30 * 24 * 60 * 60 * 1000,
  ); // 30 days ago
  const dateRangeEnd = new Date(baseDate.getTime() + 1 * 24 * 60 * 60 * 1000); // 1 day in future
  const dateFiltered = await api.functional.ecommerceMall.admin.sessions.index(
    adminConnection,
    {
      body: {
        created_at: {
          gte: dateRangeStart.toISOString(),
        },
      },
    },
  );
  typia.assert(dateFiltered);
  TestValidator.predicate(
    "date filter returns sessions",
    dateFiltered.data.length > 0,
  );
  for (const session of dateFiltered.data) {
    const sessionDate = new Date(session.created_at);
    TestValidator.predicate(
      "session in date range",
      sessionDate >= dateRangeStart,
    );
  }
  // 5. Test referrer filtering (partial match)
  const referrerFilter = "test.com";
  const referrerFiltered =
    await api.functional.ecommerceMall.admin.sessions.index(adminConnection, {
      body: {
        search: {
          referrer: referrerFilter,
        },
      },
    });
  typia.assert(referrerFiltered);
  for (const session of referrerFiltered.data) {
    TestValidator.predicate(
      "referrer partial match",
      session.referrer.includes(referrerFilter),
    );
  }
  // 6. Test href/user-agent filtering
  const hrefFilter = "page";
  const hrefFiltered = await api.functional.ecommerceMall.admin.sessions.index(
    adminConnection,
    {
      body: {
        search: {
          href: hrefFilter,
        },
      },
    },
  );
  typia.assert(hrefFiltered);
  for (const session of hrefFiltered.data) {
    TestValidator.predicate(
      "href partial match",
      session.href.includes(hrefFilter),
    );
  }
  // 7. Test sorting by last_activity
  const sortedByActivity =
    await api.functional.ecommerceMall.admin.sessions.index(adminConnection, {
      body: {
        sort: "last_activity",
        order: "desc",
      },
    });
  typia.assert(sortedByActivity);
  TestValidator.predicate(
    "sorting by last_activity returns data",
    sortedByActivity.data.length > 0,
  );
  // 8. Test sorting in ascending order
  const sortedAscending =
    await api.functional.ecommerceMall.admin.sessions.index(adminConnection, {
      body: {
        sort: "created_at",
        order: "asc",
      },
    });
  typia.assert(sortedAscending);
  if (sortedAscending.data.length > 1) {
    for (let i = 1; i < sortedAscending.data.length; i++) {
      const prevDate = new Date(sortedAscending.data[i - 1].created_at);
      const currDate = new Date(sortedAscending.data[i].created_at);
      TestValidator.predicate("ascending order", prevDate <= currDate);
    }
  }
  // 9. Test pagination with different limit values
  const limits = [10, 50, 100];
  for (const limit of limits) {
    const paginated = await api.functional.ecommerceMall.admin.sessions.index(
      adminConnection,
      {
        body: {
          limit,
        },
      },
    );
    typia.assert(paginated);
    const expectedCount = Math.min(limit, paginated.pagination.records);
    TestValidator.equals(
      `limit ${limit} returns correct count`,
      paginated.data.length,
      expectedCount,
    );
    TestValidator.equals(
      `limit ${limit} pagination`,
      paginated.pagination.limit,
      limit,
    );
  }
  // 10. Test limit boundary (maximum allowed)
  const maxLimitResult =
    await api.functional.ecommerceMall.admin.sessions.index(adminConnection, {
      body: {
        limit: 100,
      },
    });
  typia.assert(maxLimitResult);
  TestValidator.equals("max limit 100", maxLimitResult.pagination.limit, 100);
  // 11. Test multiple filters combined
  const combinedResult =
    await api.functional.ecommerceMall.admin.sessions.index(adminConnection, {
      body: {
        search: {
          ip: "192.168.1.", // partial IP match
        },
        created_at: {
          gte: new Date(
            baseDate.getTime() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      },
    });
  typia.assert(combinedResult);
  for (const session of combinedResult.data) {
    TestValidator.predicate(
      "combined filter: IP partial match",
      session.ip.includes("192.168.1."),
    );
    const sessionDate = new Date(session.created_at);
    TestValidator.predicate(
      "combined filter: date range",
      sessionDate >= dateRangeStart,
    );
  }
  // 12. Verify session information structure
  for (const session of maxLimitResult.data.slice(0, 5)) {
    TestValidator.predicate(
      "session has required fields",
      !!(session.id && session.ip && session.href && session.referrer),
    );
    TestValidator.predicate(
      "session has timestamps",
      !!(session.created_at && session.expired_at),
    );
  }
  // 13. Test with seller session data structure
  const sellerTestResult =
    await api.functional.ecommerceMall.admin.sessions.index(adminConnection, {
      body: {
        limit: 20,
      },
    });
  typia.assert(sellerTestResult);
  for (const session of sellerTestResult.data) {
    // Verify seller info is accessible
    TestValidator.notEquals(
      "seller info present",
      session.seller.id,
      undefined as any,
    );
    TestValidator.notEquals(
      "seller email present",
      session.seller.email,
      undefined as any,
    );
    TestValidator.notEquals(
      "seller approval status present",
      session.seller.approvalStatus,
      undefined as any,
    );
    TestValidator.notEquals(
      "suspension status present",
      session.seller.isSuspended,
      undefined as any,
    );
    TestValidator.notEquals(
      "ban status present",
      session.seller.isBanned,
      undefined as any,
    );
  }
  // 14. Verify security metadata is present
  for (const session of sellerTestResult.data.slice(0, 5)) {
    TestValidator.predicate(
      "security: IP address present",
      session.ip !== undefined,
    );
    TestValidator.predicate(
      "security: referrer present",
      session.referrer !== undefined,
    );
    TestValidator.predicate(
      "security: href present",
      session.href !== undefined,
    );
  }
  // 15. Verify no sensitive data is exposed in session summary
  // The session summary should not contain full tokens or passwords in visible fields
  for (const session of sellerTestResult.data.slice(0, 5)) {
    TestValidator.predicate(
      "no password in session href",
      !session.href.toLowerCase().includes("password"),
    );
    TestValidator.predicate(
      "no password in session referrer",
      !session.referrer.toLowerCase().includes("password"),
    );
  }
}
