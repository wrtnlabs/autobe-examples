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

export async function test_api_admin_monitoring_metrics_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoined = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123",
      username: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(adminJoined);
  // 2. Make metrics request with admin authorization
  const metricsConnection: api.IConnection = { host: connection.host };
  metricsConnection.headers = {
    Authorization: adminJoined.token.access,
  };
  const metrics =
    await api.functional.redditPlatform.admin.monitoring.metrics.getMetrics(
      metricsConnection,
    );
  typia.assert(metrics);
  // 3. Validate uptime is true for healthy system
  TestValidator.equals("uptime should be true", metrics.uptime, true);
  // 4. Validate availabilityPercentage is within 0-100 range
  TestValidator.predicate(
    "availabilityPercentage between 0 and 100",
    metrics.availabilityPercentage >= 0 &&
      metrics.availabilityPercentage <= 100,
  );
  // 5. Validate retentionDays equals 30 as specified
  TestValidator.equals("retentionDays should be 30", metrics.retentionDays, 30);
  // 6. Validate hasSpike reflects whether reportsPerHour exceeds 500 threshold
  const expectedHasSpike = metrics.reportsPerHour > 500;
  TestValidator.equals(
    "hasSpike should reflect reports threshold",
    metrics.hasSpike,
    expectedHasSpike,
  );
}
