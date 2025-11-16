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
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardReportByStatusStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportByStatusStatistics";

export async function test_api_report_statistics_by_status_filtered_by_target_type(
  connection: api.IConnection,
) {
  // 1. Register an admin user (adminUser join implicitly authenticates as admin)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin#" + RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Register a member user (memberUser join implicitly authenticates as member)
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Member#" + RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: "Seoul, Korea",
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/home",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. Switch back to admin to create an article category
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/join-complete",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLogin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  const categoryBody = {
    code: "ECONOMY_" + RandomGenerator.alphaNumeric(6),
    name: "Economy" + " " + RandomGenerator.alphabets(4),
    description: RandomGenerator.paragraph({ sentences: 3 }),
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

  // 4. Switch to member user to create content (article, comment, attachment, reports)
  const memberLoginBody = {
    email: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/join-complete",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberLogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  // 4-1. Member creates an article in the created category
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
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

  // 4-2. Member creates a comment on this article
  const commentBody = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.memberUser.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  // 4-3. Member creates an attachment on this article
  const attachmentBody = {
    file_uri:
      "https://cdn.example.com/files/" + RandomGenerator.alphaNumeric(16),
    file_name: "attachment_" + RandomGenerator.alphaNumeric(8) + ".txt",
    content_type: "text/plain",
    file_size: 1024,
    order_in_article: 1,
    status: "active",
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.memberUser.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentBody,
      },
    );
  typia.assert(attachment);

  // 4-4. Member creates three reports:
  //   - one targeting the article
  //   - one targeting the comment
  //   - one targeting the attachment
  const reasonCategory = "spam" as string;

  const articleReportBody = {
    category: reasonCategory,
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    target_article_id: article.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const articleReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: articleReportBody,
    });
  typia.assert(articleReport);

  const commentReportBody = {
    category: reasonCategory,
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    target_comment_id: comment.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const commentReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: commentReportBody,
    });
  typia.assert(commentReport);

  const attachmentReportBody = {
    category: reasonCategory,
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    target_attachment_id: attachment.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const attachmentReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: attachmentReportBody,
    });
  typia.assert(attachmentReport);

  // 5. Switch to admin again to query statistics
  const adminLoginAgain: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAgain);

  // Helper closure to compute total count from statistics
  const sumCounts = (
    statistics: IDiscussionBoardReportByStatusStatistics,
  ): number => statistics.items.reduce((acc, item) => acc + item.count, 0);

  // 5-1. Filter only article reports
  const articleStatsBody = {
    targetTypes: ["article"],
  } satisfies IDiscussionBoardReportByStatusStatistics.IRequest;

  const articleStats: IDiscussionBoardReportByStatusStatistics =
    await api.functional.discussionBoard.adminUser.reports.statistics.byStatus.indexByStatus(
      connection,
      {
        body: articleStatsBody,
      },
    );
  typia.assert(articleStats);

  const articleTotal = sumCounts(articleStats);
  TestValidator.equals(
    "statistics with targetTypes ['article'] should count exactly 1 report",
    articleTotal,
    1,
  );

  // 5-2. Filter only comment reports
  const commentStatsBody = {
    targetTypes: ["comment"],
  } satisfies IDiscussionBoardReportByStatusStatistics.IRequest;

  const commentStats: IDiscussionBoardReportByStatusStatistics =
    await api.functional.discussionBoard.adminUser.reports.statistics.byStatus.indexByStatus(
      connection,
      {
        body: commentStatsBody,
      },
    );
  typia.assert(commentStats);

  const commentTotal = sumCounts(commentStats);
  TestValidator.equals(
    "statistics with targetTypes ['comment'] should count exactly 1 report",
    commentTotal,
    1,
  );

  // 5-3. Filter only attachment reports
  const attachmentStatsBody = {
    targetTypes: ["attachment"],
  } satisfies IDiscussionBoardReportByStatusStatistics.IRequest;

  const attachmentStats: IDiscussionBoardReportByStatusStatistics =
    await api.functional.discussionBoard.adminUser.reports.statistics.byStatus.indexByStatus(
      connection,
      {
        body: attachmentStatsBody,
      },
    );
  typia.assert(attachmentStats);

  const attachmentTotal = sumCounts(attachmentStats);
  TestValidator.equals(
    "statistics with targetTypes ['attachment'] should count exactly 1 report",
    attachmentTotal,
    1,
  );

  // 5-4. Filter article + comment and ensure additive behavior (should be 2)
  const articleCommentStatsBody = {
    targetTypes: ["article", "comment"],
  } satisfies IDiscussionBoardReportByStatusStatistics.IRequest;

  const articleCommentStats: IDiscussionBoardReportByStatusStatistics =
    await api.functional.discussionBoard.adminUser.reports.statistics.byStatus.indexByStatus(
      connection,
      {
        body: articleCommentStatsBody,
      },
    );
  typia.assert(articleCommentStats);

  const articleCommentTotal = sumCounts(articleCommentStats);
  TestValidator.equals(
    "statistics with targetTypes ['article','comment'] should count exactly 2 reports",
    articleCommentTotal,
    2,
  );

  // 5-5. Filter article + comment + attachment and ensure additive behavior (should be 3)
  const allTargetsStatsBody = {
    targetTypes: ["article", "comment", "attachment"],
  } satisfies IDiscussionBoardReportByStatusStatistics.IRequest;

  const allTargetsStats: IDiscussionBoardReportByStatusStatistics =
    await api.functional.discussionBoard.adminUser.reports.statistics.byStatus.indexByStatus(
      connection,
      {
        body: allTargetsStatsBody,
      },
    );
  typia.assert(allTargetsStats);

  const allTargetsTotal = sumCounts(allTargetsStats);
  TestValidator.equals(
    "statistics with all targetTypes should count exactly 3 reports",
    allTargetsTotal,
    3,
  );
}
