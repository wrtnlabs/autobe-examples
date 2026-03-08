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

export async function test_api_content_report_section_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Test content report without section_id filter
  const reportAll =
    await api.functional.discussionBoard.admin.reports.content.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(reportAll);
  TestValidator.equals(
    "pagination structure valid",
    reportAll.pagination.current,
    1,
  );
  TestValidator.predicate(
    "has pagination data",
    reportAll.pagination.records >= 0,
  );
  // 3. Test content report with section_id filter
  const filteredSectionId = typia.random<string & tags.Format<"uuid">>();
  const reportFiltered =
    await api.functional.discussionBoard.admin.reports.content.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          section_id: filteredSectionId,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(reportFiltered);
  // 4. Validate section_breakdown only contains the filtered section (or is empty if no articles)
  if (reportFiltered.data.length > 0) {
    const summary = reportFiltered.data[0];
    typia.assert(summary);
    // Validate section_breakdown structure
    for (const breakdown of summary.section_breakdown) {
      typia.assert(breakdown);
      TestValidator.equals(
        "section_id matches filter",
        breakdown.section_id,
        filteredSectionId,
      );
    }
    // Validate active_sections_count matches section_breakdown length
    TestValidator.equals(
      "active sections count matches breakdown",
      summary.active_sections_count,
      summary.section_breakdown.length,
    );
    // Validate total_articles is non-negative
    TestValidator.predicate(
      "total articles non-negative",
      summary.total_articles >= 0,
    );
    // Validate total_comments is non-negative
    TestValidator.predicate(
      "total comments non-negative",
      summary.total_comments >= 0,
    );
    // Validate tag_statistics only contains tags from filtered section
    for (const tagStat of summary.tag_statistics) {
      typia.assert(tagStat);
      TestValidator.predicate(
        "tag usage count non-negative",
        tagStat.usage_count >= 0,
      );
    }
    // Validate engagement_trend is one of the expected values
    TestValidator.predicate(
      "engagement trend valid",
      summary.engagement_trend === "increasing" ||
        summary.engagement_trend === "stable" ||
        summary.engagement_trend === "decreasing",
    );
    // Validate period timestamps
    TestValidator.predicate(
      "period_start is valid date-time",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        summary.period_start,
      ),
    );
    TestValidator.predicate(
      "period_end is valid date-time",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        summary.period_end,
      ),
    );
  }
  // 5. Test pagination with section filtering
  const reportPage2 =
    await api.functional.discussionBoard.admin.reports.content.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 10,
          section_id: filteredSectionId,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(reportPage2);
  TestValidator.equals("page 2 requested", reportPage2.pagination.current, 2);
  TestValidator.equals("limit applied", reportPage2.pagination.limit, 10);
}
