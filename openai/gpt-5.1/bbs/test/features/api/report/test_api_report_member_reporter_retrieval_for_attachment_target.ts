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
import type { IDiscussionBoardReportOfMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportOfMemberUser";

export async function test_api_report_member_reporter_retrieval_for_attachment_target(
  connection: api.IConnection,
) {
  // 1. Register an admin user and let SDK store admin access token
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: RandomGenerator.alphabets(10),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Register a member user who will own article and attachment and report
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: RandomGenerator.alphabets(10),
    href: "https://board.example.com/join",
    referrer: "https://board.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. As admin, create an article category
  const categoryBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
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

  // 4. Switch to member login to create an article as that member
  const memberLoginBody = {
    email: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: memberJoinBody.ip ?? null,
    href: "https://board.example.com/login",
    referrer: "https://board.example.com/home",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberAfterLogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAfterLogin);

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

  // 5. Create an attachment for that article as member
  const attachmentBody = {
    file_uri:
      "https://cdn.example.com/file/" + RandomGenerator.alphaNumeric(16),
    file_name: "example-image.png",
    content_type: "image/png",
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

  // 6. Create a report targeting the attachment as the member user
  const reportCategory = "hate_abuse";
  const reportCreateBody = {
    category: reportCategory,
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    target_attachment_id: attachment.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert(report);

  // 7. Switch back to admin to query reporter
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: adminJoinBody.ip ?? null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminAfterLogin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAfterLogin);

  const invert: IDiscussionBoardReportOfMemberUser.IInvert =
    await api.functional.discussionBoard.adminUser.reports.reporter.memberUser.at(
      connection,
      {
        reportId: report.id,
      },
    );
  typia.assert(invert);

  // 8. Validate linkage and embedded entities
  TestValidator.equals(
    "invert.discussion_board_report_id should equal created report id",
    invert.discussion_board_report_id,
    report.id,
  );

  TestValidator.equals(
    "invert.discussion_board_memberuser_id should equal reporting member id",
    invert.discussion_board_memberuser_id,
    memberAfterLogin.id,
  );

  TestValidator.equals(
    "embedded report summary id should equal report id",
    invert.report.id,
    report.id,
  );

  TestValidator.equals(
    "embedded report summary target_type should be attachment",
    invert.report.target_type,
    "attachment",
  );

  TestValidator.equals(
    "embedded report summary reporter_type should be memberuser",
    invert.report.reporter_type,
    "memberuser",
  );

  TestValidator.equals(
    "embedded report summary reason_code should match created report category",
    invert.report.reason_code,
    reportCategory,
  );

  TestValidator.equals(
    "embedded memberUser summary id should equal reporting member id",
    invert.memberUser.id,
    memberAfterLogin.id,
  );

  TestValidator.predicate(
    "embedded memberUser display_name should be non-empty",
    invert.memberUser.display_name.length > 0,
  );
}
