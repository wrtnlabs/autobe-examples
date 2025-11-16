import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAuditLog";

/**
 * Validate pagination and sorting behavior of moderation audit log analytics
 * for platform admins.
 *
 * Business goal: Platform administrators use the analytics auditLogs endpoint
 * to inspect moderation history. This test ensures that the search endpoint
 * honours basic pagination and sorting contracts so that admin consoles can
 * build reliable paged timelines and drilldown views on top of it.
 *
 * Scenario outline (adapted to available APIs):
 *
 * 1. Register a new platform admin via auth.platformAdmin.join to obtain an
 *    authenticated admin context for the connection.
 * 2. Invoke the moderation audit log analytics search endpoint with an explicit
 *    pagination + sorting request (page=1, limit=10, sortBy="created_at",
 *    sortDirection="desc").
 * 3. Verify structural pagination invariants on the first page response:
 *
 *    - Pagination.limit reflects the requested limit (or a service-side capped value
 *
 * > 0).
 *    - Pagination.current is >= 1 when there are records, or 0 when there are none.
 *    - Pagination.records and pagination.pages are self-consistent (pages === 0 when
 *         records === 0, otherwise pages >= 1).
 *    - Data.length does not exceed pagination.limit and records.
 *    - When data has two or more elements, created_at is sorted in the requested
 *         direction (descending for this request).
 * 4. If there are at least two pages (pagination.pages >= 2), fetch page=2 with
 *    the same limit and sorting options and assert:
 *
 *    - Pagination.current === 2.
 *    - Pagination.limit is consistent with the first call.
 *    - Data.length does not exceed pagination.limit.
 *    - Created_at ordering remains descending when there are 2+ items on the page.
 *    - If both page 1 and page 2 contain items, there is no perfect equality of the
 *         full data arrays (basic non-overlap sanity check using IDs),
 *         acknowledging that backend may enforce its own stable order.
 * 5. If there is at least one page and at least one record, send another request
 *    with sortDirection switched to "asc" and verify that, when data has 2+
 *    items, the created_at values are in ascending order. We do not require the
 *    set of IDs to be identical to the descending call because backend filters
 *    may differ over time.
 * 6. Issue an out-of-range page request using page = pagination.pages + 1 (when
 *    pages > 0) or a large page index such as 9999 (when pages === 0) and
 *    assert that:
 *
 *    - The request succeeds without throwing.
 *    - Either the endpoint returns an empty data array with consistent pagination
 *         metadata (pages >= 0, current >= 0, records >= 0) OR a well-formed
 *         non-HTTP-error response according to its contract.
 *
 * Limitations & adjustments:
 *
 * - We do not have APIs to deterministically create moderation audit log entries,
 *   so this test avoids strict expectations about minimum record counts or
 *   specific IDs.
 * - The test is resilient to environments where audit log dataset is empty by
 *   skipping cross-page or cross-sort assertions that require multiple
 *   records.
 */
