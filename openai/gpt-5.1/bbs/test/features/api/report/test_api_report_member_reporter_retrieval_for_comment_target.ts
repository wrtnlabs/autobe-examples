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
import type { IDiscussionBoardReportOfMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportOfMemberUser";

export async function test_api_report_member_reporter_retrieval_for_comment_target(
  connection: api.IConnection,
) {
  // 1. Admin setup via join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassword123!",
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Member setup via join
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPassword123!",
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: "Seoul, Korea",
    ip: "127.0.0.1",
    href: "https://board.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://board.example.com/home" as string & tags.Format<"uri">,
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. Switch back to admin context if needed via admin login
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/dashboard" as string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLoginAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 4. Create article category as admin
  const categoryBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
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

  // 5. Switch to member context via member login
  const memberLoginBody = {
    email: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://board.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://board.example.com/home" as string & tags.Format<"uri">,
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberLoginAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 6. Create article as member in created category
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

  // 7. Create comment for that article as member
  const commentBody = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
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

  // 8. Create report for the comment as member
  const reportBody = {
    category: "spam",
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    target_comment_id: comment.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportBody,
    });
  typia.assert(report);

  // 9. Switch to admin context again via login
  const adminLoginAgain: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAgain);

  // 10. Retrieve member reporter info for the report as admin
  const invert: IDiscussionBoardReportOfMemberUser.IInvert =
    await api.functional.discussionBoard.adminUser.reports.reporter.memberUser.at(
      connection,
      {
        reportId: report.id,
      },
    );
  typia.assert(invert);

  // 11. Validate linkage between report and invert
  TestValidator.equals(
    "invert.discussion_board_report_id matches report.id",
    invert.discussion_board_report_id,
    report.id,
  );

  // 12. Validate member linkage
  TestValidator.equals(
    "invert.discussion_board_memberuser_id matches member.id",
    invert.discussion_board_memberuser_id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "invert.memberUser.id matches member.id",
    invert.memberUser.id,
    memberAuthorized.id,
  );

  // Also ensure login and join IDs are consistent for member
  TestValidator.equals(
    "member login id matches join id",
    memberLoginAuthorized.id,
    memberAuthorized.id,
  );

  // 13. Validate report summary alignment
  TestValidator.equals(
    "invert.report.id matches report.id",
    invert.report.id,
    report.id,
  );
  TestValidator.equals(
    "invert.report.reason_code matches report.reason_code",
    invert.report.reason_code,
    report.reason_code,
  );
  TestValidator.equals(
    "invert.report.status matches report.status",
    invert.report.status,
    report.status,
  );
  TestValidator.equals(
    "invert.report.action matches report.action",
    invert.report.action,
    report.action,
  );

  // 14. Validate member summary fields
  TestValidator.predicate(
    "memberUser.display_name is non-empty",
    invert.memberUser.display_name.length > 0,
  );
  TestValidator.predicate(
    "memberUser.account_status is non-empty",
    invert.memberUser.account_status.length > 0,
  );

  const memberCreatedAt = new Date(invert.memberUser.created_at).getTime();
  const now = Date.now();
  TestValidator.predicate(
    "memberUser.created_at is not in the future",
    memberCreatedAt <= now,
  );

  // 15. Assert that the report target_type is comment (positive path)
  TestValidator.equals(
    "report target_type should be comment",
    report.target_type,
    "comment",
  );
}
