import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallLoggingPerformanceIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallLoggingPerformanceIncident";
import type { IShoppingMallLoggingPerformanceIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLoggingPerformanceIncident";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Basic platform admin performance incident report query.
 *
 * This test verifies that a platform administrator can authenticate and
 * successfully query the performance incident reporting endpoint with simple
 * time-range and pagination parameters, and that the response respects type
 * contracts, pagination semantics, sorting order, and idempotent read
 * behaviour.
 *
 * Business flow:
 *
 * 1. Register a new platform admin using POST /auth/platformAdmin/join and obtain
 *    an authorized session (SDK will set Authorization header).
 * 2. Build a basic IShoppingMallLoggingPerformanceIncident.IRequest search body:
 *
 *    - "from" and "to" define a small recent time window as ISO 8601 date-time
 *         strings.
 *    - Optional filters (incidentTypes, severities, serviceNames, endpointPaths,
 *         minDurationMs, maxDurationMs, search) are omitted to exercise default
 *         behaviour.
 *    - Provide pagination fields (page, limit) and ordering (orderBy =
 *         "detected_at", orderDirection = "desc").
 * 3. Call PATCH /shoppingMall/platformAdmin/reports/logging/performanceIncidents
 *    via api.functional.shoppingMall.platformAdmin.reports.logging
 *    .performanceIncidents.index.
 * 4. Assert that the response conforms to
 *    IPageIShoppingMallLoggingPerformanceIncident.ISummary using typia.assert.
 * 5. Validate pagination consistency:
 *
 *    - Pagination.limit should equal the requested limit (subject to any server-side
 *         caps we cannot see).
 *    - Pagination.current must be >= 0.
 *    - Data.length must be <= pagination.limit.
 *    - Pagination.records must be >= data.length.
 *    - When records === 0, pages should be 0 and data must be empty.
 * 6. When data is non-empty, validate each performance incident summary:
 *
 *    - Has non-empty id, detected_at, severity, category, source_type,
 *         source_identifier, metric_name, unit, status.
 *    - Detected_at is within the requested time window (from <= detected_at < to).
 * 7. Still for non-empty data, validate sort order by detected_at desc:
 *
 *    - Each subsequent incident.detected_at is less than or equal to the previous
 *         one.
 * 8. Re-issue the same query with identical request body, then assert that the
 *    second response is deeply equal to the first via TestValidator.equals to
 *    confirm idempotent read-only behaviour.
 */
export async function test_api_platform_admin_performance_incident_report_basic_query(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin (dependencies: POST /auth/platformAdmin/join)
  const joinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Build a basic performance incident search request
  const now = new Date();
  const to = now.toISOString() as string & tags.Format<"date-time">;
  const fromDate = new Date(now.getTime() - 60 * 60 * 1000); // last 1 hour
  const from = fromDate.toISOString() as string & tags.Format<"date-time">;

  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 20 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const requestBody = {
    from,
    to,
    page,
    limit,
    orderBy: "detected_at",
    orderDirection: "desc",
  } satisfies IShoppingMallLoggingPerformanceIncident.IRequest;

  // 3. Call performance incidents index endpoint
  const firstPage: IPageIShoppingMallLoggingPerformanceIncident.ISummary =
    await api.functional.shoppingMall.platformAdmin.reports.logging.performanceIncidents.index(
      connection,
      { body: requestBody },
    );
  typia.assert<IPageIShoppingMallLoggingPerformanceIncident.ISummary>(
    firstPage,
  );

  const pagination: IPage.IPagination = firstPage.pagination;
  const data: IShoppingMallLoggingPerformanceIncident.ISummary[] =
    firstPage.data;

  // 5. Validate pagination consistency
  TestValidator.predicate(
    "pagination.current is non-negative",
    pagination.current >= 0,
  );

  TestValidator.predicate(
    "data length does not exceed pagination.limit",
    data.length <= pagination.limit,
  );

  TestValidator.predicate(
    "pagination.records is not less than data length",
    pagination.records >= data.length,
  );

  if (pagination.records === 0) {
    TestValidator.equals("no records implies zero pages", pagination.pages, 0);
    TestValidator.equals("no records implies empty data array", data.length, 0);
  } else {
    TestValidator.predicate(
      "positive records implies at least one page",
      pagination.pages >= 1,
    );
  }

  // 6–7. When data exists, validate fields, time-range and sort order
  if (data.length > 0) {
    let previousDetectedAt: (string & tags.Format<"date-time">) | null = null;

    for (const incident of data) {
      typia.assert<IShoppingMallLoggingPerformanceIncident.ISummary>(incident);

      TestValidator.predicate(
        "incident.id is non-empty",
        incident.id.length > 0,
      );
      TestValidator.predicate(
        "incident.severity is non-empty",
        incident.severity.length > 0,
      );
      TestValidator.predicate(
        "incident.category is non-empty",
        incident.category.length > 0,
      );
      TestValidator.predicate(
        "incident.source_type is non-empty",
        incident.source_type.length > 0,
      );
      TestValidator.predicate(
        "incident.source_identifier is non-empty",
        incident.source_identifier.length > 0,
      );
      TestValidator.predicate(
        "incident.metric_name is non-empty",
        incident.metric_name.length > 0,
      );
      TestValidator.predicate(
        "incident.unit is non-empty",
        incident.unit.length > 0,
      );
      TestValidator.predicate(
        "incident.status is non-empty",
        incident.status.length > 0,
      );

      const detectedAtTime = new Date(incident.detected_at).getTime();
      const fromTime = new Date(from).getTime();
      const toTime = new Date(to).getTime();

      TestValidator.predicate(
        "incident.detected_at is on or after from",
        detectedAtTime >= fromTime,
      );
      TestValidator.predicate(
        "incident.detected_at is before to",
        detectedAtTime < toTime,
      );

      if (previousDetectedAt !== null) {
        const prev = new Date(previousDetectedAt).getTime();
        TestValidator.predicate(
          "incidents are sorted by detected_at desc",
          detectedAtTime <= prev,
        );
      }

      previousDetectedAt = incident.detected_at;
    }
  }

  // 8. Re-issue identical query to validate idempotency
  const secondPage: IPageIShoppingMallLoggingPerformanceIncident.ISummary =
    await api.functional.shoppingMall.platformAdmin.reports.logging.performanceIncidents.index(
      connection,
      { body: requestBody },
    );
  typia.assert<IPageIShoppingMallLoggingPerformanceIncident.ISummary>(
    secondPage,
  );

  TestValidator.equals(
    "repeated performance incident queries are idempotent",
    secondPage,
    firstPage,
  );
}
