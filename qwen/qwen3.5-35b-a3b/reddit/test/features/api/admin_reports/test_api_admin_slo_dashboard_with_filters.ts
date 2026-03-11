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

export async function test_api_admin_slo_dashboard_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(12),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph(),
      avatar_url: typia.random<string & tags.Format<"uri">>() ?? null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create admin connection with token
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: adminAuth.token.access,
  };
  // 3. Generate test data for filtering
  const testCommunityId = typia.random<string & tags.Format<"uuid">>();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startDate = thirtyDaysAgo.toISOString();
  const endDate = now.toISOString();
  // 4. Test with all filters applied
  const filteredResponse =
    await api.functional.redditPlatform.admin.reports.slo.dashboard(
      adminConnection,
      {
        body: {
          community_id: testCommunityId,
          status: "resolved",
          startDate: startDate,
          endDate: endDate,
          granularity: "daily",
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(filteredResponse);
  // 5. Validate filtered response structure
  TestValidator.predicate(
    "sla compliance rate is valid percentage",
    filteredResponse.sla_compliance_rate >= 0 &&
      filteredResponse.sla_compliance_rate <= 100,
  );
  TestValidator.predicate(
    "average response time is positive",
    filteredResponse.avg_response_time_hours >= 0,
  );
  TestValidator.predicate(
    "pending count is non-negative",
    filteredResponse.backlog_by_status.pending >= 0,
  );
  TestValidator.predicate(
    "resolved count is non-negative",
    filteredResponse.backlog_by_status.resolved >= 0,
  );
  TestValidator.predicate(
    "dismissed count is non-negative",
    filteredResponse.backlog_by_status.dismissed >= 0,
  );
  TestValidator.predicate(
    "daily volume trends is array",
    Array.isArray(filteredResponse.report_volume_trends.daily_volume),
  );
  TestValidator.predicate(
    "resolution rate trends is array",
    Array.isArray(filteredResponse.report_volume_trends.resolution_rate),
  );
  TestValidator.predicate(
    "SLA breaches is array",
    Array.isArray(filteredResponse.sla_breaches),
  );
  TestValidator.predicate(
    "community breakdown is array or undefined",
    filteredResponse.community_breakdown === undefined ||
      Array.isArray(filteredResponse.community_breakdown),
  );
  TestValidator.predicate(
    "moderator workload is array or undefined",
    filteredResponse.moderator_workload === undefined ||
      Array.isArray(filteredResponse.moderator_workload),
  );
  // 6. Test with status filter only
  const statusFilteredResponse =
    await api.functional.redditPlatform.admin.reports.slo.dashboard(
      adminConnection,
      {
        body: {
          status: "pending",
          granularity: "daily",
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(statusFilteredResponse);
  // 7. Test with date range filter only
  const dateFilteredResponse =
    await api.functional.redditPlatform.admin.reports.slo.dashboard(
      adminConnection,
      {
        body: {
          startDate: startDate,
          endDate: endDate,
          granularity: "daily",
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(dateFilteredResponse);
  // 8. Test with no filters (all data)
  const allDataResponse =
    await api.functional.redditPlatform.admin.reports.slo.dashboard(
      adminConnection,
      {
        body: {
          granularity: "daily",
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(allDataResponse);
  // 9. Validate unfiltered data has same or more data than filtered
  TestValidator.predicate(
    "all data has at least as much as filtered by status",
    allDataResponse.backlog_by_status.pending >=
      statusFilteredResponse.backlog_by_status.pending &&
      allDataResponse.backlog_by_status.resolved >=
        statusFilteredResponse.backlog_by_status.resolved &&
      allDataResponse.backlog_by_status.dismissed >=
        statusFilteredResponse.backlog_by_status.dismissed,
  );
  // 10. Test with different granularities
  const hourlyResponse =
    await api.functional.redditPlatform.admin.reports.slo.dashboard(
      adminConnection,
      {
        body: {
          granularity: "hourly",
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(hourlyResponse);
  const weeklyResponse =
    await api.functional.redditPlatform.admin.reports.slo.dashboard(
      adminConnection,
      {
        body: {
          granularity: "weekly",
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(weeklyResponse);
}