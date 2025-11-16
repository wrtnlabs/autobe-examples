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
 * Validate that the access traffic summary endpoint aggregates requests by HTTP
 * status code family in a logically consistent way for a platform admin.
 *
 * Business context: Platform administrators use access traffic analytics to
 * monitor overall request volume, understand the distribution of successful vs.
 * error responses, and correlate traffic patterns with operational events. The
 * /shoppingMall/platformAdmin/analytics/logging/accessTrafficSummary endpoint
 * provides an aggregated view of access logs grouped by multiple dimensions,
 * including HTTP status code families (2xx, 3xx, 4xx, 5xx).
 *
 * This test focuses on structural and logical consistency of the aggregation
 * instead of exact cardinality, because this e2e suite does not have direct
 * control over all traffic contributing to shopping_mall_access_logs.
 *
 * Steps:
 *
 * 1. Join as a new platform admin via POST /auth/platformAdmin/join. This
 *    bootstraps admin identity and configures the SDK connection with a valid
 *    Authorization header for platform admin analytics calls.
 * 2. Construct a broad IShoppingMallAccessTrafficSummary.IRequest that:
 *
 *    - Covers a recent time window (for example, the last hour) using an
 *         IShoppingMallAnalyticsTimeRange with ISO 8601 date-time strings.
 *    - Leaves routePrefixes, httpMethods, statusCodeFamilies, regions, and
 *         actorTypes as null, meaning no filtering on these dimensions.
 *    - Sets timeBucket to a valid granularity value such as "hour".
 * 3. Call PATCH /shoppingMall/platformAdmin/analytics/logging/accessTrafficSummary
 *    via
 *    api.functional.shoppingMall.platformAdmin.analytics.logging.accessTrafficSummary.index.
 * 4. Use typia.assert to guarantee that the response conforms exactly to
 *    IShoppingMallAccessTrafficSummary.
 * 5. Perform logical validations over the aggregated fields, including:
 *
 *    - TotalRequests is a non-negative integer.
 *    - Each requestCount in requestsByStatusCodeFamily is non-negative.
 *    - The sum of all requestsByStatusCodeFamily.requestCount is non-negative and
 *         not greater than totalRequests (to tolerate implementation-specific
 *         filtering or sampling while ensuring basic consistency).
 *    - If a bucket exists for a statusCodeFamily of "2xx", "4xx", or "5xx", its
 *         requestCount must be strictly positive, i.e., presence of the bucket
 *         implies observed traffic for that family.
 *    - For other aggregations (requestsByHttpMethod, requestsByRoutePattern,
 *         requestsByActorType, requestsOverTime), each requestCount must be
 *         non-negative.
 * 6. Cross-check that the sum of requestCount across requestsOverTime is
 *    non-negative and not greater than totalRequests, ensuring time-bucketed
 *    totals are coherent with the overall totalRequests.
 *
 * This test does not attempt to generate specific 2xx/4xx traffic volumes,
 * because only join and summary endpoints are available in this context.
 * Instead, it validates that whatever data the backend returns is internally
 * consistent and respects the status code family aggregation contract.
 */
export async function test_api_platform_admin_access_traffic_summary_status_code_family_distribution(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin (also sets Authorization header internally)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://shoppingmall.example.com",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Build a time range for the last hour
  const now = new Date();
  const oneHourMs = 60 * 60 * 1000;
  const startDate = new Date(now.getTime() - oneHourMs);
  const timeRange: IShoppingMallAnalyticsTimeRange = {
    start: startDate.toISOString(),
    end: now.toISOString(),
  };

  const requestBody = {
    timeRange,
    routePrefixes: null,
    httpMethods: null,
    statusCodeFamilies: null,
    regions: null,
    actorTypes: null,
    timeBucket: "hour" as IShoppingMallAnalyticsTimeBucketOption,
  } satisfies IShoppingMallAccessTrafficSummary.IRequest;

  // 3. Call the access traffic summary endpoint
  const summary =
    await api.functional.shoppingMall.platformAdmin.analytics.logging.accessTrafficSummary.index(
      connection,
      { body: requestBody },
    );
  typia.assert<IShoppingMallAccessTrafficSummary>(summary);

  // 4. Basic sanity checks on totalRequests
  TestValidator.predicate(
    "totalRequests is non-negative",
    () => summary.totalRequests >= 0,
  );

  // 5. Validate requestsByStatusCodeFamily
  const totalByFamily = summary.requestsByStatusCodeFamily.reduce(
    (acc, bucket) => acc + bucket.requestCount,
    0,
  );

  TestValidator.predicate(
    "sum of status code family requestCounts is non-negative",
    () => totalByFamily >= 0,
  );

  TestValidator.predicate(
    "sum of status code family requestCounts does not exceed totalRequests",
    () => totalByFamily <= summary.totalRequests,
  );

  const has2xx = summary.requestsByStatusCodeFamily.find(
    (b) => b.statusCodeFamily === "2xx",
  );
  if (has2xx)
    TestValidator.predicate(
      "2xx bucket, when present, has positive requestCount",
      () => has2xx.requestCount > 0,
    );

  const has4xx = summary.requestsByStatusCodeFamily.find(
    (b) => b.statusCodeFamily === "4xx",
  );
  if (has4xx)
    TestValidator.predicate(
      "4xx bucket, when present, has positive requestCount",
      () => has4xx.requestCount > 0,
    );

  const has5xx = summary.requestsByStatusCodeFamily.find(
    (b) => b.statusCodeFamily === "5xx",
  );
  if (has5xx)
    TestValidator.predicate(
      "5xx bucket, when present, has positive requestCount",
      () => has5xx.requestCount > 0,
    );

  // Ensure all family buckets have non-negative counts
  for (const bucket of summary.requestsByStatusCodeFamily)
    TestValidator.predicate(
      `statusCodeFamily bucket ${bucket.statusCodeFamily} has non-negative requestCount`,
      () => bucket.requestCount >= 0,
    );

  // 6. Validate other aggregations
  for (const bucket of summary.requestsByHttpMethod)
    TestValidator.predicate(
      `httpMethod bucket ${bucket.httpMethod} has non-negative requestCount`,
      () => bucket.requestCount >= 0,
    );

  for (const bucket of summary.requestsByRoutePattern)
    TestValidator.predicate(
      `routePattern bucket ${bucket.routePattern} has non-negative requestCount`,
      () => bucket.requestCount >= 0,
    );

  for (const bucket of summary.requestsByActorType)
    TestValidator.predicate(
      `actorType bucket ${bucket.actorType} has non-negative requestCount`,
      () => bucket.requestCount >= 0,
    );

  const totalOverTime = summary.requestsOverTime.reduce(
    (acc, bucket) => acc + bucket.requestCount,
    0,
  );

  TestValidator.predicate(
    "sum of requestsOverTime requestCounts is non-negative",
    () => totalOverTime >= 0,
  );

  TestValidator.predicate(
    "sum of requestsOverTime requestCounts does not exceed totalRequests",
    () => totalOverTime <= summary.totalRequests,
  );
}
