import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunitySLOMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySLOMetric";
import type { IDailyReportVolume } from "@ORGANIZATION/PROJECT-api/lib/structures/IDailyReportVolume";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IModeratorWorkload } from "@ORGANIZATION/PROJECT-api/lib/structures/IModeratorWorkload";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import type { IResolutionRatePoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IResolutionRatePoint";
import type { ISLABreach } from "@ORGANIZATION/PROJECT-api/lib/structures/ISLABreach";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_slo_dashboard_granularity_aggregation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(16),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph(),
      avatar_url: typia.random<string & tags.Format<"uri">>() ?? null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Test SLO dashboard with three different granularity levels
  const hourlyData =
    await api.functional.redditPlatform.admin.reports.slo.dashboard(
      adminConnection,
      {
        body: {
          granularity: "hourly",
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(hourlyData);
  const dailyData =
    await api.functional.redditPlatform.admin.reports.slo.dashboard(
      adminConnection,
      {
        body: {
          granularity: "daily",
          startDate: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          endDate: new Date().toISOString(),
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(dailyData);
  const weeklyData =
    await api.functional.redditPlatform.admin.reports.slo.dashboard(
      adminConnection,
      {
        body: {
          granularity: "weekly",
          startDate: new Date(
            Date.now() - 8 * 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          endDate: new Date().toISOString(),
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(weeklyData);
  // 3. Validate time-series data structure for each granularity
  TestValidator.equals(
    "hourly resolution_rate matches daily_volume count",
    hourlyData.report_volume_trends.resolution_rate.length,
    hourlyData.report_volume_trends.daily_volume.length,
  );
  TestValidator.equals(
    "daily resolution_rate matches daily_volume count",
    dailyData.report_volume_trends.resolution_rate.length,
    dailyData.report_volume_trends.daily_volume.length,
  );
  TestValidator.equals(
    "weekly resolution_rate matches daily_volume count",
    weeklyData.report_volume_trends.resolution_rate.length,
    weeklyData.report_volume_trends.daily_volume.length,
  );
  // 4. Validate total report counts are consistent across granularities
  const hourlyTotal = hourlyData.report_volume_trends.daily_volume.reduce(
    (sum, entry) => sum + entry.count,
    0,
  );
  const dailyTotal = dailyData.report_volume_trends.daily_volume.reduce(
    (sum, entry) => sum + entry.count,
    0,
  );
  const weeklyTotal = weeklyData.report_volume_trends.daily_volume.reduce(
    (sum, entry) => sum + entry.count,
    0,
  );
  TestValidator.equals(
    "total report counts consistent across all granularities (hourly vs daily)",
    hourlyTotal,
    dailyTotal,
  );
  TestValidator.equals(
    "total report counts consistent across all granularities (daily vs weekly)",
    dailyTotal,
    weeklyTotal,
  );
  // 5. Validate SLA breach calculations exist and are valid
  TestValidator.equals(
    "hourly SLA breaches array exists and is array",
    Array.isArray(hourlyData.sla_breaches),
    true,
  );
  TestValidator.equals(
    "daily SLA breaches array exists and is array",
    Array.isArray(dailyData.sla_breaches),
    true,
  );
  TestValidator.equals(
    "weekly SLA breaches array exists and is array",
    Array.isArray(weeklyData.sla_breaches),
    true,
  );
  // 6. Validate community breakdowns are valid across granularities when present
  if (hourlyData.community_breakdown) {
    TestValidator.equals(
      "hourly community breakdown is array when present",
      Array.isArray(hourlyData.community_breakdown),
      true,
    );
    TestValidator.equals(
      "hourly community breakdown has valid SLA rate",
      hourlyData.community_breakdown.every(
        (metric) =>
          metric.sla_compliance_rate >= 0 && metric.sla_compliance_rate <= 100,
      ),
      true,
    );
  }
  if (dailyData.community_breakdown) {
    TestValidator.equals(
      "daily community breakdown is array when present",
      Array.isArray(dailyData.community_breakdown),
      true,
    );
    TestValidator.equals(
      "daily community breakdown has valid SLA rate",
      dailyData.community_breakdown.every(
        (metric) =>
          metric.sla_compliance_rate >= 0 && metric.sla_compliance_rate <= 100,
      ),
      true,
    );
  }
  if (weeklyData.community_breakdown) {
    TestValidator.equals(
      "weekly community breakdown is array when present",
      Array.isArray(weeklyData.community_breakdown),
      true,
    );
    TestValidator.equals(
      "weekly community breakdown has valid SLA rate",
      weeklyData.community_breakdown.every(
        (metric) =>
          metric.sla_compliance_rate >= 0 && metric.sla_compliance_rate <= 100,
      ),
      true,
    );
  }
  // 7. Validate moderator workload data when present
  if (hourlyData.moderator_workload) {
    TestValidator.equals(
      "hourly moderator workload is array when present",
      Array.isArray(hourlyData.moderator_workload),
      true,
    );
  }
  if (dailyData.moderator_workload) {
    TestValidator.equals(
      "daily moderator workload is array when present",
      Array.isArray(dailyData.moderator_workload),
      true,
    );
  }
  if (weeklyData.moderator_workload) {
    TestValidator.equals(
      "weekly moderator workload is array when present",
      Array.isArray(weeklyData.moderator_workload),
      true,
    );
  }
  // 8. Validate backlog_by_status counts are non-negative
  TestValidator.equals(
    "hourly backlog_by_status has non-negative counts",
    hourlyData.backlog_by_status.pending >= 0 &&
      hourlyData.backlog_by_status.resolved >= 0 &&
      hourlyData.backlog_by_status.dismissed >= 0,
    true,
  );
  TestValidator.equals(
    "daily backlog_by_status has non-negative counts",
    dailyData.backlog_by_status.pending >= 0 &&
      dailyData.backlog_by_status.resolved >= 0 &&
      dailyData.backlog_by_status.dismissed >= 0,
    true,
  );
  TestValidator.equals(
    "weekly backlog_by_status has non-negative counts",
    weeklyData.backlog_by_status.pending >= 0 &&
      weeklyData.backlog_by_status.resolved >= 0 &&
      weeklyData.backlog_by_status.dismissed >= 0,
    true,
  );
  // 9. Validate SLA compliance rate is within bounds (0-100)
  TestValidator.equals(
    "hourly SLA compliance rate is within bounds",
    hourlyData.sla_compliance_rate >= 0 &&
      hourlyData.sla_compliance_rate <= 100,
    true,
  );
  TestValidator.equals(
    "daily SLA compliance rate is within bounds",
    dailyData.sla_compliance_rate >= 0 && dailyData.sla_compliance_rate <= 100,
    true,
  );
  TestValidator.equals(
    "weekly SLA compliance rate is within bounds",
    weeklyData.sla_compliance_rate >= 0 &&
      weeklyData.sla_compliance_rate <= 100,
    true,
  );
  // 10. Validate avg_response_time_hours is non-negative
  TestValidator.equals(
    "hourly avg_response_time_hours is non-negative",
    hourlyData.avg_response_time_hours >= 0,
    true,
  );
  TestValidator.equals(
    "daily avg_response_time_hours is non-negative",
    dailyData.avg_response_time_hours >= 0,
    true,
  );
  TestValidator.equals(
    "weekly avg_response_time_hours is non-negative",
    weeklyData.avg_response_time_hours >= 0,
    true,
  );
}
