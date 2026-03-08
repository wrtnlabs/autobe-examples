import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReportMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReportMetric";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformReportMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_reports_metrics_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: RandomGenerator.alphaNumeric(15),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Call metrics endpoint with default pagination (empty body)
  const response =
    await api.functional.redditPlatform.admin.reports.metrics.index(
      adminConnection,
      {
        body: {} satisfies IRedditPlatformReportMetric.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination structure
  const pagination = response.pagination;
  TestValidator.equals("pagination.current is 1", pagination.current, 1);
  TestValidator.equals("pagination.limit is 20", pagination.limit, 20);
  TestValidator.predicate(
    "pagination.records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is calculated correctly",
    pagination.pages === Math.ceil(pagination.records / pagination.limit),
  );
  // 4. Validate each metric item has required fields
  for (const metric of response.data) {
    typia.assert(metric);
    // Validate community identification fields
    TestValidator.predicate(
      "community_id exists",
      metric.community_id !== null && metric.community_id !== undefined,
    );
    TestValidator.predicate(
      "community_id is UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        metric.community_id,
      ),
    );
    TestValidator.predicate(
      "community_name exists",
      metric.community_name !== null && metric.community_name !== undefined,
    );
    // Validate report counts
    TestValidator.predicate(
      "total_reports is non-negative",
      metric.total_reports >= 0,
    );
    TestValidator.predicate(
      "resolved_count is non-negative",
      metric.resolved_count >= 0,
    );
    TestValidator.predicate(
      "pending_count is non-negative",
      metric.pending_count >= 0,
    );
    TestValidator.predicate(
      "dismissed_count is non-negative",
      metric.dismissed_count >= 0,
    );
    // Validate resolution metrics
    TestValidator.predicate(
      "average_resolution_time is int32 or null",
      metric.average_resolution_time === null ||
        Number.isInteger(metric.average_resolution_time),
    );
    TestValidator.predicate(
      "resolution_rate is 0-100 or null",
      metric.resolution_rate === null ||
        (metric.resolution_rate >= 0 && metric.resolution_rate <= 100),
    );
    // Validate boolean flag
    TestValidator.predicate(
      "community_threshold_flag is boolean",
      typeof metric.community_threshold_flag === "boolean",
    );
    // Validate timestamps (can be null if no reports)
    if (metric.last_report_at !== null && metric.last_report_at !== undefined) {
      TestValidator.predicate(
        "last_report_at is valid date-time format",
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
          metric.last_report_at,
        ),
      );
    }
    if (metric.created_at !== null && metric.created_at !== undefined) {
      TestValidator.predicate(
        "created_at is valid date-time format",
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
          metric.created_at,
        ),
      );
    }
    // Validate resolved_by_id (can be null or UUID)
    if (metric.resolved_by_id !== null && metric.resolved_by_id !== undefined) {
      TestValidator.predicate(
        "resolved_by_id is UUID format",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          metric.resolved_by_id,
        ),
      );
    }
    // Ensure no reporter_id exposed (anonymization)
    const metricKeys = Object.keys(metric);
    const hasReporterId = metricKeys.some((key) =>
      key.toLowerCase().includes("reporter"),
    );
    TestValidator.predicate(
      "reporter identity anonymized",
      hasReporterId === false,
    );
  }
  // 5. Validate report counts consistency
  if (response.data.length > 0) {
    for (const metric of response.data) {
      TestValidator.equals(
        "total_reports equals sum of status counts",
        metric.total_reports,
        metric.resolved_count + metric.pending_count + metric.dismissed_count,
      );
    }
  }
}