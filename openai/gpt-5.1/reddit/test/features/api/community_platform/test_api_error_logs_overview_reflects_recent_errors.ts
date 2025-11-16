import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformErrorLogEnvironmentBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformErrorLogEnvironmentBucket";
import type { ICommunityPlatformErrorLogOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformErrorLogOverview";
import type { ICommunityPlatformErrorLogSample } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformErrorLogSample";
import type { ICommunityPlatformErrorLogServiceOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformErrorLogServiceOverview";
import type { ICommunityPlatformErrorLogSeverityBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformErrorLogSeverityBucket";

/**
 * Verify that the admin error log analytical overview endpoint returns a
 * self-consistent, non-negative analytical snapshot for an authenticated admin
 * user.
 *
 * Business context: The community platform exposes
 * community_platform_error_logs as the backing store for technical error
 * events. Admin users need an aggregated overview for observability dashboards
 * without querying raw logs. The GET
 * /communityPlatform/adminUser/errorLogs/overview endpoint provides this
 * dashboard-level snapshot as ICommunityPlatformErrorLogOverview, including
 * totalErrorCount, severityBreakdown, topServices, environmentBreakdown, and
 * optional recentErrorSamples.
 *
 * This test validates that, after creating and authenticating an adminUser, the
 * overview endpoint is callable and returns an object whose internal counters
 * are logically consistent (no negative counts, buckets do not exceed totals,
 * and per-service totals do not exceed the global total). Since the SDK does
 * not expose a way to deterministically generate or inspect raw error log rows,
 * the test focuses on invariants and is tolerant of a zero-error scenario.
 *
 * Steps:
 *
 * 1. Create and authenticate an adminUser via POST /auth/adminUser/join.
 *
 *    - Use random but structurally valid username, email, and password
 *         (ICommunityPlatformAdminUserJoin.IRequest).
 *    - Assert the returned ICommunityPlatformAdminuser.IAuthorized and rely on the
 *         SDK to attach the access token to the connection.
 * 2. Call GET /communityPlatform/adminUser/errorLogs/overview using the
 *    authenticated connection.
 *
 *    - Assert the response as ICommunityPlatformErrorLogOverview.
 * 3. Validate time window semantics.
 *
 *    - Ensure overview.window.from and overview.window.to form a chronologically
 *         ordered interval (from <= to) when interpreted as Date instances.
 * 4. Validate aggregate counters and breakdowns.
 *
 *    - TotalErrorCount >= 0.
 *    - For each severity bucket in severityBreakdown:
 *
 *         - Bucket.count >= 0.
 *         - Bucket.count <= totalErrorCount.
 *    - For each environment bucket in environmentBreakdown:
 *
 *         - Bucket.count >= 0.
 *         - Bucket.count <= totalErrorCount.
 *    - For each service in topServices:
 *
 *         - Service.totalErrorCount >= 0.
 *         - If service.severityBreakdown exists, the sum of its bucket.count values <=
 *                   service.totalErrorCount.
 *         - If service.environmentBreakdown exists, the sum of its bucket.count values <=
 *                   service.totalErrorCount.
 * 5. Cross-check per-service vs global totals.
 *
 *    - Sum all service.totalErrorCount values in topServices and assert that this
 *         sum is <= overview.totalErrorCount (because topServices is
 *         conceptually a truncated view of all services).
 * 6. Validate optional recentErrorSamples if present.
 *
 *    - If recentErrorSamples is undefined or empty, no extra checks.
 *    - Otherwise, for each sample:
 *
 *         - Confirm that sample.occurredAt is within the [from, to) interval when parsed
 *                   as Date.
 *         - Confirm that sample.serviceName, sample.environment, and sample.severity are
 *                   non-empty strings, indicating usable metadata.
 * 7. Do not attempt to synthesize or force error log rows.
 *
 *    - The test does not rely on generating new error log entries or verifying exact
 *         deltas in totalErrorCount; instead it focuses on structural
 *         correctness and logical invariants that must hold for any valid
 *         overview payload.
 */
export async function test_api_error_logs_overview_reflects_recent_errors(
  connection: api.IConnection,
) {
  // 1. Create and authenticate an adminUser
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Fetch the error log overview as the authenticated admin
  const overview: ICommunityPlatformErrorLogOverview =
    await api.functional.communityPlatform.adminUser.errorLogs.overview.index(
      connection,
    );
  typia.assert<ICommunityPlatformErrorLogOverview>(overview);

  // 3. Validate time window semantics
  const fromDate = new Date(overview.window.from);
  const toDate = new Date(overview.window.to);

  TestValidator.predicate(
    "error log overview window.from must not be after window.to",
    fromDate.getTime() <= toDate.getTime(),
  );

  // 4. Validate aggregate counters and breakdowns
  TestValidator.predicate(
    "totalErrorCount should be non-negative",
    overview.totalErrorCount >= 0,
  );

  let severityTotal = 0;
  for (const bucket of overview.severityBreakdown) {
    severityTotal += bucket.count;
    TestValidator.predicate(
      "severity bucket count should be non-negative",
      bucket.count >= 0,
    );
    TestValidator.predicate(
      "severity bucket count should not exceed totalErrorCount",
      bucket.count <= overview.totalErrorCount,
    );
  }

  let environmentTotal = 0;
  for (const envBucket of overview.environmentBreakdown) {
    environmentTotal += envBucket.count;
    TestValidator.predicate(
      "environment bucket count should be non-negative",
      envBucket.count >= 0,
    );
    TestValidator.predicate(
      "environment bucket count should not exceed totalErrorCount",
      envBucket.count <= overview.totalErrorCount,
    );
  }

  // 5. Cross-check per-service vs global totals
  let topServicesTotal = 0;
  for (const service of overview.topServices) {
    topServicesTotal += service.totalErrorCount;

    TestValidator.predicate(
      "service totalErrorCount should be non-negative",
      service.totalErrorCount >= 0,
    );

    if (service.severityBreakdown !== undefined) {
      let serviceSeverityTotal = 0;
      for (const bucket of service.severityBreakdown) {
        serviceSeverityTotal += bucket.count;
        TestValidator.predicate(
          "service severity bucket count should be non-negative",
          bucket.count >= 0,
        );
      }
      TestValidator.predicate(
        "sum of service severity buckets should not exceed service totalErrorCount",
        serviceSeverityTotal <= service.totalErrorCount,
      );
    }

    if (service.environmentBreakdown !== undefined) {
      let serviceEnvironmentTotal = 0;
      for (const envBucket of service.environmentBreakdown) {
        serviceEnvironmentTotal += envBucket.count;
        TestValidator.predicate(
          "service environment bucket count should be non-negative",
          envBucket.count >= 0,
        );
      }
      TestValidator.predicate(
        "sum of service environment buckets should not exceed service totalErrorCount",
        serviceEnvironmentTotal <= service.totalErrorCount,
      );
    }
  }

  TestValidator.predicate(
    "sum of top service totalErrorCount values should not exceed global totalErrorCount",
    topServicesTotal <= overview.totalErrorCount,
  );

  // 6. Validate optional recentErrorSamples if present
  if (overview.recentErrorSamples !== undefined) {
    for (const sample of overview.recentErrorSamples) {
      const occurredAt = new Date(sample.occurredAt);
      TestValidator.predicate(
        "recentErrorSample.occurredAt should be within overview window",
        occurredAt.getTime() >= fromDate.getTime() &&
          occurredAt.getTime() < toDate.getTime(),
      );

      TestValidator.predicate(
        "recentErrorSample.serviceName should be non-empty",
        sample.serviceName.length > 0,
      );
      TestValidator.predicate(
        "recentErrorSample.environment should be non-empty",
        sample.environment.length > 0,
      );
      TestValidator.predicate(
        "recentErrorSample.severity should be non-empty",
        sample.severity.length > 0,
      );
    }
  }
}
