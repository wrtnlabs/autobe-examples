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
 * Verify that the by-reason report statistics endpoint correctly respects
 * target_types and reporter_types filters when aggregating discussion board
 * reports by reason_code.
 *
 * Business context:
 *
 * - Reports are created by member users against articles, comments, or
 *   attachments and stored in discussion_board_reports.
 * - Administrators query aggregated statistics grouped by reason_code using
 *   /discussionBoard/adminUser/reports/statistics/byReason, with optional
 *   filters on target_type, reporter_type, status, action, and time ranges.
 *
 * This test covers a realistic flow:
 *
 * 1. Register an adminUser and keep its credentials.
 * 2. As adminUser, create an article category so articles can be created.
 * 3. Register a memberUser and login.
 * 4. As memberUser, create a discussion article under the category.
 * 5. As memberUser, create multiple reports targeting that article, using two
 *    distinct reason codes (e.g., "spam" and "hate_abuse").
 * 6. Switch back to adminUser.
 * 7. Call the statistics-by-reason endpoint with filters
 *
 *    - Target_types: ["article"]
 *    - Reporter_types: ["memberuser"] and assert that the returned statistics
 *         contain rows for the seeded reason_codes and that total_count is at
 *         least the number of created reports per reason.
 * 8. Call the same endpoint with a broader reporter_types filter (undefined) while
 *    keeping target_types = ["article"], and confirm that counts for the seeded
 *    reasons are equal to the baseline call (since the test only created
 *    memberuser-originated reports), demonstrating that the reporter_types
 *    filter is applied before grouping.
 * 9. Finally, call the endpoint with reason_codes restricted to a single reason
 *    code and assert that only that reason appears in the items array.
 */
