import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserLogin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardReportByReasonStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportByReasonStatistics";

/**
 * Validate aggregated report statistics by reason_code for adminUser.
 *
 * Business goal: Ensure that PATCH
 * /discussionBoard/adminUser/reports/statistics/byReason correctly groups
 * reports by reason_code and that the aggregated counts reflect underlying
 * report data created through memberUser flows.
 *
 * High-level scenario:
 *
 * - Admin user exists and can manage article categories and view report
 *   statistics.
 * - Member user exists and can create articles and file reports against them.
 * - Multiple reports are created with different reason categories targeting a
 *   single article.
 * - Admin invokes the statistics-by-reason endpoint with no filters so that all
 *   created reports are included in the aggregation.
 * - The test verifies that the aggregated counts per reason_code match the number
 *   of reports created and that the total count across all rows equals the
 *   total number of reports.
 */
export async function test_api_report_statistics_by_reason_basic_aggregation(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an adminUser (join).
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "AdminP@ssw0rd";

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
    display_name: RandomGenerator.name(),
    bio: null,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. As adminUser, create an article category.
  const categoryBody = {
    code: "GENERAL",
    name: "General Discussion",
    description: "General purpose category for aggregation tests",
    order: 1 as number & tags.Type<"int32">,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // 3. Register and authenticate a memberUser (join).
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = "MemberP@ssw0rd";

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    displayName: RandomGenerator.name(),
    bio: null,
    location: null,
    ip: null,
    href: "https://board.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://board.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As memberUser, create a single article to be the common report target.
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: "Aggregation test article",
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleBody,
      },
    );
  typia.assert(article);

  // 5. As memberUser, create multiple reports with different categories
  //    (which map to reason_code).
  const reasonDefinitions = [
    { code: "spam", count: 2 },
    { code: "hate_abuse", count: 1 },
    { code: "off_topic", count: 3 },
  ] as const;

  type ReasonCode = (typeof reasonDefinitions)[number]["code"];

  const createdReports: IDiscussionBoardReport[] = [];

  for (const def of reasonDefinitions) {
    for (let i = 0; i < def.count; i++) {
      const reportBody = {
        category: def.code,
        reason: `Reason ${def.code} #${i + 1}`,
        target_article_id: article.id,
      } satisfies IDiscussionBoardReport.ICreate;

      const report: IDiscussionBoardReport =
        await api.functional.discussionBoard.memberUser.reports.create(
          connection,
          { body: reportBody },
        );
      typia.assert(report);
      createdReports.push(report);
    }
  }

  // Sanity-check: total reports created equals sum of counts.
  const expectedTotalReports: number = reasonDefinitions
    .map((r) => r.count)
    .reduce((a, b) => a + b, 0);

  TestValidator.equals(
    "total created reports count",
    createdReports.length,
    expectedTotalReports,
  );

  // 6. Switch back to adminUser context via login to be explicit.
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const reLoggedAdmin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(reLoggedAdmin);

  // 7. As adminUser, call statistics-by-reason with minimal filter (no filters).
  const statsRequestBody = {
    created_at_from: null,
    created_at_to: null,
    updated_at_from: null,
    updated_at_to: null,
    target_types: undefined,
    reporter_types: undefined,
    reason_codes: undefined,
    statuses: undefined,
    actions: undefined,
  } satisfies IDiscussionBoardReportByReasonStatistics.IRequest;

  const statistics: IDiscussionBoardReportByReasonStatistics =
    await api.functional.discussionBoard.adminUser.reports.statistics.byReason.index(
      connection,
      { body: statsRequestBody },
    );
  typia.assert(statistics);

  // 8. Validate aggregation content.
  const items = statistics.items;

  TestValidator.predicate(
    "statistics items should contain at least one row",
    items.length > 0,
  );

  // Map expected counts per reason_code for quick lookup.
  const expectedCounts: Record<string, number> = {};
  for (const def of reasonDefinitions) expectedCounts[def.code] = def.count;

  // Ensure that each expected reason_code has a corresponding row and the
  // total_count matches the number of reports created for that reason.
  for (const def of reasonDefinitions) {
    const row = items.find((it) => it.reason_code === def.code) ?? null;

    TestValidator.predicate(
      `statistics row exists for reason_code=${def.code}`,
      row !== null,
    );

    if (row !== null) {
      TestValidator.equals(
        `total_count for reason_code=${def.code}`,
        row.total_count,
        def.count,
      );

      // submitted_count, in_review_count, resolved_count must be within
      // [0, total_count] and their sum must not exceed total_count.
      const stateSum =
        row.submitted_count + row.in_review_count + row.resolved_count;

      TestValidator.predicate(
        `state counts within bounds for reason_code=${def.code}`,
        row.submitted_count >= 0 &&
          row.in_review_count >= 0 &&
          row.resolved_count >= 0 &&
          stateSum <= row.total_count,
      );

      // Action counts also must be between 0 and total_count.
      const actionCounts = [
        row.action_none_count,
        row.action_keep_count,
        row.action_hide_content_count,
        row.action_delete_content_count,
        row.action_restrict_user_count,
      ];

      TestValidator.predicate(
        `action counts within bounds for reason_code=${def.code}`,
        actionCounts.every((c) => c >= 0 && c <= row.total_count),
      );
    }
  }

  // Sum of total_count across all rows that match our reason_codes should
  // equal the number of created reports for those reasons.
  const totalCountForExpectedReasons = items
    .filter((it) => it.reason_code in expectedCounts)
    .map((it) => it.total_count)
    .reduce((a, b) => a + b, 0);

  TestValidator.equals(
    "sum of total_count over expected reason_codes",
    totalCountForExpectedReasons,
    expectedTotalReports,
  );
}
