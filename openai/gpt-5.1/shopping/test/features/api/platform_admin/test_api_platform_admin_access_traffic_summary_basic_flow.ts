import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEShoppingMallHttpMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IEShoppingMallHttpMethod";
import type { IEShoppingMallStatusCodeFamily } from "@ORGANIZATION/PROJECT-api/lib/structures/IEShoppingMallStatusCodeFamily";
import type { IShoppingMallAccessTrafficSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccessTrafficSummary";
import type { IShoppingMallAccessTrafficSummaryByActorType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccessTrafficSummaryByActorType";
import type { IShoppingMallAccessTrafficSummaryByHttpMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccessTrafficSummaryByHttpMethod";
import type { IShoppingMallAccessTrafficSummaryByRoutePattern } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccessTrafficSummaryByRoutePattern";
import type { IShoppingMallAccessTrafficSummaryByStatusCodeFamily } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccessTrafficSummaryByStatusCodeFamily";
import type { IShoppingMallAccessTrafficSummaryTimeBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccessTrafficSummaryTimeBucket";
import type { IShoppingMallAnalyticsTimeBucketOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsTimeBucketOption";
import type { IShoppingMallAnalyticsTimeRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsTimeRange";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Basic happy-path flow for platform admin access traffic summary analytics.
 *
 * This test verifies that a freshly joined platform administrator can call the
 * access traffic analytics endpoint and receive a coherent aggregated summary
 * over a recent time window.
 *
 * High-level steps:
 *
 * 1. Join as a new platform administrator via /auth/platformAdmin/join. This also
 *    establishes an authenticated session and writes auth/access logs.
 * 2. Construct a recent time window around the current time (e.g. last 15 minutes)
 *    using ISO 8601 date-time strings.
 * 3. Call PATCH /shoppingMall/platformAdmin/analytics/logging/accessTrafficSummary
 *    with a body that:
 *
 *    - Sets timeRange to the recent window,
 *    - Leaves routePrefixes, httpMethods, statusCodeFamilies, regions, actorTypes as
 *         null so that all traffic is included,
 *    - Sets timeBucket to "hour".
 * 4. Assert that the response is a valid IShoppingMallAccessTrafficSummary using
 *    typia.assert.
 * 5. Perform sanity checks on the payload:
 *
 *    - TimeRange.start < timeRange.end,
 *    - TotalRequests and uniqueClientCount are >= 0,
 *    - Aggregated requestCount from requestsByHttpMethod and
 *         requestsByStatusCodeFamily are not less than totalRequests,
 *    - If totalRequests > 0 then requestsOverTime has at least one bucket with
 *         requestCount > 0 and its total is not less than totalRequests.
 */
export async function test_api_platform_admin_access_traffic_summary_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin; this will also set Authorization header.
  const adminJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.test/console" as string &
      tags.Format<"uri">,
    referrer: "https://shoppingmall.test/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert(admin);

  // 2. Build a recent time window around now (e.g. last 15 minutes).
  const endDate: Date = new Date();
  const startDate: Date = new Date(endDate.getTime() - 15 * 60 * 1000);

  const timeRange: IShoppingMallAnalyticsTimeRange = {
    start: endDate.toISOString() as string & tags.Format<"date-time">,
    end: startDate.toISOString() as string & tags.Format<"date-time">,
  };

  // 3. Build request body for accessTrafficSummary with broad filters and hour bucket.
  const requestBody = {
    timeRange,
    routePrefixes: null,
    httpMethods: null,
    statusCodeFamilies: null,
    regions: null,
    actorTypes: null,
    timeBucket: "hour" as IShoppingMallAnalyticsTimeBucketOption,
  } satisfies IShoppingMallAccessTrafficSummary.IRequest;

  const summary: IShoppingMallAccessTrafficSummary =
    await api.functional.shoppingMall.platformAdmin.analytics.logging.accessTrafficSummary.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(summary);

  // 4. Sanity checks on timeRange ordering and overlap with requested window.
  TestValidator.predicate("summary timeRange.start is before end", () => {
    const start = new Date(summary.timeRange.start).getTime();
    const end = new Date(summary.timeRange.end).getTime();
    return start < end;
  });

  TestValidator.predicate("summary timeRange overlaps requested", () => {
    const reqStart = new Date(timeRange.start).getTime();
    const reqEnd = new Date(timeRange.end).getTime();
    const sumStart = new Date(summary.timeRange.start).getTime();
    const sumEnd = new Date(summary.timeRange.end).getTime();
    return sumStart < reqEnd && sumEnd > reqStart;
  });

  // 5. Non-negative totals.
  TestValidator.predicate(
    "totalRequests is non-negative",
    summary.totalRequests >= 0,
  );
  TestValidator.predicate(
    "uniqueClientCount is non-negative",
    summary.uniqueClientCount >= 0,
  );

  // 6. Aggregated method/status counts are consistent with totalRequests.
  const totalByMethod = summary.requestsByHttpMethod.reduce(
    (acc: number, bucket: IShoppingMallAccessTrafficSummaryByHttpMethod) =>
      acc + bucket.requestCount,
    0,
  );
  const totalByStatus = summary.requestsByStatusCodeFamily.reduce(
    (
      acc: number,
      bucket: IShoppingMallAccessTrafficSummaryByStatusCodeFamily,
    ) => acc + bucket.requestCount,
    0,
  );

  TestValidator.predicate(
    "aggregate method counts not less than totalRequests",
    totalByMethod >= summary.totalRequests,
  );
  TestValidator.predicate(
    "aggregate status counts not less than totalRequests",
    totalByStatus >= summary.totalRequests,
  );

  // 7. When there is traffic, requestsOverTime should have non-zero buckets.
  if (summary.totalRequests > 0) {
    const nonZeroBuckets = summary.requestsOverTime.filter(
      (bucket: IShoppingMallAccessTrafficSummaryTimeBucket) =>
        bucket.requestCount > 0,
    );

    TestValidator.predicate(
      "at least one time bucket has non-zero requestCount when there is traffic",
      nonZeroBuckets.length > 0,
    );

    const totalOverTime = summary.requestsOverTime.reduce(
      (acc: number, bucket: IShoppingMallAccessTrafficSummaryTimeBucket) =>
        acc + bucket.requestCount,
      0,
    );

    TestValidator.predicate(
      "sum of requestsOverTime buckets not less than totalRequests",
      totalOverTime >= summary.totalRequests,
    );
  }
}
