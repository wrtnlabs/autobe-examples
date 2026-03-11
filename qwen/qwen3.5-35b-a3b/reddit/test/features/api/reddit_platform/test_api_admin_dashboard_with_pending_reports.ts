import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPagination";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformModeratorDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeratorDashboardSummary";
import type { IRedditPlatformModeratorHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeratorHistory";
import type { IRedditPlatformPendingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPendingReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_dashboard_with_pending_reports(
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
      avatar_url: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Access dashboard with admin connection (token updated by authorize_admin_join)
  const dashboard =
    await api.functional.redditPlatform.admin.dashboard.at(adminConnection);
  typia.assert(dashboard);
  // 3. Validate summary statistics
  const summary = dashboard.summary;
  typia.assert(summary);
  TestValidator.equals(
    "summary pending count",
    summary.pending_count,
    summary.pending_count,
  );
  TestValidator.equals(
    "summary resolved count",
    summary.resolved_count,
    summary.resolved_count,
  );
  TestValidator.equals(
    "summary dismissed count",
    summary.dismissed_count,
    summary.dismissed_count,
  );
  TestValidator.equals(
    "summary communities count",
    summary.communities_count,
    summary.communities_count,
  );
  TestValidator.equals(
    "summary reports over 24h",
    summary.reports_over_24h,
    summary.reports_over_24h,
  );
  // 4. Validate reports array exists and has correct type
  typia.assert(dashboard.reports);
  TestValidator.predicate("reports is array", Array.isArray(dashboard.reports));
  // 5. Validate reports are sorted by created_at descending (newest first)
  if (dashboard.reports.length > 1) {
    for (let i = 0; i < dashboard.reports.length - 1; i++) {
      const currentReport = dashboard.reports[i];
      const nextReport = dashboard.reports[i + 1];
      TestValidator.predicate(
        `report ${i} created_at >= report ${i + 1} created_at`,
        new Date(currentReport.created_at).getTime() >=
          new Date(nextReport.created_at).getTime(),
      );
    }
  }
  // 6. Validate each report has all required fields
  for (const report of dashboard.reports) {
    typia.assert(report);
    TestValidator.predicate("report id is not empty", report.id.length > 0);
    TestValidator.equals(
      "report status is valid",
      report.status,
      report.status,
    );
    TestValidator.predicate(
      "report reason is not empty",
      report.reason.length > 0,
    );
    TestValidator.predicate(
      "report created_at is valid date-time",
      report.created_at.length > 0,
    );
    TestValidator.predicate(
      "report reporter_id is not empty",
      report.reporter_id.length > 0,
    );
    TestValidator.predicate(
      "report reporter_username is not empty",
      report.reporter_username.length > 0,
    );
    TestValidator.predicate(
      "report community_id is not empty",
      report.community_id.length > 0,
    );
    TestValidator.predicate(
      "report community_name is not empty",
      report.community_name.length > 0,
    );
    TestValidator.equals(
      "report reported_content_type is valid",
      report.reported_content_type,
      report.reported_content_type,
    );
    TestValidator.predicate(
      "report content_title or content_preview is present",
      report.content_title !== null || report.content_preview !== null,
    );
    TestValidator.predicate(
      "report time_elapsed is not empty",
      report.time_elapsed.length > 0,
    );
  }
  // 7. Validate pagination metadata
  const pagination = dashboard.pagination;
  typia.assert(pagination);
  TestValidator.equals("page", pagination.page, pagination.page);
  TestValidator.equals("limit", pagination.limit, pagination.limit);
  TestValidator.equals("total", pagination.total, pagination.total);
  TestValidator.equals(
    "totalPages",
    pagination.totalPages,
    pagination.totalPages,
  );
  TestValidator.equals("hasNext", pagination.hasNext, pagination.hasNext);
  TestValidator.equals(
    "hasPrevious",
    pagination.hasPrevious,
    pagination.hasPrevious,
  );
  TestValidator.predicate(
    "hasNext calculation is correct",
    pagination.hasNext === pagination.page < pagination.totalPages,
  );
  TestValidator.predicate(
    "hasPrevious calculation is correct",
    pagination.hasPrevious === pagination.page > 1,
  );
}
