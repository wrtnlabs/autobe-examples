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
 * Validate attachment-report linkage and error handling for admin attachment
 * report detail.
 *
 * Business intent
 *
 * - Ensure that when a discussion-board report properly targets an attachment,
 *   the admin-only detail endpoint
 *   `/discussionBoard/adminUser/reports/{reportId}/attachment` returns a fully
 *   hydrated `IDiscussionBoardReportOfAttachment.IInvert` object with
 *   consistent IDs between the report and the attachment.
 * - Ensure that when the admin queries this endpoint with a non-existent
 *   reportId, the system raises an error instead of returning a malformed or
 *   partially populated DTO.
 *
 * Because the public API surface does not expose any direct way to delete or
 * corrupt link rows in `discussion_board_report_of_attachments`, this test
 * approximates the original "missing link row" scenario by asserting that an
 * unknown reportId yields an error, while a valid report with a legitimate link
 * succeeds and returns consistent linkage information.
 *
 * High-level steps
 *
 * 1. Admin join: create an adminUser using POST /auth/adminUser/join and rely on
 *    the SDK to set the Authorization header for adminUser.
 * 2. Admin creates category: call POST
 *    /discussionBoard/adminUser/articleCategories to get a usable article
 *    category id.
 * 3. Member join: create a memberUser using POST /auth/memberUser/join; the
 *    Authorization header now points to the member actor.
 * 4. Member creates article: call POST /discussionBoard/memberUser/articles with
 *    the category id from step 2 to get articleId.
 * 5. Member attaches file: call POST
 *    /discussionBoard/memberUser/articles/{articleId}/attachments to register
 *    an attachment under the article and capture attachmentId.
 * 6. Member reports attachment: call POST /discussionBoard/memberUser/reports with
 *    `target_attachment_id` set to attachmentId and no article/comment targets;
 *    capture report.id.
 * 7. Admin login: log back in as the same admin using POST /auth/adminUser/login
 *    so that the Authorization token is for adminUser when calling the admin
 *    endpoint.
 * 8. Happy path check: call GET
 *    /discussionBoard/adminUser/reports/{reportId}/attachment using the
 *    reportId from step 6, assert that:
 *
 *    - The response passes `typia.assert<...>()`.
 *    - `invert.discussion_board_report_id === report.id`.
 *    - `invert.report.id === report.id`.
 *    - `invert.attachment.id === attachment.id`.
 *    - `invert.attachment.discussion_board_article_id === article.id`.
 * 9. Error path check for unknown report: generate a new random UUID that differs
 *    from `report.id`, and wrap a call to the same endpoint in `await
 *    TestValidator.error(...)` to ensure an error is thrown instead of a
 *    success DTO.
 */
export async function test_api_admin_report_attachment_detail_missing_link(
  connection: api.IConnection,
) {
  // 1. Admin join - creates an adminUser and sets Authorization header.
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: "Password123!",
    display_name: RandomGenerator.name(),
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

  // 2. Admin creates article category.
  const categoryCreateBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(category);

  // 3. Member join - switches Authorization to memberUser.
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberJoinBody = {
    email: memberEmail,
    password: "Password123!",
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: "Seoul",
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Member creates article.
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      { body: articleCreateBody },
    );
  typia.assert(article);

  // 5. Member attaches file to article.
  const attachmentCreateBody = {
    file_uri: "https://cdn.example.com/files/attachment1.dat",
    file_name: "attachment1.dat",
    content_type: "application/octet-stream",
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

  // 6. Member reports the attachment.
  const reportCreateBody = {
    category: "spam",
    reason: RandomGenerator.paragraph({ sentences: 1 }),
    target_article_id: undefined,
    target_comment_id: undefined,
    target_attachment_id: attachment.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert(report);

  // 7. Admin login again so that subsequent admin endpoints run in admin context.
  const adminLoginBody = {
    email: adminEmail,
    password: "Password123!",
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLoggedIn: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 8. Happy path: admin fetches attachment-report invert DTO.
  const invert: IDiscussionBoardReportOfAttachment.IInvert =
    await api.functional.discussionBoard.adminUser.reports.attachment.at(
      connection,
      { reportId: report.id },
    );
  typia.assert(invert);

  // Validate linkage consistency between report and attachment.
  TestValidator.equals(
    "invert.discussion_board_report_id should equal report.id",
    invert.discussion_board_report_id,
    report.id,
  );

  TestValidator.equals(
    "invert.report.id should equal report.id",
    invert.report.id,
    report.id,
  );

  TestValidator.equals(
    "invert.attachment.id should equal attachment.id",
    invert.attachment.id,
    attachment.id,
  );

  TestValidator.equals(
    "invert.attachment.discussion_board_article_id should equal article.id",
    invert.attachment.discussion_board_article_id,
    article.id,
  );

  // 9. Error behavior: calling with an unknown reportId must throw instead of returning DTO.
  const unknownReportId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Make sure we intentionally avoid using the real report.id
  TestValidator.notEquals(
    "unknownReportId should differ from real report.id",
    unknownReportId,
    report.id,
  );

  await TestValidator.error("unknown reportId should cause error", async () => {
    await api.functional.discussionBoard.adminUser.reports.attachment.at(
      connection,
      { reportId: unknownReportId },
    );
  });
}
