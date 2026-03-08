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

/**
 * Test administrator monitoring metrics alert thresholds.
 *
 * Validates that operational alerts are properly generated when monitored metrics
 * exceed configured thresholds. Tests the alert generation logic for:
 * - error_rate_percent > 5% triggers performance alert
 * - average_response_time_ms > 500ms triggers performance alert
 * - storage usage_percent > 80% triggers storage alert
 */
export async function test_api_admin_monitoring_metrics_alert_thresholds(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.discussionBoard.auth.admin.join(adminConnection, {
      body: {
        email: `admin.monitoring.${Date.now()}@test.com`,
        password: "SecurePass123!",
        display_name: "Monitoring Admin",
        bio: "Administrator for monitoring metrics testing",
        href: "https://test.com/admin/register",
        referrer: "https://test.com/admin",
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(adminAuth);
  // 2. Fetch monitoring metrics
  const metrics: IDiscussionBoardMonitoringMetric =
    await api.functional.discussionBoard.admin.monitoring.metrics(
      adminConnection,
    );
  typia.assert(metrics);
  // 3. Validate response structure
  typia.assert(metrics.authentication);
  typia.assert(metrics.content);
  typia.assert(metrics.performance);
  typia.assert(metrics.storage);
  typia.assert(metrics.time_range);
  // 4. Validate alerts array exists
  typia.assert(metrics.alerts);
  // 5. Validate each alert in the array has correct structure
  for (const alert of metrics.alerts) {
    typia.assert(alert);
  }
  // 6. Business logic validation - alerts are properly structured
  if (metrics.alerts.length > 0) {
    // Validate that alerts contain expected metric names when thresholds are breached
    const alertMetricNames = metrics.alerts.map((a) => a.metric_name);
    // If error_rate_percent triggered an alert, validate it exists
    if (metrics.performance.error_rate_percent > 5) {
      TestValidator.predicate(
        "error rate alert exists when threshold breached",
        alertMetricNames.includes("error_rate_percent"),
      );
    }
    // If average_response_time_ms triggered an alert, validate it exists
    if (metrics.performance.average_response_time_ms > 500) {
      TestValidator.predicate(
        "response time alert exists when threshold breached",
        alertMetricNames.includes("average_response_time_ms"),
      );
    }
    // If storage usage_percent triggered an alert, validate it exists
    if (metrics.storage.usage_percent > 80) {
      TestValidator.predicate(
        "storage alert exists when threshold breached",
        alertMetricNames.includes("usage_percent"),
      );
    }
  }
  // 7. Validate time_range structure
  typia.assert(metrics.time_range);
}
