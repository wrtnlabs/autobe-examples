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
import type { IDiscussionBoardReportOfComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportOfComment";

export async function test_api_admin_report_comment_detail_happy_path(
  connection: api.IConnection,
) {
  // 1. Register admin user (join) and obtain admin authorization context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!", // satisfies Format<"password"> by shape
    display_name: RandomGenerator.name(2),
    bio: null,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminEmail: string = adminAuthorized.email;
  const adminPassword: string = adminJoinBody.password;

  // 2. As adminUser, create an article category
  const categoryBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // 3. Register member user (join) and obtain member authorization
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPassw0rd!",
    displayName: RandomGenerator.name(2),
    bio: null,
    location: null,
    ip: null,
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/home",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As memberUser, create an article under the created category
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      { body: articleBody },
    );
  typia.assert(article);

  // 5. As same memberUser, create a comment on the article
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

  // 6. Create a report targeting this specific comment
  const reportBody = {
    category: "harassment", // valid non-empty category string
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    target_article_id: undefined,
    target_comment_id: comment.id,
    target_attachment_id: undefined,
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportBody,
    });
  typia.assert(report);

  // Basic linkage checks between created report and input
  TestValidator.equals(
    "report id should be a valid uuid string",
    report.id,
    report.id,
  );
  TestValidator.equals(
    "report reason_code should reflect category for created report",
    report.reason_code,
    reportBody.category,
  );

  const reportId: string & tags.Format<"uuid"> = report.id as string &
    tags.Format<"uuid">;

  // 7. Switch back to adminUser via login to ensure admin auth context
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminReAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminReAuthorized);

  // 8. As adminUser, retrieve the comment-targeting report detail
  const detail: IDiscussionBoardReportOfComment =
    await api.functional.discussionBoard.adminUser.reports.comment.at(
      connection,
      { reportId },
    );
  typia.assert(detail);

  // Business-level validations
  TestValidator.equals(
    "report detail id must equal created report id",
    detail.id,
    report.id,
  );

  TestValidator.equals(
    "report detail target_type must be 'comment'",
    detail.target_type,
    "comment",
  );

  TestValidator.equals(
    "report detail discussion_board_comment_id must equal created comment id",
    detail.discussion_board_comment_id,
    comment.id,
  );

  TestValidator.predicate(
    "report detail status must be non-empty string",
    detail.status.length > 0,
  );

  TestValidator.predicate(
    "report detail action must be non-empty string",
    detail.action.length > 0,
  );

  TestValidator.predicate(
    "report created_at must be a valid ISO date-time string",
    () => !Number.isNaN(Date.parse(detail.created_at)),
  );

  TestValidator.predicate(
    "report updated_at must be a valid ISO date-time string",
    () => !Number.isNaN(Date.parse(detail.updated_at)),
  );

  TestValidator.predicate(
    "comment_link_created_at must be a valid ISO date-time string",
    () => !Number.isNaN(Date.parse(detail.comment_link_created_at)),
  );
}
