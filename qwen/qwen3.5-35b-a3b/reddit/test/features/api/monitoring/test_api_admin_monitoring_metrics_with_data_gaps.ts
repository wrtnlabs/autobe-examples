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

export async function test_api_admin_monitoring_metrics_with_data_gaps(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create a fresh connection for authenticated admin requests
  const authenticatedAdminConnection: api.IConnection = {
    host: connection.host,
  };
  authenticatedAdminConnection.headers = {
    Authorization: adminAuth.token.access,
  };
  // 3. Get monitoring metrics
  const metrics =
    await api.functional.redditPlatform.admin.monitoring.metrics.getMetrics(
      authenticatedAdminConnection,
    );
  typia.assert(metrics);
  // 4. Validate integer fields return 0 when no data exists
  TestValidator.equals("activeUsers is 0 when no data", metrics.activeUsers, 0);
  TestValidator.equals("posts is 0 when no data", metrics.posts, 0);
  TestValidator.equals("comments is 0 when no data", metrics.comments, 0);
  TestValidator.equals("communities is 0 when no data", metrics.communities, 0);
  TestValidator.equals("errorCount is 0 when no data", metrics.errorCount, 0);
  TestValidator.equals(
    "successfulLogins is 0 when no data",
    metrics.successfulLogins,
    0,
  );
  TestValidator.equals(
    "failedLogins is 0 when no data",
    metrics.failedLogins,
    0,
  );
  TestValidator.equals(
    "postsDeleted is 0 when no data",
    metrics.postsDeleted,
    0,
  );
  TestValidator.equals(
    "commentsDeleted is 0 when no data",
    metrics.commentsDeleted,
    0,
  );
  TestValidator.equals(
    "newSubscriptions is 0 when no data",
    metrics.newSubscriptions,
    0,
  );
  TestValidator.equals(
    "cancelledSubscriptions is 0 when no data",
    metrics.cancelledSubscriptions,
    0,
  );
  // 5. Verify numeric fields return valid numbers (not null)
  TestValidator.predicate(
    "availabilityPercentage is a valid number",
    typeof metrics.availabilityPercentage === "number",
  );
  TestValidator.predicate(
    "averageResponseTimeMs is a valid number",
    typeof metrics.averageResponseTimeMs === "number",
  );
  TestValidator.predicate(
    "reportsPerHour is a valid number",
    typeof metrics.reportsPerHour === "number",
  );
  // 6. Validate uptime reflects actual system status
  TestValidator.predicate(
    "uptime is a boolean",
    typeof metrics.uptime === "boolean",
  );
  // 7. Validate retentionDays returns 30
  TestValidator.equals("retentionDays is 30", metrics.retentionDays, 30);
  // 8. Ensure hasSpike evaluates to false when reportsPerHour is low or zero
  TestValidator.equals(
    "hasSpike is false when low reports",
    metrics.hasSpike,
    false,
  );
}
