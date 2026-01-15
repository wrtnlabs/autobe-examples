import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformModerationMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationMetrics";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_moderation_analytics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate as admin using the authorization utility function
  // This ensures proper token handling and isolation of admin context
  const authResponse = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(authResponse);
  // Step 3: Call the moderation analytics endpoint with the authenticated admin connection
  const metrics =
    await api.functional.communityPlatform.admin.analytics.moderation.metrics.index(
      adminConnection,
    );
  typia.assert(metrics);
  // Step 4: Validate critical metrics structure and types
  TestValidator.predicate(
    "totalModerationActions is a valid int32",
    metrics.totalModerationActions >= 0,
  );
  TestValidator.predicate(
    "totalReportsUnique is a valid int32",
    metrics.totalReportsUnique >= 0,
  );
  TestValidator.predicate(
    "totalModerationLogs is a valid int32",
    metrics.totalModerationLogs >= 0,
  );
  TestValidator.predicate(
    "totalReportTracking is a valid int32",
    metrics.totalReportTracking >= 0,
  );
  TestValidator.predicate(
    "totalRejectedReports is a valid int32",
    metrics.totalRejectedReports >= 0,
  );
  TestValidator.predicate(
    "avgResolutionHours is non-negative",
    metrics.avgResolutionHours >= 0,
  );
  // Step 5: Confirm response matches expected ICommunityPlatformModerationMetrics schema
  // No need to validate individual formats as typia.assert() already validates all constraints (UUID, date-time, etc.)
  // Only business logic validation needed
}
