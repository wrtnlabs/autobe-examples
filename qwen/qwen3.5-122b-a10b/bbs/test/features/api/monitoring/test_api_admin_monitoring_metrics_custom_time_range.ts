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

export async function test_api_admin_monitoring_metrics_custom_time_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Retrieve monitoring metrics
  const metrics =
    await api.functional.discussionBoard.admin.monitoring.metrics(
      adminConnection,
    );
  typia.assert(metrics);
  // 3. Validate response structure
  TestValidator.predicate(
    "has authentication metrics",
    () => metrics.authentication !== undefined,
  );
  TestValidator.predicate(
    "has content metrics",
    () => metrics.content !== undefined,
  );
  TestValidator.predicate(
    "has performance metrics",
    () => metrics.performance !== undefined,
  );
  TestValidator.predicate(
    "has storage metrics",
    () => metrics.storage !== undefined,
  );
  TestValidator.predicate(
    "has time range",
    () => metrics.time_range !== undefined,
  );
  TestValidator.predicate(
    "has generated timestamp",
    () => metrics.generated_at !== undefined,
  );
  // 4. Validate authentication metrics structure
  TestValidator.predicate(
    "authentication has successful_logins",
    () => metrics.authentication.successful_logins >= 0,
  );
  TestValidator.predicate(
    "authentication has failed_logins",
    () => metrics.authentication.failed_logins >= 0,
  );
  TestValidator.predicate(
    "authentication has active_sessions",
    () => metrics.authentication.active_sessions >= 0,
  );
  TestValidator.predicate(
    "authentication has login_success_rate",
    () =>
      metrics.authentication.login_success_rate >= 0 &&
      metrics.authentication.login_success_rate <= 100,
  );
  TestValidator.predicate("authentication by_date is array", () =>
    Array.isArray(metrics.authentication.by_date),
  );
  // 5. Validate content metrics structure
  TestValidator.predicate(
    "content has articles_created",
    () => metrics.content.articles_created >= 0,
  );
  TestValidator.predicate(
    "content has comments_posted",
    () => metrics.content.comments_posted >= 0,
  );
  TestValidator.predicate(
    "content has files_uploaded",
    () => metrics.content.files_uploaded >= 0,
  );
  TestValidator.predicate(
    "content has images_uploaded",
    () => metrics.content.images_uploaded >= 0,
  );
  TestValidator.predicate("content by_date is array", () =>
    Array.isArray(metrics.content.by_date),
  );
  // 6. Validate performance metrics structure
  TestValidator.predicate(
    "performance has average_response_time_ms",
    () => metrics.performance.average_response_time_ms >= 0,
  );
  TestValidator.predicate(
    "performance has error_rate_percent",
    () =>
      metrics.performance.error_rate_percent >= 0 &&
      metrics.performance.error_rate_percent <= 100,
  );
  TestValidator.predicate(
    "performance has requests_per_second",
    () => metrics.performance.requests_per_second >= 0,
  );
  TestValidator.predicate(
    "performance has database_connections_active",
    () => metrics.performance.database_connections_active >= 0,
  );
  TestValidator.predicate(
    "performance has database_connections_max",
    () => metrics.performance.database_connections_max >= 0,
  );
  TestValidator.predicate("performance by_endpoint is array", () =>
    Array.isArray(metrics.performance.by_endpoint),
  );
  // 7. Validate storage metrics structure
  TestValidator.predicate(
    "storage has total_used_bytes",
    () => metrics.storage.total_used_bytes >= 0,
  );
  TestValidator.predicate(
    "storage has total_capacity_bytes",
    () => metrics.storage.total_capacity_bytes >= 0,
  );
  TestValidator.predicate(
    "storage has usage_percent",
    () =>
      metrics.storage.usage_percent >= 0 &&
      metrics.storage.usage_percent <= 100,
  );
  TestValidator.predicate(
    "storage has file_count",
    () => metrics.storage.file_count >= 0,
  );
  TestValidator.predicate(
    "storage has image_count",
    () => metrics.storage.image_count >= 0,
  );
  TestValidator.predicate(
    "storage has by_type",
    () => metrics.storage.by_type !== undefined,
  );
  // 8. Validate time range structure
  TestValidator.predicate(
    "time_range has start_time",
    () => metrics.time_range.start_time !== undefined,
  );
  TestValidator.predicate(
    "time_range has end_time",
    () => metrics.time_range.end_time !== undefined,
  );
  // 9. Validate alerts array exists
  TestValidator.predicate("alerts is array", () =>
    Array.isArray(metrics.alerts),
  );
}
