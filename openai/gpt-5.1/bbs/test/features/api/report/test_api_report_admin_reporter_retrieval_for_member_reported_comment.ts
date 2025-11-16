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
import type { IDiscussionBoardReportOfAdminusers } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportOfAdminusers";

/**
 * Validate retrieval of the admin reporter association for an admin-originated
 * report on a member-authored comment.
 *
 * Business flow:
 *
 * 1. Register an adminUser and obtain its authorized session.
 * 2. Register a memberUser who will author an article and comment.
 * 3. As adminUser, create an article category used for the member article.
 * 4. As memberUser, create an article in that category.
 * 5. As memberUser, create a comment on the article.
 * 6. As adminUser, file a report targeting the member comment (target_comment_id).
 * 7. As adminUser, retrieve the admin reporter association for that report and
 *    verify that it links back to the correct admin and report summary.
 */
export async function test_api_report_admin_reporter_retrieval_for_member_reported_comment(
  connection: api.IConnection,
) {
  // 1. Admin registration (join) to create an adminUser account and get tokens.
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinBody = {
    email: adminEmail,
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
    display_name: RandomGenerator.name(2),
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

  // 2. Member registration (join) to create a memberUser account.
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberJoinBody = {
    email: memberEmail,
    password: "MemberPassw0rd!",
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: "Seoul, Korea",
    ip: "127.0.0.1",
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberJoinOutput: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberJoinOutput);

  // 3. Switch back to adminUser by logging in and then create an article category.
  const adminLoginBody = {
    email: adminEmail,
    password: "AdminPassw0rd!",
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLoginOutput: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginOutput);

  const categoryCode = `CAT_${RandomGenerator.alphaNumeric(8)}`;
  const categoryCreateBody = {
    code: categoryCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    order: 1 as number & tags.Type<"int32">,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const categoryOutput: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(categoryOutput);

  // 4. Switch to memberUser and create an article under the created category.
  const memberLoginBody = {
    email: memberEmail,
    password: "MemberPassw0rd!",
    ip: "127.0.0.1",
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/landing",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberLoginOutput: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginOutput);

  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: categoryOutput.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const articleOutput: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(articleOutput);

  // 5. As memberUser, create a comment on the article.
  const commentCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const commentOutput: IDiscussionBoardComment =
    await api.functional.discussionBoard.memberUser.articles.comments.create(
      connection,
      {
        articleId: articleOutput.id,
        body: commentCreateBody,
      },
    );
  typia.assert(commentOutput);

  // 6. Switch back to adminUser and create a report targeting the member comment.
  const adminLoginForReportOutput: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginForReportOutput);

  const reportCategory = "hate_abuse";
  const reportReason = RandomGenerator.paragraph({ sentences: 3 });

  const reportCreateBody = {
    category: reportCategory,
    reason: reportReason,
    target_comment_id: commentOutput.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const reportOutput: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert(reportOutput);

  // Validate report core fields before fetching the admin reporter association.
  TestValidator.equals(
    "report target_type should be 'comment'",
    reportOutput.target_type,
    "comment",
  );
  TestValidator.equals(
    "report reporter_type should be 'adminuser' for admin-originated report",
    reportOutput.reporter_type,
    "adminuser",
  );
  TestValidator.equals(
    "report reason_code should match category",
    reportOutput.reason_code,
    reportCategory,
  );
  TestValidator.equals(
    "report description should reflect reason text",
    reportOutput.description,
    reportReason,
  );

  // 7. Retrieve the admin reporter association for the created report.
  const adminReporterOutput: IDiscussionBoardReportOfAdminusers =
    await api.functional.discussionBoard.adminUser.reports.reporter.adminUser.at(
      connection,
      {
        reportId: reportOutput.id,
      },
    );
  typia.assert(adminReporterOutput);

  // Validate that the association links the correct report and admin.
  TestValidator.equals(
    "association.discussion_board_report_id matches report id",
    adminReporterOutput.discussion_board_report_id,
    reportOutput.id,
  );
  TestValidator.equals(
    "association.discussion_board_adminuser_id matches admin id",
    adminReporterOutput.discussion_board_adminuser_id,
    adminLoginForReportOutput.id,
  );

  // Validate nested report summary alignment.
  TestValidator.equals(
    "nested report.id matches original report id",
    adminReporterOutput.report.id,
    reportOutput.id,
  );
  TestValidator.equals(
    "nested report.target_type matches original",
    adminReporterOutput.report.target_type,
    reportOutput.target_type,
  );
  TestValidator.equals(
    "nested report.reporter_type matches original",
    adminReporterOutput.report.reporter_type,
    reportOutput.reporter_type,
  );
  TestValidator.equals(
    "nested report.reason_code matches original",
    adminReporterOutput.report.reason_code,
    reportOutput.reason_code,
  );
  TestValidator.equals(
    "nested report.status matches original",
    adminReporterOutput.report.status,
    reportOutput.status,
  );
  TestValidator.equals(
    "nested report.action matches original",
    adminReporterOutput.report.action,
    reportOutput.action,
  );

  // Validate nested adminUser summary alignment with known admin identity.
  TestValidator.equals(
    "nested adminUser.id matches admin id",
    adminReporterOutput.adminUser.id,
    adminLoginForReportOutput.id,
  );
  TestValidator.equals(
    "nested adminUser.email matches admin email",
    adminReporterOutput.adminUser.email,
    adminEmail,
  );
  TestValidator.predicate(
    "nested adminUser.display_name should be non-empty",
    adminReporterOutput.adminUser.display_name.length > 0,
  );
  TestValidator.predicate(
    "nested adminUser.account_status should be non-empty",
    adminReporterOutput.adminUser.account_status.length > 0,
  );
  TestValidator.predicate(
    "nested adminUser.created_at should be a non-empty timestamp string",
    adminReporterOutput.adminUser.created_at.length > 0,
  );
}
