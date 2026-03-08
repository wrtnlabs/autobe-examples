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

export async function test_api_content_report_basic_generation(
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
  // 2. Generate content report with default pagination parameters
  const report =
    await api.functional.discussionBoard.admin.reports.content.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(report);
  // 3. Validate pagination metadata
  TestValidator.equals("pagination current page", report.pagination.current, 1);
  TestValidator.equals("pagination limit", report.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records non-negative",
    report.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    report.pagination.pages >= 0,
  );
  // 4. Validate report data is an array
  TestValidator.predicate("report data is array", Array.isArray(report.data));
  // 5. Validate business logic for report summaries if data exists
  if (report.data.length > 0) {
    const summary = report.data[0];
    typia.assert(summary);
    // Business logic validations (not type validations - typia handles those)
    TestValidator.predicate(
      "total_articles non-negative",
      summary.total_articles >= 0,
    );
    TestValidator.predicate(
      "total_comments non-negative",
      summary.total_comments >= 0,
    );
    TestValidator.predicate(
      "active_sections_count non-negative",
      summary.active_sections_count >= 0,
    );
    TestValidator.predicate(
      "total_sections non-negative",
      summary.total_sections >= 0,
    );
    TestValidator.predicate(
      "unique_authors non-negative",
      summary.unique_authors >= 0,
    );
    TestValidator.predicate(
      "average_articles_per_section non-negative",
      summary.average_articles_per_section >= 0,
    );
    TestValidator.predicate(
      "engagement_trend valid",
      ["increasing", "stable", "decreasing"].includes(summary.engagement_trend),
    );
    // Validate section breakdown business logic
    TestValidator.predicate(
      "section_breakdown is array",
      Array.isArray(summary.section_breakdown),
    );
    if (summary.section_breakdown.length > 0) {
      const section = summary.section_breakdown[0];
      typia.assert(section);
      TestValidator.predicate(
        "section article_count non-negative",
        section.article_count >= 0,
      );
    }
    // Validate tag statistics business logic
    TestValidator.predicate(
      "tag_statistics is array",
      Array.isArray(summary.tag_statistics),
    );
    if (summary.tag_statistics.length > 0) {
      const tag = summary.tag_statistics[0];
      typia.assert(tag);
      TestValidator.predicate(
        "tag usage_count non-negative",
        tag.usage_count >= 0,
      );
    }
  }
}