export async function test_api_moderation_audit_logs_search_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register a platform admin to establish authenticated context
  const joinBody = {
    username: RandomGenerator.alphaNumeric(12),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. First page request with descending created_at sorting
  const initialRequest = {
    page: 1,
    limit: 10,
    sortBy: "created_at",
    sortDirection: "desc",
  } satisfies ICommunityPlatformModerationAuditLog.IRequest;

  const firstPage =
    await api.functional.communityPlatform.platformAdmin.analytics.auditLogs.index(
      connection,
      {
        body: initialRequest,
      },
    );
  typia.assert<IPageICommunityPlatformModerationAuditLog.ISummary>(firstPage);

  const pagination1 = firstPage.pagination;
  const data1 = firstPage.data;

  // 3. Basic pagination invariants for first page
  TestValidator.predicate(
    "pagination.limit must be non-negative",
    (pagination1.limit as number) >= 0,
  );
  TestValidator.predicate(
    "pagination.records must be non-negative",
    (pagination1.records as number) >= 0,
  );
  TestValidator.predicate(
    "pagination.pages must be non-negative",
    (pagination1.pages as number) >= 0,
  );

  if (pagination1.records === 0) {
    TestValidator.equals(
      "when no records, pages must be 0",
      pagination1.pages,
      0,
    );
  } else {
    TestValidator.predicate(
      "when there are records, pages must be at least 1",
      (pagination1.pages as number) >= 1,
    );
    TestValidator.predicate(
      "current page should be at least 1 when dataset is non-empty",
      (pagination1.current as number) >= 1,
    );
  }

  TestValidator.predicate(
    "data length must not exceed pagination.limit",
    data1.length <= (pagination1.limit as number),
  );

  // Verify descending created_at order when multiple items are present
  if (data1.length >= 2) {
    for (let i = 1; i < data1.length; i++) {
      const prev = new Date(data1[i - 1].created_at).getTime();
      const curr = new Date(data1[i].created_at).getTime();
      TestValidator.predicate(
        `created_at should be descending at index ${i}`,
        prev >= curr,
      );
    }
  }

  // 4. Fetch page 2 when available
  if (pagination1.pages >= 2) {
    const secondRequest = {
      page: 2,
      limit: initialRequest.limit,
      sortBy: initialRequest.sortBy,
      sortDirection: initialRequest.sortDirection,
    } satisfies ICommunityPlatformModerationAuditLog.IRequest;

    const secondPage =
      await api.functional.communityPlatform.platformAdmin.analytics.auditLogs.index(
        connection,
        {
          body: secondRequest,
        },
      );
    typia.assert<IPageICommunityPlatformModerationAuditLog.ISummary>(
      secondPage,
    );

    const pagination2 = secondPage.pagination;
    const data2 = secondPage.data;

    TestValidator.equals(
      "second page current index should be 2",
      pagination2.current,
      2,
    );
    TestValidator.equals(
      "second page limit should match first page",
      pagination2.limit,
      pagination1.limit,
    );
    TestValidator.predicate(
      "second page data length cannot exceed limit",
      data2.length <= (pagination2.limit as number),
    );

    if (data2.length >= 2) {
      for (let i = 1; i < data2.length; i++) {
        const prev = new Date(data2[i - 1].created_at).getTime();
        const curr = new Date(data2[i].created_at).getTime();
        TestValidator.predicate(
          `created_at should be descending on page 2 at index ${i}`,
          prev >= curr,
        );
      }
    }

    if (data1.length > 0 && data2.length > 0) {
      const page1Ids = new Set(data1.map((item) => item.id));
      const allSecondPageIdsExistInFirst = data2.every((item) =>
        page1Ids.has(item.id),
      );
      TestValidator.predicate(
        "page 2 should not be an identical slice to page 1 by IDs",
        allSecondPageIdsExistInFirst === false ||
          data1.length + data2.length === 0,
      );
    }
  }

  // 5. Ascending sort check when there are multiple records
  if (pagination1.records > 1) {
    const ascRequest = {
      page: 1,
      limit: initialRequest.limit,
      sortBy: initialRequest.sortBy,
      sortDirection: "asc",
    } satisfies ICommunityPlatformModerationAuditLog.IRequest;

    const ascPage =
      await api.functional.communityPlatform.platformAdmin.analytics.auditLogs.index(
        connection,
        {
          body: ascRequest,
        },
      );
    typia.assert<IPageICommunityPlatformModerationAuditLog.ISummary>(ascPage);

    const dataAsc = ascPage.data;
    if (dataAsc.length >= 2) {
      for (let i = 1; i < dataAsc.length; i++) {
        const prev = new Date(dataAsc[i - 1].created_at).getTime();
        const curr = new Date(dataAsc[i].created_at).getTime();
        TestValidator.predicate(
          `created_at should be ascending at index ${i}`,
          prev <= curr,
        );
      }
    }
  }

  // 6. Out-of-range page handling
  const outOfRangePage = pagination1.pages > 0 ? pagination1.pages + 1 : 9999;
  const outOfRangeRequest = {
    page: outOfRangePage,
    limit: initialRequest.limit,
    sortBy: initialRequest.sortBy,
    sortDirection: initialRequest.sortDirection,
  } satisfies ICommunityPlatformModerationAuditLog.IRequest;

  const outOfRange =
    await api.functional.communityPlatform.platformAdmin.analytics.auditLogs.index(
      connection,
      {
        body: outOfRangeRequest,
      },
    );
  typia.assert<IPageICommunityPlatformModerationAuditLog.ISummary>(outOfRange);

  const paginationOut = outOfRange.pagination;
  const dataOut = outOfRange.data;

  TestValidator.predicate(
    "out-of-range pagination.current should be non-negative",
    (paginationOut.current as number) >= 0,
  );
  TestValidator.predicate(
    "out-of-range pagination.pages should be non-negative",
    (paginationOut.pages as number) >= 0,
  );
  TestValidator.predicate(
    "out-of-range pagination.records should be non-negative",
    (paginationOut.records as number) >= 0,
  );
  TestValidator.predicate(
    "out-of-range data length must not exceed limit",
    dataOut.length <= (paginationOut.limit as number),
  );
}
