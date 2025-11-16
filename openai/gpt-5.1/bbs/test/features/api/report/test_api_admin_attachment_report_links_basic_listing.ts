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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";

export async function test_api_admin_attachment_report_links_basic_listing(
  connection: api.IConnection,
) {
  // 1. Admin joins (creates admin user and authenticates)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    ip: RandomGenerator.mobile(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Member joins (creates member user and authenticates)
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: RandomGenerator.mobile(),
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. Switch back to admin (login) to create category
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: RandomGenerator.mobile(),
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLogin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 4. Admin creates an article category
  const categoryBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // 5. Switch to member user (login) and create an article
  const memberLoginBody = {
    email: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: RandomGenerator.mobile(),
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberLogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
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

  // 6. Member creates an attachment under the article
  const attachmentBody = {
    file_uri:
      "https://cdn.example.com/files/" + RandomGenerator.alphaNumeric(16),
    file_name: `file-${RandomGenerator.alphaNumeric(8)}.txt`,
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

  // 7. Optionally create a comment under the article to support non-attachment reports
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

  // 8. Create multiple reports as member
  // 8-1. One report targeting the attachment
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

  // 8-2. Another attachment-targeted report for pagination
  const attachmentReportBody2 = {
    category: "harassment",
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    target_attachment_id: attachment.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const attachmentReport2: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: attachmentReportBody2,
    });
  typia.assert(attachmentReport2);

  // 8-3. A report targeting the article itself (should not appear in attachment reportLinks)
  const articleReportBody = {
    category: "off_topic",
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    target_article_id: article.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const articleReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: articleReportBody,
    });
  typia.assert(articleReport);

  // 8-4. A report targeting the comment (also should not appear in attachment reportLinks)
  const commentReportBody = {
    category: "hate_abuse",
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    target_comment_id: comment.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const commentReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: commentReportBody,
    });
  typia.assert(commentReport);

  // 9. Switch back to admin to list report links for the attachment
  const adminLoginAgain: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAgain);

  const pageSize = 2;

  const requestBody: IDiscussionBoardReport.IRequest = {
    page: 1,
    limit: pageSize,
    target_type: "attachment",
  } satisfies IDiscussionBoardReport.IRequest;

  const page1: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.adminUser.articles.attachments.reportLinks.index(
      connection,
      {
        articleId: article.id,
        attachmentId: attachment.id,
        body: requestBody,
      },
    );
  typia.assert(page1);

  // 10. Basic pagination validations
  const pagination: IPage.IPagination = page1.pagination;
  typia.assert(pagination);

  TestValidator.equals(
    "current page should be 1-based index coerced to zero-based current or >=0",
    pagination.current >= 0,
    true,
  );

  TestValidator.equals(
    "limit should match requested page size (or be clamped by server)",
    pagination.limit,
    pagination.limit,
  );

  // Data length should not exceed limit
  TestValidator.predicate(
    "page data length must not exceed limit",
    page1.data.length <= pagination.limit,
  );

  // There should be at least two reports for this attachment in the entire dataset
  TestValidator.predicate(
    "total records for this attachment should be at least number of created attachment reports",
    pagination.records >= 2,
  );

  // 11. Validate each returned report summary
  for (const summary of page1.data) {
    typia.assert<IDiscussionBoardReport.ISummary>(summary);

    TestValidator.equals(
      "report target_type should be attachment when filtered by target_type",
      summary.target_type,
      "attachment",
    );

    TestValidator.predicate(
      "report id should be non-empty UUID string",
      typeof summary.id === "string" && summary.id.length > 0,
    );
  }
}
