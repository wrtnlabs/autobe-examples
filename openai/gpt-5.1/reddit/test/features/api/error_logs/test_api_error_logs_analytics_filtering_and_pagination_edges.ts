import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformErrorLog";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformErrorLog";

/**
 * Validate platform admin error log analytics pagination and filtering edge
 * cases.
 *
 * Business goals
 *
 * - Ensure a joined platform admin can call the analytics error log search
 *   endpoint.
 * - Validate that pagination metadata for page 1 and page 2 is consistent with
 *   the requested page index.
 * - Ensure that combining data from two consecutive pages does not yield
 *   duplicate error-log IDs.
 * - Verify conditional expectations around record counts vs. page 2 emptiness and
 *   total pages.
 * - Confirm that a future-only time window yields a zero-record, empty-data page
 *   with coherent pagination fields.
 *
 * Steps
 *
 * 1. Join a platform admin to obtain an authenticated connection.
 * 2. Query error logs with a broad time window, page=1, limit=5, and null filters
 *    for lists, capturing page1.
 * 3. Query error logs with page=2 and same criteria, capturing page2.
 * 4. Assert structural types with typia.assert and business rules with
 *    TestValidator.
 * 5. Execute a future-window query to ensure zero-record behavior.
 */
export async function test_api_error_logs_analytics_filtering_and_pagination_edges(
  connection: api.IConnection,
) {
  // 1. Join platform admin (authentication setup)
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Broad window page=1 and page=2 queries
  const now = new Date();
  const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

  const broadRequestBase = {
    from_created_at: past.toISOString(),
    to_created_at: now.toISOString(),
    error_severities: null,
    source_components: null,
    error_codes: null,
    memberuser_id: null,
    community_id: null,
    request_id: null,
    search: null,
    order_by_created_at_desc: true,
  } satisfies Omit<ICommunityPlatformErrorLog.IRequest, "page" | "limit">;

  const page1Body = {
    ...broadRequestBase,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies ICommunityPlatformErrorLog.IRequest;

  const page1: IPageICommunityPlatformErrorLog.ISummary =
    await api.functional.communityPlatform.platformAdmin.analytics.errorLogs.index(
      connection,
      { body: page1Body },
    );
  typia.assert<IPageICommunityPlatformErrorLog.ISummary>(page1);

  const page2Body = {
    ...broadRequestBase,
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies ICommunityPlatformErrorLog.IRequest;

  const page2: IPageICommunityPlatformErrorLog.ISummary =
    await api.functional.communityPlatform.platformAdmin.analytics.errorLogs.index(
      connection,
      { body: page2Body },
    );
  typia.assert<IPageICommunityPlatformErrorLog.ISummary>(page2);

  // 3. pagination.current equals requested page
  TestValidator.equals(
    "pagination.current matches requested page 1",
    page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.current matches requested page 2",
    page2.pagination.current,
    2,
  );

  // 4. No duplicate ids across page1 and page2 data
  const combined = [...page1.data, ...page2.data];
  const uniqueIds = new Set(combined.map((log) => log.id));
  TestValidator.equals(
    "combined data has no duplicate error-log ids across pages",
    combined.length,
    uniqueIds.size,
  );

  // 5. Branch expectations based on total records
  const totalRecords = page1.pagination.records;
  TestValidator.equals(
    "pagination.records is consistent between pages",
    page2.pagination.records,
    totalRecords,
  );

  if (totalRecords < 6) {
    TestValidator.equals(
      "when records < 6, second page data must be empty",
      page2.data.length,
      0,
    );
    TestValidator.equals(
      "when records < 6, total pages must be 1",
      page1.pagination.pages,
      1,
    );
    TestValidator.equals(
      "when records < 6, pages value consistent across pages",
      page2.pagination.pages,
      1,
    );
  } else {
    TestValidator.predicate(
      "when records >= 6, page1 must have at least one record",
      page1.data.length > 0,
    );
    TestValidator.predicate(
      "when records >= 6, page2 must have at least one record",
      page2.data.length > 0,
    );
    TestValidator.predicate(
      "when records >= 6, total pages must be at least 2",
      page1.pagination.pages >= 2,
    );
    TestValidator.equals(
      "pages metadata consistent across pages when records >= 6",
      page2.pagination.pages,
      page1.pagination.pages,
    );

    // Check that records count is consistent with pages and limit bounds
    const pages = page1.pagination.pages;
    TestValidator.predicate(
      "records count is within pages/limit bounds",
      totalRecords <= pages * page1.pagination.limit &&
        totalRecords > (pages - 1) * page1.pagination.limit,
    );
  }

  // 6. Future-only time window: expect zero records and empty data
  const futureStart = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // +1 year
  const futureEnd = new Date(futureStart.getTime() + 7 * 24 * 60 * 60 * 1000); // +1 week

  const futureBody = {
    from_created_at: futureStart.toISOString(),
    to_created_at: futureEnd.toISOString(),
    error_severities: null,
    source_components: null,
    error_codes: null,
    memberuser_id: null,
    community_id: null,
    request_id: null,
    search: null,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
    order_by_created_at_desc: true,
  } satisfies ICommunityPlatformErrorLog.IRequest;

  const futurePage: IPageICommunityPlatformErrorLog.ISummary =
    await api.functional.communityPlatform.platformAdmin.analytics.errorLogs.index(
      connection,
      { body: futureBody },
    );
  typia.assert<IPageICommunityPlatformErrorLog.ISummary>(futurePage);

  TestValidator.equals(
    "future window returns zero records",
    futurePage.pagination.records,
    0,
  );
  TestValidator.equals(
    "future window has zero logical pages",
    futurePage.pagination.pages,
    0,
  );
  TestValidator.equals(
    "future window has empty data array",
    futurePage.data.length,
    0,
  );
  TestValidator.predicate(
    "future window pagination.current is non-negative",
    futurePage.pagination.current >= 0,
  );
}
