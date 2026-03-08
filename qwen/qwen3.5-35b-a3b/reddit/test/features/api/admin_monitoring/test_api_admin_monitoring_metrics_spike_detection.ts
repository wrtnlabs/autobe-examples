import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformMonitoringMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMonitoringMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_monitoring_metrics_spike_detection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "adminPassword123",
      username: "test_admin_spike",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuthorized);
  // 2. Get metrics with authenticated admin connection
  const metrics: IRedditPlatformMonitoringMetric =
    await api.functional.redditPlatform.admin.monitoring.metrics.getMetrics({
      ...adminConnection,
      headers: {
        Authorization: adminAuthorized.token.access,
      },
    });
  // 3. Verify uptime and availability percentage are present
  TestValidator.predicate(
    "uptime is boolean",
    typeof metrics.uptime === "boolean",
  );
  TestValidator.predicate(
    "availabilityPercentage is number",
    typeof metrics.availabilityPercentage === "number",
  );
  TestValidator.equals(
    "availabilityPercentage range",
    metrics.availabilityPercentage >= 0 &&
      metrics.availabilityPercentage <= 100,
    true,
  );
  // 4. Verify activeUsers and entity counts are non-negative integers
  TestValidator.equals(
    "activeUsers is non-negative",
    metrics.activeUsers >= 0,
    true,
  );
  TestValidator.equals("posts is non-negative", metrics.posts >= 0, true);
  TestValidator.equals("comments is non-negative", metrics.comments >= 0, true);
  TestValidator.equals(
    "communities is non-negative",
    metrics.communities >= 0,
    true,
  );
  // 5. Verify errorCount is non-negative
  TestValidator.equals(
    "errorCount is non-negative",
    metrics.errorCount >= 0,
    true,
  );
  // 6. Verify averageResponseTimeMs is non-negative
  TestValidator.equals(
    "averageResponseTimeMs is non-negative",
    metrics.averageResponseTimeMs >= 0,
    true,
  );
  // 7. Verify reportsPerHour is non-negative
  TestValidator.equals(
    "reportsPerHour is non-negative",
    metrics.reportsPerHour >= 0,
    true,
  );
  // 8. Verify hasSpike is boolean
  TestValidator.predicate(
    "hasSpike is boolean",
    typeof metrics.hasSpike === "boolean",
  );
  // 9. Verify spike detection logic: hasSpike should be true when reportsPerHour > 500
  // This is the core spike detection validation
  const expectedHasSpike = metrics.reportsPerHour > 500;
  TestValidator.equals(
    "hasSpike matches spike threshold",
    metrics.hasSpike,
    expectedHasSpike,
  );
  // 10. Verify authentication metrics are non-negative
  TestValidator.equals(
    "successfulLogins is non-negative",
    metrics.successfulLogins >= 0,
    true,
  );
  TestValidator.equals(
    "failedLogins is non-negative",
    metrics.failedLogins >= 0,
    true,
  );
  // 11. Verify deletion metrics are non-negative
  TestValidator.equals(
    "postsDeleted is non-negative",
    metrics.postsDeleted >= 0,
    true,
  );
  TestValidator.equals(
    "commentsDeleted is non-negative",
    metrics.commentsDeleted >= 0,
    true,
  );
  // 12. Verify subscription metrics are non-negative
  TestValidator.equals(
    "newSubscriptions is non-negative",
    metrics.newSubscriptions >= 0,
    true,
  );
  TestValidator.equals(
    "cancelledSubscriptions is non-negative",
    metrics.cancelledSubscriptions >= 0,
    true,
  );
  // 13. Verify retentionDays is exactly 30 as per specification
  TestValidator.equals("retentionDays is 30", metrics.retentionDays, 30);
}
