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

/**
 * Validates creation of a moderation action referencing article, comment and
 * abuse report by an admin.
 *
 * 1. Register a new admin and authenticate as admin.
 * 2. Create a user article (article will be the moderation target).
 * 3. Add a comment under that article (comment will be targeted).
 * 4. Submit an abuse report referencing both article and comment.
 * 5. As admin, create a moderation action referencing all three, specifying
 *    action_type, reason, and affected data.
 * 6. Assert moderation action is created with correct admin, article, comment,
 *    abuse report, and rationale fields.
 */
export async function test_api_admin_moderation_action_creation_with_article_comment_abuse_report_references(
  connection: api.IConnection,
) {
  // 1. Register a new admin and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        avatar_url: undefined,
      },
    });
  typia.assert(admin);

  // 2. Create an article (simulate as a user session)
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.user.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 8,
          sentenceMax: 18,
        }),
      },
    });
  typia.assert(article);

  // 3. Add a comment to that article
  const comment: IDiscussionBoardArticleComment =
    await api.functional.discussionBoard.user.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(comment);

  // 4. Submit an abuse report referencing both article and comment
  const abuseReport: IDiscussionBoardAbuseReport =
    await api.functional.discussionBoard.user.abuseReports.create(connection, {
      body: {
        target_article_id: article.id,
        target_comment_id: comment.id,
        abuse_category: RandomGenerator.pick([
          "spam",
          "offensive",
          "harassment",
          "illegal",
        ] as const),
        reason: RandomGenerator.paragraph({ sentences: 3 }),
      },
    });
  typia.assert(abuseReport);

  // 5. As admin, create moderation action referencing article, comment and abuse report
  const actionReason = RandomGenerator.paragraph({ sentences: 2 });
  const affectedDataRef = RandomGenerator.alphaNumeric(10);
  const actionType = RandomGenerator.pick([
    "hide",
    "warn",
    "delete",
    "edit",
  ] as const);
  const moderationAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.admin.moderationActions.create(
      connection,
      {
        body: {
          target_article_id: article.id,
          target_comment_id: comment.id,
          abuse_report_id: abuseReport.id,
          action_type: actionType,
          action_reason: actionReason,
          affected_data_ref: affectedDataRef,
        },
      },
    );
  typia.assert(moderationAction);
  // 6. Assertions - verify relationships and values
  TestValidator.equals("admin id matches", moderationAction.admin_id, admin.id);
  TestValidator.equals(
    "article id matches",
    moderationAction.target_article_id,
    article.id,
  );
  TestValidator.equals(
    "comment id matches",
    moderationAction.target_comment_id,
    comment.id,
  );
  TestValidator.equals(
    "abuse report id matches",
    moderationAction.abuse_report_id,
    abuseReport.id,
  );
  TestValidator.equals(
    "action_type matches",
    moderationAction.action_type,
    actionType,
  );
  TestValidator.equals(
    "action_reason matches",
    moderationAction.action_reason,
    actionReason,
  );
  TestValidator.equals(
    "affected_data_ref matches",
    moderationAction.affected_data_ref,
    affectedDataRef,
  );
}
