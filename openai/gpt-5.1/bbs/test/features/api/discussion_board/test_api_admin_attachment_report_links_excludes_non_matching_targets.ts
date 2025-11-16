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

export async function test_api_admin_attachment_report_links_excludes_non_matching_targets(
  connection: api.IConnection,
) {
  // 1. Create admin user via join to obtain admin token
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: RandomGenerator.alphaNumeric(12),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create member user via join to obtain member token
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: "Seoul",
    ip: RandomGenerator.alphaNumeric(10),
    href: "https://board.example.com/join",
    referrer: "https://board.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. Switch context back to admin for category creation
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: RandomGenerator.alphaNumeric(10),
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLogin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 4. Create an article category as admin
  const categoryBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // 5. Switch to member context for article and content creation
  const memberLoginBody = {
    email: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: RandomGenerator.alphaNumeric(10),
    href: "https://board.example.com/login",
    referrer: "https://board.example.com/landing",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberLogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  // 6. Create an article in the created category
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      { body: articleBody },
    );
  typia.assert(article);

  // 7. Create two attachments under the article
  const attachmentBodyA = {
    file_uri: "https://cdn.example.com/files/attachment-a.bin",
    file_name: "attachment-a.bin",
    content_type: "application/octet-stream",
    file_size: 1024,
    order_in_article: 1,
    status: "active",
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachmentA: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.memberUser.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentBodyA,
      },
    );
  typia.assert(attachmentA);

  const attachmentBodyB = {
    file_uri: "https://cdn.example.com/files/attachment-b.bin",
    file_name: "attachment-b.bin",
    content_type: "application/octet-stream",
    file_size: 2048,
    order_in_article: 2,
    status: "active",
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachmentB: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.memberUser.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentBodyB,
      },
    );
  typia.assert(attachmentB);

  // 8. Create a comment on the article (used for non-attachment report target)
  const commentBody = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
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

  // 9. Create reports with mixed targets as member
  const baseCategory = "spam";

  // Reports for attachment A
  const reportForAttachmentABody1 = {
    category: baseCategory,
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    target_attachment_id: attachmentA.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const reportForAttachmentA1: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportForAttachmentABody1,
    });
  typia.assert(reportForAttachmentA1);

  const reportForAttachmentABody2 = {
    category: baseCategory,
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    target_attachment_id: attachmentA.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const reportForAttachmentA2: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportForAttachmentABody2,
    });
  typia.assert(reportForAttachmentA2);

  const attachmentAReportIds: string[] = [
    reportForAttachmentA1.id,
    reportForAttachmentA2.id,
  ];

  // Report for attachment B
  const reportForAttachmentBBody = {
    category: baseCategory,
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    target_attachment_id: attachmentB.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const reportForAttachmentB: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportForAttachmentBBody,
    });
  typia.assert(reportForAttachmentB);

  // Report for the article itself
  const reportForArticleBody = {
    category: baseCategory,
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    target_article_id: article.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const reportForArticle: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportForArticleBody,
    });
  typia.assert(reportForArticle);

  // Report for the comment
  const reportForCommentBody = {
    category: baseCategory,
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    target_comment_id: comment.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const reportForComment: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportForCommentBody,
    });
  typia.assert(reportForComment);

  // 10. Switch context back to admin for reportLinks listing
  const adminLoginAgainBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: RandomGenerator.alphaNumeric(10),
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/reports",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLoginAgain: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginAgainBody,
    });
  typia.assert(adminLoginAgain);

  // 11. Call reportLinks index for attachment A
  const requestBody = {
    page: 1,
    limit: 20,
    status: undefined,
    target_type: undefined,
    reporter_type: undefined,
    created_from: undefined,
    created_to: undefined,
    order_by: undefined,
    order_direction: undefined,
  } satisfies IDiscussionBoardReport.IRequest;

  const page: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.adminUser.articles.attachments.reportLinks.index(
      connection,
      {
        articleId: article.id,
        attachmentId: attachmentA.id,
        body: requestBody,
      },
    );
  typia.assert(page);

  // 12. Validate that only attachmentA reports are returned
  const returnedIds = page.data.map((summary) => summary.id);

  // All returned reports must declare target_type "attachment" (attachment-scoped listing)
  await TestValidator.predicate(
    "all returned reports have target_type 'attachment'",
    async () =>
      page.data.every((summary) => summary.target_type === "attachment"),
  );

  // All returned reports must be among the attachmentAReportIds
  await TestValidator.predicate(
    "all returned reports are for attachment A",
    async () => returnedIds.every((id) => attachmentAReportIds.includes(id)),
  );

  // All attachmentA reports must be present in the response
  await TestValidator.predicate(
    "all attachment A reports are included in listing",
    async () => attachmentAReportIds.every((id) => returnedIds.includes(id)),
  );

  // Ensure that no report for attachment B, article, or comment appears
  await TestValidator.predicate(
    "no non-matching target reports are returned",
    async () =>
      !returnedIds.includes(reportForAttachmentB.id) &&
      !returnedIds.includes(reportForArticle.id) &&
      !returnedIds.includes(reportForComment.id),
  );

  // Optional: basic pagination sanity check
  await TestValidator.predicate(
    "pagination records is at least data length",
    async () => page.pagination.records >= page.data.length,
  );
}
