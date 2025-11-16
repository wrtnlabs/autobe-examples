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

/**
 * Validate that admin report-comment detail endpoint fails when the report does
 * not have a comment link.
 *
 * Business context: Moderators review reports using admin-only endpoints that
 * join discussion_board_reports with type-specific link tables such as
 * discussion_board_report_of_comments. If a report is not associated with a
 * comment (for example because it targets an article instead), GET
 * /discussionBoard/adminUser/reports/{reportId}/comment must not return a
 * malformed or partially populated comment-report DTO. Instead it must clearly
 * fail so moderation tools can react properly.
 *
 * Scenario steps:
 *
 * 1. Admin joins the system, establishing an adminUser session.
 * 2. Admin creates an article category required for article creation.
 * 3. Member joins and logs in to establish a memberUser session.
 * 4. Member creates an article using the created category.
 * 5. Member creates a comment on that article.
 * 6. Member creates a comment-targeting report (sanity baseline).
 * 7. Member creates an article-targeting report against the same article.
 * 8. Admin logs in again to ensure admin Authorization context.
 * 9. Admin calls GET /discussionBoard/adminUser/reports/{reportId}/comment with
 *    the article-targeting reportId.
 *
 * Expected results:
 *
 * - All setup calls (join, category, article, comment, report creations) succeed
 *   and their responses conform to their DTOs.
 * - The final admin report-comment detail call using the article-targeting
 *   reportId throws an error, validated via TestValidator.error, rather than
 *   returning an IDiscussionBoardReportOfComment object.
 */
export async function test_api_admin_report_comment_detail_missing_link(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminJoinBody = typia.random<IDiscussionBoardAdminUserJoin.IRequest>();
  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Admin creates an article category
  const categoryBody = typia.random<IDiscussionBoardArticleCategory.ICreate>();
  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // 3. Member joins
  const memberJoinBody =
    typia.random<IDiscussionBoardMemberUserJoin.IRequest>();
  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<IAuthorizationToken>(memberAuthorized.token);

  // 4. Member creates an article under the created category
  const articleCreateBody: IDiscussionBoardArticle.ICreate = {
    ...typia.random<IDiscussionBoardArticle.ICreate>(),
    categoryId: category.id,
  };
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      { body: articleCreateBody },
    );
  typia.assert(article);

  // 5. Member creates a comment on the article
  const commentCreateBody = typia.random<IDiscussionBoardComment.ICreate>();
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.memberUser.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 6. Member creates a comment-targeting report (baseline sanity check)
  const commentReportBody: IDiscussionBoardReport.ICreate = {
    category: "spam",
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    target_comment_id: comment.id,
  };
  const commentReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: commentReportBody,
    });
  typia.assert(commentReport);

  // 7. Member creates an article-targeting report to simulate missing comment link
  const articleReportBody: IDiscussionBoardReport.ICreate = {
    category: "harassment",
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    target_article_id: article.id,
  };
  const articleReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: articleReportBody,
    });
  typia.assert(articleReport);

  // 8. Admin logs in again to ensure admin Authorization context is active
  const adminLoginBody: IDiscussionBoardAdminUserLogin.IRequest = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: adminJoinBody.ip ?? null,
    href: adminJoinBody.href,
    referrer: adminJoinBody.referrer,
  };
  const adminLoggedIn: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 9. Admin tries to fetch comment detail for an article-targeting report
  await TestValidator.error(
    "admin comment report detail must fail when report has no comment link",
    async () => {
      await api.functional.discussionBoard.adminUser.reports.comment.at(
        connection,
        {
          reportId: articleReport.id,
        },
      );
    },
  );
}
