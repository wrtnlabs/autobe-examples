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
import type { IDiscussionBoardReportOfAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportOfAttachment";

/**
 * Validate that the admin attachment-detail endpoint rejects non-attachment
 * reports.
 *
 * Business context:
 *
 * - Reports may target articles, comments, or attachments.
 * - The endpoint GET /discussionBoard/adminUser/reports/{reportId}/attachment is
 *   designed only for attachment-targeting reports and should fail when the
 *   reportId belongs to a comment-targeting report.
 *
 * Test workflow:
 *
 * 1. Register an admin user (adminUser actor) and obtain an authenticated admin
 *    session.
 * 2. As admin, create an article category master record.
 * 3. Register a member user (memberUser actor) and obtain a member session.
 * 4. As member, create an article under the created category.
 * 5. As member, create a comment on that article.
 * 6. As member, create a report targeting the comment (target_comment_id only).
 * 7. Switch back to the admin user session via admin login.
 * 8. As admin, call the attachment-detail endpoint with the comment-targeting
 *    reportId and assert that the call fails (throws an HttpError) instead of
 *    returning IDiscussionBoardReportOfAttachment.IInvert.
 */
export async function test_api_admin_report_attachment_detail_for_non_attachment_report(
  connection: api.IConnection,
) {
  // 1. Register admin user (join) and authenticate as adminUser
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "AdminPassword123!";

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
    display_name: RandomGenerator.name(),
    bio: null,
    ip: null,
    href: "https://admin.test.local/join" as string & tags.Format<"uri">,
    referrer: "https://admin.test.local/landing" as string & tags.Format<"uri">,
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminJoin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  // 2. As admin, create an article category
  const categoryCreateBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // 3. Register member user and authenticate as memberUser
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = "MemberPassword123!";

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    displayName: RandomGenerator.name(),
    bio: null,
    location: null,
    ip: null,
    href: "https://board.test.local/join" as string & tags.Format<"uri">,
    referrer: "https://board.test.local/landing" as string & tags.Format<"uri">,
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberJoin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberJoin);

  // 4. As member, create an article in the created category
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

  // 5. As member, create a comment on that article
  const commentCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.memberUser.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 6. As member, create a report targeting the comment (not an attachment)
  const reportCreateBody = {
    category: "harassment" as string & tags.MinLength<1>,
    reason: RandomGenerator.paragraph({ sentences: 3 }) as string &
      tags.MinLength<1>,
    target_article_id: undefined,
    target_comment_id: comment.id,
    target_attachment_id: undefined,
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert(report);

  // Sanity check: ensure target_type of the created report is not "attachment" (when available)
  TestValidator.predicate(
    "created report should not be attachment-targeting",
    report.target_type !== "attachment",
  );

  // 7. Switch back to admin user via login to ensure admin auth context
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.test.local/login" as string & tags.Format<"uri">,
    referrer: "https://admin.test.local/landing" as string & tags.Format<"uri">,
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLogin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 8. As admin, verify that attachment detail endpoint fails for comment-targeting reportId
  await TestValidator.error(
    "attachment-detail endpoint must fail for non-attachment reportId",
    async () => {
      await api.functional.discussionBoard.adminUser.reports.attachment.at(
        connection,
        {
          reportId: report.id,
        },
      );
    },
  );
}
