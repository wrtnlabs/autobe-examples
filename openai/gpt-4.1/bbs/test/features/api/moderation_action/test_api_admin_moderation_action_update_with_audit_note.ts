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
 * Validate the admin update of permitted fields in a moderation action,
 * ensuring audit trail integrity.
 *
 * This test validates that an administrator is able to update a moderation
 * action's audit note fields—such as action_reason or affected_data_ref—but
 * cannot modify immutable fields (target, type, actor, etc). The process
 * includes:
 *
 * 1. Admin registration and authentication
 * 2. Creation of target discussion board resources (article, comment, abuse
 *    report)
 * 3. Registering a moderation action as the admin, linked to the article, comment,
 *    and abuse report
 * 4. Performing an update to the moderation action, changing only allowed audit
 *    note fields
 * 5. Asserting that prohibited fields remain unchanged and that only the audit
 *    note fields are updated
 */
export async function test_api_admin_moderation_action_update_with_audit_note(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as an admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        avatar_url: undefined,
      },
    });
  typia.assert(admin);

  // 2. Create article as a user (simulate user context)
  //    For simplicity, we assume admin context can create resources or user context is already present.
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.user.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 7,
        }),
        attachments: [],
      },
    });
  typia.assert(article);

  // 3. Create comment for the article
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

  // 4. Create abuse report, targeting article and comment
  const abuseReport: IDiscussionBoardAbuseReport =
    await api.functional.discussionBoard.user.abuseReports.create(connection, {
      body: {
        target_article_id: article.id,
        target_comment_id: comment.id,
        abuse_category: "spam",
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      },
    });
  typia.assert(abuseReport);

  // 5. Register a moderation action as admin
  const moderationAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.admin.moderationActions.create(
      connection,
      {
        body: {
          target_article_id: article.id,
          target_comment_id: comment.id,
          abuse_report_id: abuseReport.id,
          action_type: "delete",
          action_reason: "Initial moderation action note.",
          affected_data_ref: "removed inappropriate comment text",
        },
      },
    );
  typia.assert(moderationAction);

  // 6. Update the moderation action (only permitted fields)
  const updatedReason = "Updated audit note for regulatory annotation.";
  const updatedDataRef = RandomGenerator.paragraph({ sentences: 1 });
  const updatedModerationAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.admin.moderationActions.update(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: {
          action_reason: updatedReason,
          affected_data_ref: updatedDataRef,
        },
      },
    );
  typia.assert(updatedModerationAction);

  // 7. Assertions - only permitted fields are updated, others unchanged
  TestValidator.equals(
    "moderation action id is unchanged",
    updatedModerationAction.id,
    moderationAction.id,
  );
  TestValidator.equals(
    "moderation action target_article_id is unchanged",
    updatedModerationAction.target_article_id,
    moderationAction.target_article_id,
  );
  TestValidator.equals(
    "moderation action target_comment_id is unchanged",
    updatedModerationAction.target_comment_id,
    moderationAction.target_comment_id,
  );
  TestValidator.equals(
    "moderation action abuse_report_id is unchanged",
    updatedModerationAction.abuse_report_id,
    moderationAction.abuse_report_id,
  );
  TestValidator.equals(
    "moderation action admin_id is unchanged",
    updatedModerationAction.admin_id,
    moderationAction.admin_id,
  );
  TestValidator.equals(
    "moderation action action_type is unchanged",
    updatedModerationAction.action_type,
    moderationAction.action_type,
  );
  TestValidator.notEquals(
    "moderation action action_reason is updated",
    updatedModerationAction.action_reason,
    moderationAction.action_reason,
  );
  TestValidator.equals(
    "moderation action action_reason matches update",
    updatedModerationAction.action_reason,
    updatedReason,
  );
  TestValidator.notEquals(
    "moderation action affected_data_ref is updated",
    updatedModerationAction.affected_data_ref,
    moderationAction.affected_data_ref,
  );
  TestValidator.equals(
    "moderation action affected_data_ref matches update",
    updatedModerationAction.affected_data_ref,
    updatedDataRef,
  );
}
