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
 * Validate that an authenticated adminUser can retrieve an analytical overview
 * of recent error activity and that the payload structurally conforms to
 * ICommunityPlatformErrorLogOverview and nested DTOs.
 *
 * Business flow:
 *
 * 1. Register a new adminUser via POST /auth/adminUser/join with realistic random
 *    join data.
 * 2. Rely on the SDK to apply the Authorization header on the shared connection
 *    using the returned access token.
 * 3. Call GET /communityPlatform/adminUser/errorLogs/overview.
 * 4. Validate the response structure and basic business invariants, without
 *    testing type errors or HTTP status codes explicitly.
 */
export async function test_api_error_logs_overview_by_admin_user(
  connection: api.IConnection,
) {
  // 1. Register a new adminUser (join) to obtain an authorized context.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Call the error logs overview endpoint using the same connection
  //    (Authorization header is managed by SDK join()).
  const overview: ICommunityPlatformErrorLogOverview =
    await api.functional.communityPlatform.adminUser.errorLogs.overview.index(
      connection,
    );
  typia.assert<ICommunityPlatformErrorLogOverview>(overview);

  // 3. Basic window validation.
  TestValidator.predicate(
    "window.from should be non-empty string",
    overview.window.from.length > 0,
  );
  TestValidator.predicate(
    "window.to should be non-empty string",
    overview.window.to.length > 0,
  );

  // 4. totalErrorCount must be non-negative.
  TestValidator.predicate(
    "totalErrorCount should be non-negative",
    overview.totalErrorCount >= 0,
  );

  // 5. severityBreakdown: array present, each bucket valid.
  TestValidator.predicate(
    "severityBreakdown should be an array",
    Array.isArray(overview.severityBreakdown),
  );
  for (const bucket of overview.severityBreakdown) {
    typia.assert<ICommunityPlatformErrorLogSeverityBucket>(bucket);
    TestValidator.predicate(
      "severity bucket severity should be non-empty",
      bucket.severity.length > 0,
    );
    TestValidator.predicate(
      "severity bucket count should be non-negative",
      bucket.count >= 0,
    );
  }

  // 6. topServices: array present, each service overview valid.
  TestValidator.predicate(
    "topServices should be an array",
    Array.isArray(overview.topServices),
  );
  for (const service of overview.topServices) {
    typia.assert<ICommunityPlatformErrorLogServiceOverview>(service);
    TestValidator.predicate(
      "serviceName should be non-empty",
      service.serviceName.length > 0,
    );
    TestValidator.predicate(
      "service totalErrorCount should be non-negative",
      service.totalErrorCount >= 0,
    );

    if (service.severityBreakdown !== undefined) {
      TestValidator.predicate(
        "service.severityBreakdown should be an array when present",
        Array.isArray(service.severityBreakdown),
      );
      for (const sBucket of service.severityBreakdown) {
        typia.assert<ICommunityPlatformErrorLogSeverityBucket>(sBucket);
        TestValidator.predicate(
          "service severity bucket count should be non-negative",
          sBucket.count >= 0,
        );
      }
    }

    if (service.environmentBreakdown !== undefined) {
      TestValidator.predicate(
        "service.environmentBreakdown should be an array when present",
        Array.isArray(service.environmentBreakdown),
      );
      for (const eBucket of service.environmentBreakdown) {
        typia.assert<ICommunityPlatformErrorLogEnvironmentBucket>(eBucket);
        TestValidator.predicate(
          "service environment bucket count should be non-negative",
          eBucket.count >= 0,
        );
      }
    }
  }

  // 7. environmentBreakdown: array present, each bucket valid.
  TestValidator.predicate(
    "environmentBreakdown should be an array",
    Array.isArray(overview.environmentBreakdown),
  );
  for (const envBucket of overview.environmentBreakdown) {
    typia.assert<ICommunityPlatformErrorLogEnvironmentBucket>(envBucket);
    TestValidator.predicate(
      "environment name should be non-empty",
      envBucket.environment.length > 0,
    );
    TestValidator.predicate(
      "environment bucket count should be non-negative",
      envBucket.count >= 0,
    );
  }

  // 8. recentErrorSamples: optional; if present, validate each sample.
  if (overview.recentErrorSamples !== undefined) {
    TestValidator.predicate(
      "recentErrorSamples should be an array when present",
      Array.isArray(overview.recentErrorSamples),
    );
    for (const sample of overview.recentErrorSamples) {
      typia.assert<ICommunityPlatformErrorLogSample>(sample);
      TestValidator.predicate(
        "sample id should be non-empty",
        sample.id.length > 0,
      );
      TestValidator.predicate(
        "sample serviceName should be non-empty",
        sample.serviceName.length > 0,
      );
      TestValidator.predicate(
        "sample environment should be non-empty",
        sample.environment.length > 0,
      );
      TestValidator.predicate(
        "sample severity should be non-empty",
        sample.severity.length > 0,
      );
      TestValidator.predicate(
        "sample message should be non-empty",
        sample.message.length > 0,
      );
      TestValidator.predicate(
        "sample occurredAt should be non-empty",
        sample.occurredAt.length > 0,
      );
    }
  }
}