export async function test_api_report_statistics_by_reason_filter_by_target_and_reporter_type(
  connection: api.IConnection,
) {
  // 1. Register an adminUser (join implicitly authenticates as adminUser)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string & tags.Format<"password"> =
    RandomGenerator.alphaNumeric(12) as string & tags.Format<"password">;

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminJoinOutput: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoinOutput);

  // 2. As adminUser, create an article category
  const categoryBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: 1 as number & tags.Type<"int32">,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // 3. Register a memberUser
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: "Seoul, South Korea",
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberJoinOutput: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberJoinOutput);

  // 4. MemberUser login explicitly to ensure session
  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
    ip: "127.0.0.1",
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/landing",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberLoginOutput: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginOutput);

  // 5. As memberUser, create an article in the created category
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
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

  // 6. As memberUser, create multiple reports for this article with
  //    different reason codes
  const reasonSpam = "spam";
  const reasonHate = "hate_abuse";

  const spamReportCount = 3;
  const hateReportCount = 2;

  const createReport = async (
    categoryCode: string,
  ): Promise<IDiscussionBoardReport> => {
    const reportBody = {
      category: categoryCode,
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      target_article_id: article.id,
    } satisfies IDiscussionBoardReport.ICreate;

    const report: IDiscussionBoardReport =
      await api.functional.discussionBoard.memberUser.reports.create(
        connection,
        {
          body: reportBody,
        },
      );
    typia.assert(report);
    return report;
  };

  const spamReports: IDiscussionBoardReport[] = await ArrayUtil.asyncRepeat(
    spamReportCount,
    async () => createReport(reasonSpam),
  );
  const hateReports: IDiscussionBoardReport[] = await ArrayUtil.asyncRepeat(
    hateReportCount,
    async () => createReport(reasonHate),
  );

  TestValidator.equals(
    "created spam report count",
    spamReports.length,
    spamReportCount,
  );
  TestValidator.equals(
    "created hate_abuse report count",
    hateReports.length,
    hateReportCount,
  );

  // 7. Switch back to adminUser by logging in
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLoginOutput: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginOutput);

  // 8. Call statistics endpoint with target_types = ["article"],
  //    reporter_types = ["memberuser"]
  const statsRequestBase = {
    created_at_from: null,
    created_at_to: null,
    updated_at_from: null,
    updated_at_to: null,
    target_types: ["article"],
    reporter_types: ["memberuser"],
    reason_codes: undefined,
    statuses: undefined,
    actions: undefined,
  } satisfies IDiscussionBoardReportByReasonStatistics.IRequest;

  const statsBaseline: IDiscussionBoardReportByReasonStatistics =
    await api.functional.discussionBoard.adminUser.reports.statistics.byReason.index(
      connection,
      {
        body: statsRequestBase,
      },
    );
  typia.assert(statsBaseline);

  // Helper to find a statistics row by reason_code
  const findRow = (
    stats: IDiscussionBoardReportByReasonStatistics,
    reasonCode: string,
  ): IDiscussionBoardReportByReasonStatistics.IRow | undefined =>
    stats.items.find((row) => row.reason_code === reasonCode);

  const spamRowBaseline = findRow(statsBaseline, reasonSpam);
  const hateRowBaseline = findRow(statsBaseline, reasonHate);

  TestValidator.predicate(
    "spam reason row exists in baseline stats",
    spamRowBaseline !== undefined,
  );
  TestValidator.predicate(
    "hate_abuse reason row exists in baseline stats",
    hateRowBaseline !== undefined,
  );

  if (spamRowBaseline !== undefined) {
    TestValidator.predicate(
      "spam total_count >= created spam reports",
      spamRowBaseline.total_count >= spamReportCount,
    );
    const spamStatusSum =
      spamRowBaseline.submitted_count +
      spamRowBaseline.in_review_count +
      spamRowBaseline.resolved_count;
    TestValidator.equals(
      "spam status counts sum equals total_count",
      spamStatusSum,
      spamRowBaseline.total_count,
    );
  }

  if (hateRowBaseline !== undefined) {
    TestValidator.predicate(
      "hate_abuse total_count >= created hate reports",
      hateRowBaseline.total_count >= hateReportCount,
    );
    const hateStatusSum =
      hateRowBaseline.submitted_count +
      hateRowBaseline.in_review_count +
      hateRowBaseline.resolved_count;
    TestValidator.equals(
      "hate_abuse status counts sum equals total_count",
      hateStatusSum,
      hateRowBaseline.total_count,
    );
  }

  // 9. Call statistics endpoint again with reporter_types undefined (all
  //    reporters) while keeping target_types = ["article"]. Counts for our
  //    seeded reasons should be >= baseline (and very likely equal in this
  //    controlled test data set).
  const statsRequestBroader = {
    created_at_from: null,
    created_at_to: null,
    updated_at_from: null,
    updated_at_to: null,
    target_types: ["article"],
    reporter_types: undefined,
    reason_codes: undefined,
    statuses: undefined,
    actions: undefined,
  } satisfies IDiscussionBoardReportByReasonStatistics.IRequest;

  const statsBroader: IDiscussionBoardReportByReasonStatistics =
    await api.functional.discussionBoard.adminUser.reports.statistics.byReason.index(
      connection,
      {
        body: statsRequestBroader,
      },
    );
  typia.assert(statsBroader);

  const spamRowBroader = findRow(statsBroader, reasonSpam);
  const hateRowBroader = findRow(statsBroader, reasonHate);

  TestValidator.predicate(
    "spam row exists in broader stats",
    spamRowBroader !== undefined,
  );
  TestValidator.predicate(
    "hate_abuse row exists in broader stats",
    hateRowBroader !== undefined,
  );

  if (spamRowBaseline !== undefined && spamRowBroader !== undefined) {
    TestValidator.equals(
      "spam total_count unchanged when broadening reporter_types",
      spamRowBroader.total_count,
      spamRowBaseline.total_count,
    );
  }

  if (hateRowBaseline !== undefined && hateRowBroader !== undefined) {
    TestValidator.equals(
      "hate_abuse total_count unchanged when broadening reporter_types",
      hateRowBroader.total_count,
      hateRowBaseline.total_count,
    );
  }

  // 10. Call statistics with reason_codes restricted to a single reason and
  //     assert that only that reason appears in items.
  const statsRequestSpamOnly = {
    created_at_from: null,
    created_at_to: null,
    updated_at_from: null,
    updated_at_to: null,
    target_types: ["article"],
    reporter_types: ["memberuser"],
    reason_codes: [reasonSpam],
    statuses: undefined,
    actions: undefined,
  } satisfies IDiscussionBoardReportByReasonStatistics.IRequest;

  const statsSpamOnly: IDiscussionBoardReportByReasonStatistics =
    await api.functional.discussionBoard.adminUser.reports.statistics.byReason.index(
      connection,
      {
        body: statsRequestSpamOnly,
      },
    );
  typia.assert(statsSpamOnly);

  TestValidator.predicate(
    "spam-only stats contain at least one row",
    statsSpamOnly.items.length > 0,
  );

  await TestValidator.predicate(
    "all rows in spam-only stats have spam reason_code",
    async () => {
      for (const row of statsSpamOnly.items) {
        if (row.reason_code !== reasonSpam) return false;
      }
      return true;
    },
  );
}
