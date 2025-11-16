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
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardReportByStatusStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportByStatusStatistics";

export async function test_api_report_statistics_by_status_filtered_by_reason_and_period(
  connection: api.IConnection,
) {
  // 1. Register an admin user and implicitly authenticate as admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin#" + RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: null,
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorizedFromJoin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 2. Register a member user and authenticate as member
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Member#" + RandomGenerator.alphaNumeric(10),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: "Seoul",
    ip: null,
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/home",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorizedFromJoin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedFromJoin);

  // 3. Login again as admin to ensure admin context for category creation
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminAuthorizedFromLogin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  // 4. Create an article category as admin
  const categoryBody = {
    code: "CAT_" + RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // 5. Login as member to create article, comments, and reports
  const memberLoginBody = {
    email: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/home",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberAuthorizedFromLogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedFromLogin);

  // 6. Create an article in the created category as member
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

  // 7. Create two comments on the article as member
  const comment1Body = {
    body: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment1: IDiscussionBoardComment =
    await api.functional.discussionBoard.memberUser.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: comment1Body,
      },
    );
  typia.assert(comment1);

  const comment2Body = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment2: IDiscussionBoardComment =
    await api.functional.discussionBoard.memberUser.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: comment2Body,
      },
    );
  typia.assert(comment2);

  // 8. Create two reports with different categories (reason codes) on those comments
  const report1Body = {
    category: "spam",
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    target_article_id: undefined,
    target_comment_id: comment1.id,
    target_attachment_id: undefined,
  } satisfies IDiscussionBoardReport.ICreate;

  const report1: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: report1Body,
    });
  typia.assert(report1);

  const report2Body = {
    category: "off_topic",
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    target_article_id: undefined,
    target_comment_id: comment2.id,
    target_attachment_id: undefined,
  } satisfies IDiscussionBoardReport.ICreate;

  const report2: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: report2Body,
    });
  typia.assert(report2);

  // Compute a time window that covers both reports
  const created1 = new Date(report1.created_at);
  const created2 = new Date(report2.created_at);
  const minCreatedMs = Math.min(created1.getTime(), created2.getTime());
  const maxCreatedMs = Math.max(created1.getTime(), created2.getTime());
  const deltaMs = 5 * 60 * 1000; // 5 minutes margin

  const createdAtFrom = new Date(minCreatedMs - deltaMs).toISOString();
  const createdAtTo = new Date(maxCreatedMs + deltaMs).toISOString();

  // 9. Switch back to admin for statistics calls
  const adminAuthorizedForStats: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedForStats);

  // Helper to sum counts from statistics response
  const sumCounts = (stats: IDiscussionBoardReportByStatusStatistics): number =>
    stats.items.reduce((acc, item) => acc + item.count, 0);

  // 10. Fetch statistics filtered by status for reasonCodes = ["spam"]
  const statsSpamBody = {
    createdAtFrom,
    createdAtTo,
    updatedAtFrom: undefined,
    updatedAtTo: undefined,
    targetTypes: undefined,
    reporterTypes: undefined,
    reasonCodes: ["spam"],
    actions: undefined,
    statuses: undefined,
  } satisfies IDiscussionBoardReportByStatusStatistics.IRequest;

  const statsSpam: IDiscussionBoardReportByStatusStatistics =
    await api.functional.discussionBoard.adminUser.reports.statistics.byStatus.indexByStatus(
      connection,
      { body: statsSpamBody },
    );
  typia.assert(statsSpam);

  const sumSpam = sumCounts(statsSpam);

  // 11. Fetch statistics for reasonCodes = ["off_topic"]
  const statsOffTopicBody = {
    createdAtFrom,
    createdAtTo,
    updatedAtFrom: undefined,
    updatedAtTo: undefined,
    targetTypes: undefined,
    reporterTypes: undefined,
    reasonCodes: ["off_topic"],
    actions: undefined,
    statuses: undefined,
  } satisfies IDiscussionBoardReportByStatusStatistics.IRequest;

  const statsOffTopic: IDiscussionBoardReportByStatusStatistics =
    await api.functional.discussionBoard.adminUser.reports.statistics.byStatus.indexByStatus(
      connection,
      { body: statsOffTopicBody },
    );
  typia.assert(statsOffTopic);

  const sumOffTopic = sumCounts(statsOffTopic);

  // Basic sanity: each filtered reason code should have at least one matching report
  TestValidator.predicate(
    "statistics for spam reason should include at least one report",
    () => sumSpam > 0,
  );

  TestValidator.predicate(
    "statistics for off_topic reason should include at least one report",
    () => sumOffTopic > 0,
  );

  // 12. Fetch statistics for reasonCodes = ["spam", "off_topic"]
  const statsBothBody = {
    createdAtFrom,
    createdAtTo,
    updatedAtFrom: undefined,
    updatedAtTo: undefined,
    targetTypes: undefined,
    reporterTypes: undefined,
    reasonCodes: ["spam", "off_topic"],
    actions: undefined,
    statuses: undefined,
  } satisfies IDiscussionBoardReportByStatusStatistics.IRequest;

  const statsBoth: IDiscussionBoardReportByStatusStatistics =
    await api.functional.discussionBoard.adminUser.reports.statistics.byStatus.indexByStatus(
      connection,
      { body: statsBothBody },
    );
  typia.assert(statsBoth);

  const sumBoth = sumCounts(statsBoth);

  // Validate that combined filter does not produce fewer results than individual filters summed
  TestValidator.predicate(
    "combined reasonCodes spam+off_topic should have count at least as large as sum of individual reasons",
    () => sumBoth >= sumSpam + sumOffTopic,
  );

  // 13. Validate createdAt window by querying a future-only window that should exclude both reports
  const futureFromMs = maxCreatedMs + 60 * 60 * 1000; // 1 hour after last report
  const futureToMs = futureFromMs + 60 * 60 * 1000; // another hour later
  const futureFrom = new Date(futureFromMs).toISOString();
  const futureTo = new Date(futureToMs).toISOString();

  const statsFutureBody = {
    createdAtFrom: futureFrom,
    createdAtTo: futureTo,
    updatedAtFrom: undefined,
    updatedAtTo: undefined,
    targetTypes: undefined,
    reporterTypes: undefined,
    reasonCodes: ["spam", "off_topic"],
    actions: undefined,
    statuses: undefined,
  } satisfies IDiscussionBoardReportByStatusStatistics.IRequest;

  const statsFuture: IDiscussionBoardReportByStatusStatistics =
    await api.functional.discussionBoard.adminUser.reports.statistics.byStatus.indexByStatus(
      connection,
      { body: statsFutureBody },
    );
  typia.assert(statsFuture);

  const sumFuture = sumCounts(statsFuture);

  TestValidator.equals(
    "future-only createdAt window should have no matching reports for spam/off_topic",
    sumFuture,
    0,
  );
}
