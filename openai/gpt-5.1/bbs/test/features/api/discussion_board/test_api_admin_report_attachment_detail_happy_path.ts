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
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardReportOfAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportOfAttachment";

/**
 * Validate admin retrieval of attachment-targeting report detail (happy path).
 *
 * This scenario ensures that a report filed by a member user against an article
 * attachment can be inspected by an admin via the dedicated attachment-detail
 * endpoint. It builds all upstream entities (admin, category, member, article,
 * attachment, report) through real APIs and then asserts that GET
 * /discussionBoard/adminUser/reports/{reportId}/attachment returns an
 * IDiscussionBoardReportOfAttachment.IInvert object whose nested report and
 * attachment metadata exactly match the previously created entities.
 *
 * Steps:
 *
 * 1. Admin joins (auth.adminUser.join) to obtain initial admin session.
 * 2. Admin creates an article category
 *    (/discussionBoard/adminUser/articleCategories.create).
 * 3. Member joins (auth.memberUser.join) to obtain a member session.
 * 4. Member creates an article under the category
 *    (/discussionBoard/memberUser/articles.create).
 * 5. Member creates an attachment for that article
 *    (/discussionBoard/memberUser/articles/{articleId}/attachments.create).
 * 6. Member files a report targeting the attachment only
 *    (/discussionBoard/memberUser/reports.create).
 * 7. Admin logs in again (auth.adminUser.login) to ensure the admin context.
 * 8. Admin fetches attachment detail for the report via
 *    /discussionBoard/adminUser/reports/{reportId}/attachment.
 * 9. The test asserts that:
 *
 *    - The invert link connects the same report and attachment ids.
 *    - The nested report summary mirrors the created report.
 *    - The nested attachment summary mirrors the created attachment and points back
 *         to the correct article.
 */
export async function test_api_admin_report_attachment_detail_happy_path(
  connection: api.IConnection,
) {
  // 1. Admin joins to create an administrative user and start an admin session.
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "AdminPassword123!",
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminJoinResult: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IDiscussionBoardAdminuser.IAuthorized>(adminJoinResult);

  const adminEmail: string = adminJoinResult.email;

  // 2. Admin creates a new article category for the discussion board.
  const articleCategoryBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: articleCategoryBody,
      },
    );
  typia.assert<IDiscussionBoardArticleCategory>(category);

  // 3. Member joins to create a member user session.
  const memberJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@member.example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 4 }),
    location: "Seoul, Korea",
    ip: null,
    href: "https://board.example.com/join",
    referrer: "https://board.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<IDiscussionBoardMemberuser.IAuthorized>(memberAuthorized);

  // 4. Member creates a discussion article under the created category.
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
  typia.assert<IDiscussionBoardArticle>(article);

  // 5. Member creates an attachment for that article.
  const attachmentBody = {
    file_uri: `https://cdn.example.com/files/${RandomGenerator.alphaNumeric(12)}`,
    file_name: `${RandomGenerator.alphabets(6)}.png`,
    content_type: "image/png",
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    order_in_article: typia.random<number & tags.Type<"int32">>(),
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
  typia.assert<IDiscussionBoardAttachment>(attachment);

  TestValidator.equals(
    "attachment parent article id should match article.id",
    attachment.discussion_board_article_id,
    article.id,
  );

  // 6. Member files a report targeting the created attachment.
  const reportCreateBody = {
    category: "spam",
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    target_attachment_id: attachment.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert<IDiscussionBoardReport>(report);

  TestValidator.equals(
    "reason_code should mirror creation category",
    report.reason_code,
    reportCreateBody.category,
  );

  // 7. Switch back to admin context via admin login.
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLoginResult: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IDiscussionBoardAdminuser.IAuthorized>(adminLoginResult);

  // 8. Admin fetches the attachment-detail view for this report.
  const invert: IDiscussionBoardReportOfAttachment.IInvert =
    await api.functional.discussionBoard.adminUser.reports.attachment.at(
      connection,
      {
        reportId: report.id,
      },
    );
  typia.assert<IDiscussionBoardReportOfAttachment.IInvert>(invert);

  // 9. Validate top-level link fields.
  TestValidator.equals(
    "invert.discussion_board_report_id matches report.id",
    invert.discussion_board_report_id,
    report.id,
  );
  TestValidator.equals(
    "invert.discussion_board_attachment_id matches attachment.id",
    invert.discussion_board_attachment_id,
    attachment.id,
  );

  // Validate nested report summary.
  const summaryReport: IDiscussionBoardReportOfAttachment.IReportSummary =
    invert.report;
  TestValidator.equals(
    "nested report.id matches report.id",
    summaryReport.id,
    report.id,
  );
  TestValidator.equals(
    "nested report.target_type matches base report.target_type",
    summaryReport.target_type,
    report.target_type,
  );
  TestValidator.equals(
    "nested report.reporter_type matches base report.reporter_type",
    summaryReport.reporter_type,
    report.reporter_type,
  );
  TestValidator.equals(
    "nested report.reason_code matches base report.reason_code",
    summaryReport.reason_code,
    report.reason_code,
  );
  TestValidator.equals(
    "nested report.description matches base report.description",
    summaryReport.description,
    report.description,
  );
  TestValidator.equals(
    "nested report.status matches base report.status",
    summaryReport.status,
    report.status,
  );
  TestValidator.equals(
    "nested report.action matches base report.action",
    summaryReport.action,
    report.action,
  );
  TestValidator.equals(
    "nested report.created_at matches base report.created_at",
    summaryReport.created_at,
    report.created_at,
  );
  TestValidator.equals(
    "nested report.updated_at matches base report.updated_at",
    summaryReport.updated_at,
    report.updated_at,
  );

  // Validate nested attachment summary.
  const summaryAttachment: IDiscussionBoardReportOfAttachment.IAttachmentSummary =
    invert.attachment;
  TestValidator.equals(
    "nested attachment.id matches attachment.id",
    summaryAttachment.id,
    attachment.id,
  );
  TestValidator.equals(
    "nested attachment.article id matches attachment.article id",
    summaryAttachment.discussion_board_article_id,
    attachment.discussion_board_article_id,
  );
  TestValidator.equals(
    "nested attachment.file_uri matches original",
    summaryAttachment.file_uri,
    attachment.file_uri,
  );
  TestValidator.equals(
    "nested attachment.file_name matches original",
    summaryAttachment.file_name,
    attachment.file_name,
  );
  TestValidator.equals(
    "nested attachment.content_type matches original",
    summaryAttachment.content_type,
    attachment.content_type,
  );
  TestValidator.equals(
    "nested attachment.file_size matches original",
    summaryAttachment.file_size,
    attachment.file_size,
  );
  TestValidator.equals(
    "nested attachment.order_in_article matches original",
    summaryAttachment.order_in_article,
    attachment.order_in_article,
  );
  TestValidator.equals(
    "nested attachment.status matches original",
    summaryAttachment.status,
    attachment.status,
  );
  TestValidator.equals(
    "nested attachment.created_at matches original",
    summaryAttachment.created_at,
    attachment.created_at,
  );
  TestValidator.equals(
    "nested attachment.updated_at matches original",
    summaryAttachment.updated_at,
    attachment.updated_at,
  );
}
