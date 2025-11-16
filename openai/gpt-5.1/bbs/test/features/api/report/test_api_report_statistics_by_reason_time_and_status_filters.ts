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

export async function test_api_report_statistics_by_reason_time_and_status_filters(
  connection: api.IConnection,
) {
  // 1. Bootstrap: create adminUser and memberUser accounts
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const baseHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const baseReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: "AdminPassword!123" as string & tags.Format<"password">,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: null,
    href: baseHref,
    referrer: baseReferrer,
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const memberJoinBody = {
    email: memberEmail,
    password: "MemberPassword!123",
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: null,
    ip: null,
    href: baseHref,
    referrer: baseReferrer,
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. As adminUser, create an article category
  // (connection already carries admin auth token from admin join)
  const categoryCreateBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    order: 1 as number & tags.Type<"int32">,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 3. Switch to memberUser and create an article under that category
  await api.functional.auth.memberUser.login(connection, {
    body: {
      email: memberEmail,
      password: "MemberPassword!123",
      ip: null,
      href: baseHref,
      referrer: baseReferrer,
    } satisfies IDiscussionBoardMemberUserLogin.IRequest,
  });

  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 1 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(article);

  // 4. Create two cohorts of reports on the same article
  // Cohort A: earlier reports
  const reasonCodes = ["spam", "hate_abuse"] as const;

  const cohortAReports: IDiscussionBoardReport[] = [];
  for (let i = 0; i < 3; i += 1) {
    const categoryCode = RandomGenerator.pick(reasonCodes);
    const reportBodyA = {
      category: categoryCode,
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      target_article_id: article.id,
      target_comment_id: undefined,
      target_attachment_id: undefined,
    } satisfies IDiscussionBoardReport.ICreate;

    const reportA: IDiscussionBoardReport =
      await api.functional.discussionBoard.memberUser.reports.create(
        connection,
        {
          body: reportBodyA,
        },
      );
    typia.assert(reportA);
    cohortAReports.push(reportA);
  }

  // Capture a timestamp after cohort A creation
  const middleBoundary: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  // Cohort B: later reports
  const cohortBReports: IDiscussionBoardReport[] = [];
  for (let i = 0; i < 5; i += 1) {
    const categoryCode = RandomGenerator.pick(reasonCodes);
    const reportBodyB = {
      category: categoryCode,
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      target_article_id: article.id,
      target_comment_id: undefined,
      target_attachment_id: undefined,
    } satisfies IDiscussionBoardReport.ICreate;

    const reportB: IDiscussionBoardReport =
      await api.functional.discussionBoard.memberUser.reports.create(
        connection,
        {
          body: reportBodyB,
        },
      );
    typia.assert(reportB);
    cohortBReports.push(reportB);
  }

  // Capture a timestamp after cohort B; used as upper bound
  const endBoundary: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  // 5. Switch back to adminUser to call statistics endpoint
  await api.functional.auth.adminUser.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword!123",
      ip: null,
      href: baseHref,
      referrer: baseReferrer,
    } satisfies IDiscussionBoardAdminUserLogin.IRequest,
  });

  // Build helper to aggregate expected counts by reason for each cohort,
  // based only on reason_code of reports this test created.
  type ReasonCountMap = Record<string, number>;

  const cohortAReasonCounts: ReasonCountMap = {};
  for (const report of cohortAReports) {
    const key = report.reason_code;
    cohortAReasonCounts[key] = (cohortAReasonCounts[key] ?? 0) + 1;
  }

  const cohortBReasonCounts: ReasonCountMap = {};
  for (const report of cohortBReports) {
    const key = report.reason_code;
    cohortBReasonCounts[key] = (cohortBReasonCounts[key] ?? 0) + 1;
  }

  const combinedReasonCounts: ReasonCountMap = {};
  for (const key of Object.keys(cohortAReasonCounts)) {
    combinedReasonCounts[key] =
      (combinedReasonCounts[key] ?? 0) + cohortAReasonCounts[key];
  }
  for (const key of Object.keys(cohortBReasonCounts)) {
    combinedReasonCounts[key] =
      (combinedReasonCounts[key] ?? 0) + cohortBReasonCounts[key];
  }

  // 6. Narrow window: only include reports created after middleBoundary
  const narrowRequestBody = {
    created_at_from: middleBoundary,
    created_at_to: endBoundary,
    updated_at_from: null,
    updated_at_to: null,
    target_types: undefined,
    reporter_types: undefined,
    reason_codes: undefined,
    statuses: undefined,
    actions: undefined,
  } satisfies IDiscussionBoardReportByReasonStatistics.IRequest;

  const narrowStats: IDiscussionBoardReportByReasonStatistics =
    await api.functional.discussionBoard.adminUser.reports.statistics.byReason.index(
      connection,
      {
        body: narrowRequestBody,
      },
    );
  typia.assert(narrowStats);

  // 7. Broad window: include everything up to endBoundary
  const broadRequestBody = {
    created_at_from: null,
    created_at_to: endBoundary,
    updated_at_from: null,
    updated_at_to: null,
    target_types: undefined,
    reporter_types: undefined,
    reason_codes: undefined,
    statuses: undefined,
    actions: undefined,
  } satisfies IDiscussionBoardReportByReasonStatistics.IRequest;

  const broadStats: IDiscussionBoardReportByReasonStatistics =
    await api.functional.discussionBoard.adminUser.reports.statistics.byReason.index(
      connection,
      {
        body: broadRequestBody,
      },
    );
  typia.assert(broadStats);

  // 8. Convert statistics arrays to maps for easier comparison
  const toRowMap = (
    stats: IDiscussionBoardReportByReasonStatistics,
  ): Record<string, IDiscussionBoardReportByReasonStatistics.IRow> => {
    const map: Record<string, IDiscussionBoardReportByReasonStatistics.IRow> =
      {};
    for (const row of stats.items) {
      map[row.reason_code] = row;
    }
    return map;
  };

  const narrowRowMap = toRowMap(narrowStats);
  const broadRowMap = toRowMap(broadStats);

  // 9. Validate that narrow stats include at least the B-cohort counts per reason
  for (const reasonCode of Object.keys(cohortBReasonCounts)) {
    const expectedBCount = cohortBReasonCounts[reasonCode];
    const narrowRow = narrowRowMap[reasonCode];

    TestValidator.predicate(
      `narrow window should have row for reason_code ${reasonCode}`,
      narrowRow !== undefined,
    );

    if (narrowRow !== undefined) {
      TestValidator.predicate(
        `narrow total_count should be at least B-cohort count for reason_code ${reasonCode}`,
        narrowRow.total_count >= expectedBCount,
      );
    }
  }

  // 10. Validate that broad stats include at least combined cohort counts per reason
  for (const reasonCode of Object.keys(combinedReasonCounts)) {
    const expectedTotal = combinedReasonCounts[reasonCode];
    const broadRow = broadRowMap[reasonCode];

    TestValidator.predicate(
      `broad window should have row for reason_code ${reasonCode}`,
      broadRow !== undefined,
    );

    if (broadRow !== undefined) {
      TestValidator.predicate(
        `broad total_count should be at least combined cohort count for reason_code ${reasonCode}`,
        broadRow.total_count >= expectedTotal,
      );
    }
  }

  // 11. Validate that broad totals and action counts are >= narrow per reason
  for (const [reasonCode, narrowRow] of Object.entries(narrowRowMap)) {
    const broadRow = broadRowMap[reasonCode];

    if (broadRow !== undefined) {
      TestValidator.predicate(
        `broad total_count should be >= narrow for reason_code ${reasonCode}`,
        broadRow.total_count >= narrowRow.total_count,
      );

      TestValidator.predicate(
        `broad action_none_count >= narrow for reason_code ${reasonCode}`,
        broadRow.action_none_count >= narrowRow.action_none_count,
      );
      TestValidator.predicate(
        `broad action_keep_count >= narrow for reason_code ${reasonCode}`,
        broadRow.action_keep_count >= narrowRow.action_keep_count,
      );
      TestValidator.predicate(
        `broad action_hide_content_count >= narrow for reason_code ${reasonCode}`,
        broadRow.action_hide_content_count >=
          narrowRow.action_hide_content_count,
      );
      TestValidator.predicate(
        `broad action_delete_content_count >= narrow for reason_code ${reasonCode}`,
        broadRow.action_delete_content_count >=
          narrowRow.action_delete_content_count,
      );
      TestValidator.predicate(
        `broad action_restrict_user_count >= narrow for reason_code ${reasonCode}`,
        broadRow.action_restrict_user_count >=
          narrowRow.action_restrict_user_count,
      );
    }
  }
}
