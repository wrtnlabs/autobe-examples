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
 * Validate basic time-range and severity-filtered error log analytics for a
 * platform administrator.
 *
 * Business flow:
 *
 * 1. Register a new platform administrator via POST /auth/platformAdmin/join,
 *    which also issues JWT tokens and wires Authorization into the connection
 *    headers.
 * 2. As this platform admin, call PATCH
 *    /communityPlatform/platformAdmin/analytics/errorLogs with an
 *    ICommunityPlatformErrorLog.IRequest body that configures:
 *
 *    - A narrow ISO-8601 time window using from_created_at and to_created_at.
 *    - A specific severity filter list (e.g., ["error"]).
 *    - Pagination parameters page=1, limit=10, and order_by_created_at_desc=true.
 * 3. Assert that the response structure matches
 *    IPageICommunityPlatformErrorLog.ISummary via typia.assert, and that
 *    pagination.limit and pagination.current are consistent with the request
 *    and non-negative.
 * 4. If data entries exist in the response, validate that each summary record:
 *
 *    - Has severity contained in the requested severity list.
 *    - Has created_at within the requested [from_created_at, to_created_at) window
 *         (lexical comparison on ISO-8601 strings).
 * 5. Issue a second analytics request using the same filters but with page=2 to
 *    confirm pagination mechanics are stable, asserting the type and basic
 *    pagination metadata without assuming specific record counts.
 */
export async function test_api_error_logs_analytics_basic_filtering_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator and obtain an authenticated context.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Build a narrow time window around "now" using ISO-8601 strings.
  const now = new Date();
  const windowMinutes = 5;
  const fromDate = new Date(now.getTime() - windowMinutes * 60 * 1000);
  const toDate = new Date(now.getTime() + windowMinutes * 60 * 1000);

  const fromCreatedAt: string = fromDate.toISOString();
  const toCreatedAt: string = toDate.toISOString();

  const severities = ["error"] as const;
  const page = 1;
  const limit = 10;

  // 3. Call analytics errorLogs.index with time range, severity filter and pagination.
  const firstRequestBody = {
    from_created_at: fromCreatedAt,
    to_created_at: toCreatedAt,
    error_severities: [...severities],
    page,
    limit,
    order_by_created_at_desc: true,
  } satisfies ICommunityPlatformErrorLog.IRequest;

  const firstPage: IPageICommunityPlatformErrorLog.ISummary =
    await api.functional.communityPlatform.platformAdmin.analytics.errorLogs.index(
      connection,
      {
        body: firstRequestBody,
      },
    );
  typia.assert(firstPage);

  // 4. Basic pagination assertions for the first page.
  TestValidator.equals(
    "pagination.limit must match requested limit on first page",
    firstPage.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "pagination.current must equal requested page on first page",
    firstPage.pagination.current,
    page,
  );
  TestValidator.predicate(
    "pagination.records must be non-negative on first page",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages must be non-negative on first page",
    firstPage.pagination.pages >= 0,
  );

  // 5. When there are results, verify severity membership and created_at window.
  if (firstPage.data.length > 0) {
    for (const item of firstPage.data) {
      // Severity must be one of requested severities.
      TestValidator.predicate(
        "each error log severity must be within requested severities on first page",
        severities.includes(item.severity as (typeof severities)[number]),
      );

      // created_at must lie within [fromCreatedAt, toCreatedAt) using lexical comparison
      // for ISO-8601 timestamps.
      TestValidator.predicate(
        "each error log created_at must be within requested time window on first page",
        item.created_at >= fromCreatedAt && item.created_at < toCreatedAt,
      );
    }
  }

  // 6. Request second page with same filters to validate pagination mechanics.
  const secondPageIndex = 2;
  const secondRequestBody = {
    from_created_at: fromCreatedAt,
    to_created_at: toCreatedAt,
    error_severities: [...severities],
    page: secondPageIndex,
    limit,
    order_by_created_at_desc: true,
  } satisfies ICommunityPlatformErrorLog.IRequest;

  const secondPage: IPageICommunityPlatformErrorLog.ISummary =
    await api.functional.communityPlatform.platformAdmin.analytics.errorLogs.index(
      connection,
      {
        body: secondRequestBody,
      },
    );
  typia.assert(secondPage);

  TestValidator.equals(
    "pagination.limit must match requested limit on second page",
    secondPage.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "pagination.current must equal requested page on second page",
    secondPage.pagination.current,
    secondPageIndex,
  );
  TestValidator.predicate(
    "pagination.records must be non-negative on second page",
    secondPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages must be non-negative on second page",
    secondPage.pagination.pages >= 0,
  );
}
