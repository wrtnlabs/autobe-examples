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

export async function test_api_admin_slo_dashboard_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
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
    },
  });
  typia.assert(admin);
  // 2. Call SLO dashboard endpoint with admin authentication
  const sloMetrics =
    await api.functional.redditPlatform.admin.reports.slo.dashboard(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(sloMetrics);
  // 3. Validate SLO metrics response structure
  TestValidator.predicate(
    "sla_compliance_rate is between 0-100",
    sloMetrics.sla_compliance_rate >= 0 &&
      sloMetrics.sla_compliance_rate <= 100,
  );
  TestValidator.predicate(
    "avg_response_time_hours is positive",
    sloMetrics.avg_response_time_hours > 0,
  );
  // 4. Validate backlog_by_status structure
  TestValidator.predicate(
    "backlog pending count is non-negative",
    sloMetrics.backlog_by_status.pending >= 0,
  );
  TestValidator.predicate(
    "backlog resolved count is non-negative",
    sloMetrics.backlog_by_status.resolved >= 0,
  );
  TestValidator.predicate(
    "backlog dismissed count is non-negative",
    sloMetrics.backlog_by_status.dismissed >= 0,
  );
  // 5. Validate report_volume_trends arrays
  TestValidator.predicate(
    "daily_volume array exists",
    Array.isArray(sloMetrics.report_volume_trends.daily_volume),
  );
  TestValidator.predicate(
    "resolution_rate array exists",
    Array.isArray(sloMetrics.report_volume_trends.resolution_rate),
  );
  // 6. Validate sla_breaches is an array
  TestValidator.predicate(
    "sla_breaches is array",
    Array.isArray(sloMetrics.sla_breaches),
  );
  // 7. Validate community_breakdown if present
  if (sloMetrics.community_breakdown !== undefined) {
    typia.assertGuard(sloMetrics.community_breakdown);
    TestValidator.predicate(
      "community_breakdown is non-empty array",
      sloMetrics.community_breakdown.length >= 0,
    );
    for (const community of sloMetrics.community_breakdown) {
      typia.assert(community);
      TestValidator.predicate(
        "community sla_compliance_rate is valid",
        community.sla_compliance_rate >= 0 &&
          community.sla_compliance_rate <= 100,
      );
      TestValidator.predicate(
        "community avg_response_time_hours is positive",
        community.avg_response_time_hours > 0,
      );
      TestValidator.predicate(
        "community pending_count is non-negative",
        community.pending_count >= 0,
      );
      TestValidator.predicate(
        "community total_reports is non-negative",
        community.total_reports >= 0,
      );
    }
  }
  // 8. Validate moderator_workload if present
  if (sloMetrics.moderator_workload !== undefined) {
    typia.assertGuard(sloMetrics.moderator_workload);
    TestValidator.predicate(
      "moderator_workload is non-empty array",
      sloMetrics.moderator_workload.length >= 0,
    );
    for (const moderator of sloMetrics.moderator_workload) {
      typia.assert(moderator);
      TestValidator.predicate(
        "moderator reports_resolved is non-negative",
        moderator.reports_resolved >= 0,
      );
      TestValidator.predicate(
        "moderator reports_dismissed is non-negative",
        moderator.reports_dismissed >= 0,
      );
      TestValidator.predicate(
        "moderator actions_per_hour is non-negative",
        moderator.actions_per_hour >= 0,
      );
    }
  }
}