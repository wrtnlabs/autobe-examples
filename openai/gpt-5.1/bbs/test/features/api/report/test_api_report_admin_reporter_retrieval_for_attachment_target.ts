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
import type { IDiscussionBoardReportOfAdminusers } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportOfAdminusers";

export async function test_api_report_admin_reporter_retrieval_for_attachment_target(
  connection: api.IConnection,
) {
  // 1. Admin registration (join) to obtain admin identity and authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: "127.0.0.1",
    href: "https://admin.discussion-board.test/join",
    referrer: "https://admin.discussion-board.test/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Member registration (join) to create content owner
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: "Seoul",
    ip: "127.0.0.1",
    href: "https://discussion-board.test/join",
    referrer: "https://discussion-board.test/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. As admin, create an article category used by the member’s article
  await api.functional.auth.adminUser.login(connection, {
    body: {
      email: adminJoinBody.email,
      password: adminJoinBody.password,
      ip: "127.0.0.1",
      href: "https://admin.discussion-board.test/login",
      referrer: "https://admin.discussion-board.test/landing",
    } satisfies IDiscussionBoardAdminUserLogin.IRequest,
  });

  const categoryCreateBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    order: 1 as number & tags.Type<"int32">,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 4. Switch to member and create an article in that category
  await api.functional.auth.memberUser.login(connection, {
    body: {
      email: memberJoinBody.email,
      password: memberJoinBody.password,
      ip: "127.0.0.1",
      href: "https://discussion-board.test/login",
      referrer: "https://discussion-board.test/landing",
    } satisfies IDiscussionBoardMemberUserLogin.IRequest,
  });

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

  TestValidator.equals(
    "article.category.id should equal created category.id",
    article.category.id,
    category.id,
  );

  // 5. Create an attachment under this article as the member
  const attachmentCreateBody = {
    file_uri:
      "https://cdn.discussion-board.test/files/" +
      RandomGenerator.alphaNumeric(12),
    file_name: `attachment_${RandomGenerator.alphaNumeric(8)}.txt`,
    content_type: "text/plain",
    file_size: 1024 as number & tags.Type<"int32"> & tags.Minimum<0>,
    order_in_article: 1 as number & tags.Type<"int32">,
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

  TestValidator.equals(
    "attachment.discussion_board_article_id should equal article.id",
    attachment.discussion_board_article_id,
    article.id,
  );

  // 6. Switch back to admin and create an attachment-target report
  await api.functional.auth.adminUser.login(connection, {
    body: {
      email: adminJoinBody.email,
      password: adminJoinBody.password,
      ip: "127.0.0.1",
      href: "https://admin.discussion-board.test/login2",
      referrer: "https://admin.discussion-board.test/landing2",
    } satisfies IDiscussionBoardAdminUserLogin.IRequest,
  });

  const reportCreateBody = {
    category: "spam" as string & tags.MinLength<1>,
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    target_attachment_id: attachment.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert(report);

  TestValidator.equals(
    "report target_type should be attachment",
    report.target_type,
    "attachment",
  );

  TestValidator.equals(
    "report reporter_type should be adminuser",
    report.reporter_type,
    "adminuser",
  );

  TestValidator.equals(
    "report reason_code should match category",
    report.reason_code,
    reportCreateBody.category,
  );

  // 7. Retrieve the admin reporter association via admin reporter endpoint
  const link: IDiscussionBoardReportOfAdminusers =
    await api.functional.discussionBoard.adminUser.reports.reporter.adminUser.at(
      connection,
      {
        reportId: report.id,
      },
    );
  typia.assert(link);

  // Validate top-level association fields
  TestValidator.equals(
    "link.discussion_board_report_id should equal report.id",
    link.discussion_board_report_id,
    report.id,
  );

  TestValidator.equals(
    "link.discussion_board_adminuser_id should equal admin user id",
    link.discussion_board_adminuser_id,
    adminAuthorized.id,
  );

  // Validate nested report summary
  TestValidator.equals(
    "nested report summary id should equal report.id",
    link.report.id,
    report.id,
  );

  TestValidator.equals(
    "nested report summary target_type should be attachment",
    link.report.target_type,
    "attachment",
  );

  TestValidator.equals(
    "nested report summary reporter_type should be adminuser",
    link.report.reporter_type,
    "adminuser",
  );

  TestValidator.equals(
    "nested report summary reason_code should match original",
    link.report.reason_code,
    report.reason_code,
  );

  TestValidator.equals(
    "nested report summary status should match original",
    link.report.status,
    report.status,
  );

  TestValidator.equals(
    "nested report summary action should match original",
    link.report.action,
    report.action,
  );

  // Validate nested admin user summary
  TestValidator.equals(
    "nested adminUser summary id should equal adminAuthorized.id",
    link.adminUser.id,
    adminAuthorized.id,
  );

  TestValidator.equals(
    "nested adminUser summary email should equal adminAuthorized.email",
    link.adminUser.email,
    adminAuthorized.email,
  );

  TestValidator.equals(
    "nested adminUser summary display_name should equal adminAuthorized.displayName",
    link.adminUser.display_name,
    adminAuthorized.displayName,
  );

  // Ensure account_status is a non-empty string for sanity
  TestValidator.predicate(
    "nested adminUser summary account_status should be non-empty",
    link.adminUser.account_status.length > 0,
  );
}
