import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAbuseReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAbuseReport";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationAction";

/**
 * Validate the end-to-end workflow for searching and filtering discussion board
 * moderation actions as an administrator.
 *
 * Steps:
 *
 * 1. Register and authenticate as an admin, storing admin id
 * 2. Register and authenticate as a regular user
 * 3. User creates an article (captures article id)
 * 4. User creates a comment on the article (captures comment id)
 * 5. User submits an abuse report referencing the article and comment (captures
 *    abuse report id)
 * 6. Switch session to admin
 * 7. Admin creates a moderation action referencing the article, comment, and the
 *    abuse report (captures moderation action id)
 * 8. Admin searches for moderation actions using filtering by admin id, target
 *    article id, target comment id, abuse report id, and action_type, verifies
 *    moderation action is returned, paginated, typed correctly, with all keys
 *    present and matching
 * 9. Attempt to search as a user and with an unauthenticated connection to verify
 *    access control
 */
export async function test_api_admin_moderation_actions_search_and_filter(
  connection: api.IConnection,
) {
  // 1. Register & authenticate admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminDisplayName = RandomGenerator.name();
  const adminCredentials = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(16),
    display_name: adminDisplayName,
  } satisfies IDiscussionBoardAdmin.ICreate;
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCredentials,
    });
  typia.assert(admin);
  const adminId = admin.id;

  // 2. Register & authenticate regular user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userDisplayName = RandomGenerator.name();
  const userCredentials = {
    email: userEmail,
    password: RandomGenerator.alphaNumeric(12),
    display_name: userDisplayName,
  } satisfies IDiscussionBoardUser.ICreate;
  const user: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userCredentials });
  typia.assert(user);
  const userId = user.id;

  // 3. User creates an article
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    attachments: [],
  } satisfies IDiscussionBoardArticle.ICreate;
  const article = await api.functional.discussionBoard.user.articles.create(
    connection,
    { body: articleBody },
  );
  typia.assert(article);
  const articleId = article.id;

  // 4. User creates a comment on the article
  const comment =
    await api.functional.discussionBoard.user.articles.comments.create(
      connection,
      {
        articleId: articleId,
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardArticleComment.ICreate,
      },
    );
  typia.assert(comment);
  const commentId = comment.id;

  // 5. User submits abuse report referencing article and comment
  const abuseReportBody = {
    target_article_id: articleId,
    target_comment_id: commentId,
    abuse_category: "offensive",
    reason: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IDiscussionBoardAbuseReport.ICreate;
  const abuseReport =
    await api.functional.discussionBoard.user.abuseReports.create(connection, {
      body: abuseReportBody,
    });
  typia.assert(abuseReport);
  const abuseReportId = abuseReport.id;

  // 6. Switch to admin session (refresh connection w/ admin credentials) - SDK auto handles token switch
  await api.functional.auth.admin.join(connection, { body: adminCredentials });

  // 7. Admin creates a moderation action referencing article, comment, and abuse report
  const moderationActionCreate = {
    target_article_id: articleId,
    target_comment_id: commentId,
    abuse_report_id: abuseReportId,
    action_type: "hide",
    action_reason: RandomGenerator.paragraph({ sentences: 2 }),
    affected_data_ref:
      "Hidden inappropriate comment on article for policy violation.",
  } satisfies IDiscussionBoardModerationAction.ICreate;
  const moderationAction =
    await api.functional.discussionBoard.admin.moderationActions.create(
      connection,
      { body: moderationActionCreate },
    );
  typia.assert(moderationAction);
  const moderationActionId = moderationAction.id;

  // 8. Admin searches for moderation actions with advanced filters
  const filter: IDiscussionBoardModerationAction.IRequest = {
    admin_id: adminId,
    target_article_id: articleId,
    target_comment_id: commentId,
    abuse_report_id: abuseReportId,
    action_type: "hide",
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  };
  const page =
    await api.functional.discussionBoard.admin.moderationActions.index(
      connection,
      { body: filter },
    );
  typia.assert(page);
  // Should include our moderation action in results
  TestValidator.predicate(
    "moderation action appears in search results",
    page.data.some((action) => action.id === moderationActionId),
  );

  // Check returned record fields match what we created
  const found = page.data.find((action) => action.id === moderationActionId);
  if (found) {
    TestValidator.equals("admin_id matches", found.admin_id, adminId);
    TestValidator.equals(
      "target_article_id matches",
      found.target_article_id,
      articleId,
    );
    TestValidator.equals(
      "target_comment_id matches",
      found.target_comment_id,
      commentId,
    );
    TestValidator.equals("action_type matches", found.action_type, "hide");
    TestValidator.equals(
      "action_reason matches",
      found.action_reason,
      moderationActionCreate.action_reason,
    );
  }

  // 9. Access control: searching as user and unauthenticated should not return result
  // Switch to user session
  await api.functional.auth.user.join(connection, { body: userCredentials });
  await TestValidator.error(
    "non-admin user cannot search moderation actions",
    async () => {
      await api.functional.discussionBoard.admin.moderationActions.index(
        connection,
        { body: filter },
      );
    },
  );

  // Try as unauthenticated (empty headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated actor cannot search moderation actions",
    async () => {
      await api.functional.discussionBoard.admin.moderationActions.index(
        unauthConn,
        { body: filter },
      );
    },
  );
}
