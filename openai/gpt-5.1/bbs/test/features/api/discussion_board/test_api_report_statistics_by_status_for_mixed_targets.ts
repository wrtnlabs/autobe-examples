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

export async function test_api_report_statistics_by_status_for_mixed_targets(
  connection: api.IConnection,
) {
  // 1. Register admin user (adminUser join)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinBody = {
    email: adminEmail,
    password: "AdminPassw0rd!",
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Register member user (memberUser join)
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberJoinBody = {
    email: memberEmail,
    password: "MemberPassw0rd!",
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: "Seoul, Korea",
    ip: null,
    href: "https://board.example.com/join",
    referrer: "https://board.example.com/home",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // After member join, the SDK has switched Authorization to member token.
  // 3. We need admin auth again to create category, so login as admin.
  const adminLoginBody = {
    email: adminEmail,
    password: "AdminPassw0rd!",
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/join-complete",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLoginResult: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginResult);

  // 4. Create article category as admin
  const categoryCreateBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 5. Switch to member auth for content creation, via member login
  const memberLoginBody = {
    email: memberEmail,
    password: "MemberPassw0rd!",
    ip: null,
    href: "https://board.example.com/login",
    referrer: "https://board.example.com/join-complete",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberLoginResult: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginResult);

  // 6. Create article as member
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
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

  // 7. Create comment on the article as member
  const commentCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.memberUser.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 8. Create attachment on the article as member
  const attachmentCreateBody = {
    file_uri:
      "https://cdn.example.com/files/" + RandomGenerator.alphaNumeric(16),
    file_name: "test-attachment.txt",
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
        body: attachmentCreateBody,
      },
    );
  typia.assert(attachment);

  // 9. Create three reports for article, comment, and attachment
  const articleReportBody = {
    category: "hate_abuse",
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    target_article_id: article.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const articleReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: articleReportBody,
    });
  typia.assert(articleReport);

  const commentReportBody = {
    category: "harassment",
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    target_comment_id: comment.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const commentReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: commentReportBody,
    });
  typia.assert(commentReport);

  const attachmentReportBody = {
    category: "spam",
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    target_attachment_id: attachment.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const attachmentReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: attachmentReportBody,
    });
  typia.assert(attachmentReport);

  const createdReports: IDiscussionBoardReport[] = [
    articleReport,
    commentReport,
    attachmentReport,
  ];

  // 10. Switch back to admin auth to call statistics endpoint
  const adminReloginBody = {
    email: adminEmail,
    password: "AdminPassw0rd!",
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminReloginResult: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminReloginBody,
    });
  typia.assert(adminReloginResult);

  // 11. Call statistics endpoint with wide filter (empty body)
  const statsRequestBody =
    {} satisfies IDiscussionBoardReportByStatusStatistics.IRequest;

  const statistics: IDiscussionBoardReportByStatusStatistics =
    await api.functional.discussionBoard.adminUser.reports.statistics.byStatus.indexByStatus(
      connection,
      {
        body: statsRequestBody,
      },
    );
  typia.assert(statistics);

  // Business validations on statistics
  const items = statistics.items;

  // Ensure at least one status bucket exists
  TestValidator.predicate(
    "statistics should contain at least one status bucket",
    items.length > 0,
  );

  // Sum counts across all buckets and ensure equals number of created reports
  const totalReportedCount = items.reduce(
    (acc, item) => acc + item.count,
    0 as number,
  );

  TestValidator.equals(
    "total statistics count should equal number of created reports",
    totalReportedCount,
    createdReports.length,
  );

  // 12. Verify unauthorized access when authenticated as member
  // Switch back to member via login
  const memberReloginBody = {
    email: memberEmail,
    password: "MemberPassw0rd!",
    ip: null,
    href: "https://board.example.com/login",
    referrer: "https://board.example.com/article",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberReloginResult: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberReloginBody,
    });
  typia.assert(memberReloginResult);

  const memberStatsRequestBody =
    {} satisfies IDiscussionBoardReportByStatusStatistics.IRequest;

  await TestValidator.error(
    "member user must not access admin report statistics by status",
    async () => {
      await api.functional.discussionBoard.adminUser.reports.statistics.byStatus.indexByStatus(
        connection,
        {
          body: memberStatsRequestBody,
        },
      );
    },
  );
}
