import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMonitoringMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMonitoringMetric";
import type { IDiscussionBoardMonitoringMetricAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMonitoringMetricAlert";
import type { IDiscussionBoardMonitoringMetricAuthenticationByDate } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMonitoringMetricAuthenticationByDate";
import type { IDiscussionBoardMonitoringMetricContentByDate } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMonitoringMetricContentByDate";
import type { IDiscussionBoardMonitoringMetricPerformanceByEndpoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMonitoringMetricPerformanceByEndpoint";
import type { IDiscussionBoardMonitoringMetricStorageByType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMonitoringMetricStorageByType";
import type { IDiscussionBoardMonitoringMetricTimeRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMonitoringMetricTimeRange";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_monitoring_metrics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create new connection with admin token for API calls
  const adminApiConnection: api.IConnection = { host: connection.host };
  adminApiConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 3. Retrieve monitoring metrics
  const metrics =
    await api.functional.discussionBoard.admin.monitoring.metrics(
      adminApiConnection,
    );
  typia.assert(metrics);
  // 4. Validate business logic - metrics should have reasonable values
  TestValidator.predicate(
    "login success rate is between 0 and 100",
    metrics.authentication.login_success_rate >= 0 &&
      metrics.authentication.login_success_rate <= 100,
  );
  TestValidator.predicate(
    "error rate is between 0 and 100",
    metrics.performance.error_rate_percent >= 0 &&
      metrics.performance.error_rate_percent <= 100,
  );
  TestValidator.predicate(
    "storage usage is between 0 and 100",
    metrics.storage.usage_percent >= 0 && metrics.storage.usage_percent <= 100,
  );
  TestValidator.predicate(
    "storage capacity is positive",
    metrics.storage.total_capacity_bytes > 0,
  );
  TestValidator.predicate(
    "time range end is after start",
    new Date(metrics.time_range.end_time) >=
      new Date(metrics.time_range.start_time),
  );
  TestValidator.predicate(
    "generated_at is recent timestamp",
    new Date(metrics.generated_at) <= new Date(),
  );
}
