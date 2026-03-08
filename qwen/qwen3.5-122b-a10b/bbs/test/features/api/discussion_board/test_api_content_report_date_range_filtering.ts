import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_content_report_date_range_filtering(
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
  // 2. Test with current week range (last 7 days)
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const weekStart = new Date(now.getTime() - 7 * oneDay);
  const weekEnd = new Date(now.getTime());
  const weekReport =
    await api.functional.discussionBoard.admin.reports.content.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          date_from: weekStart.toISOString(),
          date_to: weekEnd.toISOString(),
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(weekReport);
  // Validate week report structure
  TestValidator.equals(
    "week report has pagination",
    weekReport.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "week report has data array",
    Array.isArray(weekReport.data),
    true,
  );
  if (weekReport.data.length > 0) {
    const weekSummary = weekReport.data[0];
    typia.assert(weekSummary);
    // Validate period matches input
    TestValidator.equals(
      "period_start matches input",
      weekSummary.period_start,
      weekStart.toISOString(),
    );
    TestValidator.equals(
      "period_end matches input",
      weekSummary.period_end,
      weekEnd.toISOString(),
    );
    // Validate numeric fields exist and are non-negative
    TestValidator.predicate(
      "total_articles non-negative",
      weekSummary.total_articles >= 0,
    );
    TestValidator.predicate(
      "total_comments non-negative",
      weekSummary.total_comments >= 0,
    );
    TestValidator.predicate(
      "unique_authors non-negative",
      weekSummary.unique_authors >= 0,
    );
  }
  // 3. Test with current month range (last 30 days)
  const monthStart = new Date(now.getTime() - 30 * oneDay);
  const monthEnd = new Date(now.getTime());
  const monthReport =
    await api.functional.discussionBoard.admin.reports.content.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          date_from: monthStart.toISOString(),
          date_to: monthEnd.toISOString(),
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(monthReport);
  // Validate month report
  TestValidator.equals(
    "month report has pagination",
    monthReport.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "month report has data array",
    Array.isArray(monthReport.data),
    true,
  );
  if (monthReport.data.length > 0) {
    const monthSummary = monthReport.data[0];
    typia.assert(monthSummary);
    // Validate period matches input
    TestValidator.equals(
      "month period_start matches input",
      monthSummary.period_start,
      monthStart.toISOString(),
    );
    TestValidator.equals(
      "month period_end matches input",
      monthSummary.period_end,
      monthEnd.toISOString(),
    );
  }
  // 4. Test with custom date range spanning multiple months
  const customStart = new Date(now.getTime() - 90 * oneDay);
  const customEnd = new Date(now.getTime() - 10 * oneDay);
  const customReport =
    await api.functional.discussionBoard.admin.reports.content.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          date_from: customStart.toISOString(),
          date_to: customEnd.toISOString(),
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(customReport);
  // Validate custom range report
  TestValidator.equals(
    "custom report has pagination",
    customReport.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "custom report has data array",
    Array.isArray(customReport.data),
    true,
  );
  if (customReport.data.length > 0) {
    const customSummary = customReport.data[0];
    typia.assert(customSummary);
    // Validate period matches input
    TestValidator.equals(
      "custom period_start matches input",
      customSummary.period_start,
      customStart.toISOString(),
    );
    TestValidator.equals(
      "custom period_end matches input",
      customSummary.period_end,
      customEnd.toISOString(),
    );
    // Validate all required summary fields exist
    TestValidator.predicate(
      "has active_sections_count",
      customSummary.active_sections_count >= 0,
    );
    TestValidator.predicate(
      "has total_sections",
      customSummary.total_sections >= 0,
    );
    TestValidator.predicate(
      "has average_articles_per_section",
      customSummary.average_articles_per_section >= 0,
    );
    TestValidator.predicate(
      "has engagement_trend",
      ["increasing", "stable", "decreasing"].includes(
        customSummary.engagement_trend,
      ),
    );
    TestValidator.predicate(
      "section_breakdown is array",
      Array.isArray(customSummary.section_breakdown),
    );
    TestValidator.predicate(
      "tag_statistics is array",
      Array.isArray(customSummary.tag_statistics),
    );
  }
  // 5. Test with empty date range (future dates)
  const futureStart = new Date(now.getTime() + 30 * oneDay);
  const futureEnd = new Date(now.getTime() + 60 * oneDay);
  const futureReport =
    await api.functional.discussionBoard.admin.reports.content.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          date_from: futureStart.toISOString(),
          date_to: futureEnd.toISOString(),
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(futureReport);
  // Future range should return empty or zero counts
  if (futureReport.data.length > 0) {
    const futureSummary = futureReport.data[0];
    typia.assert(futureSummary);
    TestValidator.predicate(
      "future range has zero articles",
      futureSummary.total_articles === 0,
    );
    TestValidator.predicate(
      "future range has zero comments",
      futureSummary.total_comments === 0,
    );
  }
}
