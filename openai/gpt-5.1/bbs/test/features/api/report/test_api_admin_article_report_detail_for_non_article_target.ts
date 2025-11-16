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
import type { IDiscussionBoardReportOfArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportOfArticle";

/**
 * Verify that the article-specific report detail endpoint rejects non-article
 * targets while succeeding for article-targeting reports.
 *
 * Business goal
 *
 * - Ensure GET /discussionBoard/adminUser/reports/{reportId}/article only works
 *   when the report actually targets an article, and fails when the report is
 *   for a comment or attachment.
 *
 * Steps
 *
 * 1. Admin joins and creates an article category.
 * 2. Member joins and creates an article in that category.
 * 3. Member adds a comment and an attachment to the article.
 * 4. Member files three reports: comment-targeting, attachment-targeting, and
 *    article-targeting.
 * 5. Admin logs in again and calls the article-detail report endpoint with each
 *    report id.
 * 6. Validate that:
 *
 *    - Article-targeting report returns IDiscussionBoardReportOfArticle whose ids
 *         match the created entities.
 *    - Comment-targeting and attachment-targeting reports cause errors when used
 *         with the article-detail endpoint.
 */
export async function test_api_admin_article_report_detail_for_non_article_target(
  connection: api.IConnection,
) {
  // 1) Admin joins (acquires adminUser tokens via SDK side effect)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> =
    "Admin!" + RandomGenerator.alphaNumeric(8);

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2) Admin creates an article category
  const categoryBody = {
    code: "ECONOMY_" + RandomGenerator.alphaNumeric(6),
    name: "Economy " + RandomGenerator.name(1),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // 3) Member joins (memberUser actor) and becomes authenticated
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string = "Member!" + RandomGenerator.alphaNumeric(8);

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: "Seoul, Korea",
    ip: null,
    href: "https://board.example.com/join",
    referrer: "https://board.example.com/",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4) Member creates an article in the category
  const articleBody = {
    title: "Article about macro economy " + RandomGenerator.name(1),
    body: RandomGenerator.content({ paragraphs: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      { body: articleBody },
    );
  typia.assert(article);

  // 5) Member adds a comment to the article
  const commentBody = {
    body: RandomGenerator.paragraph({ sentences: 2 }),
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

  // 6) Member adds an attachment to the article
  const attachmentBody = {
    file_uri:
      "https://cdn.example.com/files/" + RandomGenerator.alphaNumeric(12),
    file_name: "macro-economy-report.pdf",
    content_type: "application/pdf",
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

  // 7) Member files three reports via /discussionBoard/memberUser/reports
  // 7-1) Comment-targeting report
  const commentReportBody = {
    category: "hate_abuse",
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    target_article_id: undefined,
    target_comment_id: comment.id,
    target_attachment_id: undefined,
  } satisfies IDiscussionBoardReport.ICreate;

  const commentReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: commentReportBody,
    });
  typia.assert(commentReport);

  // 7-2) Attachment-targeting report
  const attachmentReportBody = {
    category: "spam",
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    target_article_id: undefined,
    target_comment_id: undefined,
    target_attachment_id: attachment.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const attachmentReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: attachmentReportBody,
    });
  typia.assert(attachmentReport);

  // 7-3) Article-targeting report
  const articleReportBody = {
    category: "off_topic",
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    target_article_id: article.id,
    target_comment_id: undefined,
    target_attachment_id: undefined,
  } satisfies IDiscussionBoardReport.ICreate;

  const articleReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: articleReportBody,
    });
  typia.assert(articleReport);

  // 8) Switch back to adminUser using login to restore admin auth context
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLoggedIn: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 9) Successful path: article-targeting report should return article details
  const articleDetail: IDiscussionBoardReportOfArticle =
    await api.functional.discussionBoard.adminUser.reports.article.at(
      connection,
      {
        reportId: articleReport.id,
      },
    );
  typia.assert(articleDetail);

  TestValidator.equals(
    "article-targeting report id must match",
    articleDetail.report.id,
    articleReport.id,
  );
  TestValidator.equals(
    "article-targeting article id must match",
    articleDetail.article.id,
    article.id,
  );

  // 10) Failure paths: comment- and attachment-targeting reports should fail
  await TestValidator.error(
    "comment-targeting report cannot be resolved by article detail endpoint",
    async () => {
      await api.functional.discussionBoard.adminUser.reports.article.at(
        connection,
        {
          reportId: commentReport.id,
        },
      );
    },
  );

  await TestValidator.error(
    "attachment-targeting report cannot be resolved by article detail endpoint",
    async () => {
      await api.functional.discussionBoard.adminUser.reports.article.at(
        connection,
        {
          reportId: attachmentReport.id,
        },
      );
    },
  );
}
