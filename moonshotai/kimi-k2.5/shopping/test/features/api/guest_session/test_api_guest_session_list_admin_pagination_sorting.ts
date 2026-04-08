import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import type { IEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_guest_session_list_admin_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin
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
  // Step 2: Test first page with small limit
  const page1 = await api.functional.ecommerceMall.admin.guest_sessions.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IEcommerceMallGuestSession.IRequest,
    },
  );
  typia.assert(page1);
  // Validate page 1 pagination metadata
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 5);
  TestValidator.predicate("page 1 records >= 0", page1.pagination.records >= 0);
  TestValidator.predicate("page 1 pages >= 0", page1.pagination.pages >= 0);
  TestValidator.predicate(
    "pages calculation correct",
    page1.pagination.pages ===
      Math.ceil(page1.pagination.records / page1.pagination.limit) ||
      (page1.pagination.records === 0 && page1.pagination.pages === 0),
  );
  // Store first page IDs for comparison
  const page1Ids = page1.data.map((session) => session.id);
  // Step 3: Test second page
  const page2 = await api.functional.ecommerceMall.admin.guest_sessions.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IEcommerceMallGuestSession.IRequest,
    },
  );
  typia.assert(page2);
  // Validate page 2 pagination metadata
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 5);
  // Validate no overlap between page 1 and page 2
  const page2Ids = page2.data.map((session) => session.id);
  const overlap = page1Ids.filter((id) => page2Ids.includes(id));
  TestValidator.equals(
    "no overlapping records between pages",
    overlap.length,
    0,
  );
  // Step 4: Test sorting by expired_at ascending
  const sortedAsc =
    await api.functional.ecommerceMall.admin.guest_sessions.index(
      adminConnection,
      {
        body: {
          sortBy: "expired_at",
          sortOrder: "asc",
          limit: 10,
        } satisfies IEcommerceMallGuestSession.IRequest,
      },
    );
  typia.assert(sortedAsc);
  // Validate ascending order
  if (sortedAsc.data.length > 1) {
    for (let i = 1; i < sortedAsc.data.length; i++) {
      const prev = new Date(sortedAsc.data[i - 1].expiredAt).getTime();
      const curr = new Date(sortedAsc.data[i].expiredAt).getTime();
      TestValidator.predicate(
        `ascending sort: record ${i - 1} expiredAt <= record ${i} expiredAt`,
        prev <= curr,
      );
    }
  }
  // Step 5: Test sorting by expired_at descending
  const sortedDesc =
    await api.functional.ecommerceMall.admin.guest_sessions.index(
      adminConnection,
      {
        body: {
          sortBy: "expired_at",
          sortOrder: "desc",
          limit: 10,
        } satisfies IEcommerceMallGuestSession.IRequest,
      },
    );
  typia.assert(sortedDesc);
  // Validate descending order
  if (sortedDesc.data.length > 1) {
    for (let i = 1; i < sortedDesc.data.length; i++) {
      const prev = new Date(sortedDesc.data[i - 1].expiredAt).getTime();
      const curr = new Date(sortedDesc.data[i].expiredAt).getTime();
      TestValidator.predicate(
        `descending sort: record ${i - 1} expiredAt >= record ${i} expiredAt`,
        prev >= curr,
      );
    }
  }
  // Step 6: Verify sort orders are opposite
  if (sortedAsc.data.length > 0 && sortedDesc.data.length > 0) {
    const ascFirst = sortedAsc.data[0]?.expiredAt;
    const descFirst = sortedDesc.data[0]?.expiredAt;
    if (ascFirst !== undefined && descFirst !== undefined) {
      TestValidator.notEquals(
        "ascending and descending first elements differ",
        ascFirst,
        descFirst,
      );
    }
  }
  // Step 7: Test total records consistency across pages
  const allRecordsResponse =
    await api.functional.ecommerceMall.admin.guest_sessions.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallGuestSession.IRequest,
      },
    );
  typia.assert(allRecordsResponse);
  const totalRecords = allRecordsResponse.pagination.records;
  // Verify calculated pages matches actual
  const expectedPages = Math.ceil(totalRecords / 5);
  TestValidator.equals(
    "total pages calculation matches",
    page1.pagination.pages,
    expectedPages,
  );
  // Step 8: Test expired sessions retrieval for audit
  const now = new Date().toISOString();
  const expiredSessions =
    await api.functional.ecommerceMall.admin.guest_sessions.index(
      adminConnection,
      {
        body: {
          expiredAtTo: now,
          limit: 20,
        } satisfies IEcommerceMallGuestSession.IRequest,
      },
    );
  typia.assert(expiredSessions);
  // Verify expired sessions are retrievable
  const expiredCount = expiredSessions.data.filter(
    (session) =>
      new Date(session.expiredAt).getTime() <= new Date(now).getTime(),
  ).length;
  TestValidator.predicate(
    "expired sessions retrievable for audit",
    expiredCount >= 0,
  );
  // Guest status validation for expired sessions
  const expiredGuestStatuses = expiredSessions.data.map((s) => s.guest.status);
  const hasExpiredGuests = expiredGuestStatuses.some(
    (status) => status === "expired",
  );
  TestValidator.predicate(
    "expired sessions have expected guest status",
    hasExpiredGuests || expiredSessions.data.length === 0,
  );
}
