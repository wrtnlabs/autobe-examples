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
 * Validates that an administrator can permanently delete a moderation action
 * record. The test covers the admin and user creation, posting an article and a
 * comment, submitting an abuse report referring to the comment, creating a
 * moderation action for the abuse report by the admin, and deleting the
 * moderation action. It further verifies that only admins can perform this
 * operation and deleted moderation actions are effectively removed from the
 * system (though this test does not verify audit log existence as there is no
 * audit log retrieval endpoint).
 *
 * Steps:
 *
 * 1. Admin signs up and is authenticated
 * 2. User signs up and is authenticated
 * 3. User creates an article
 * 4. User adds a comment to the article
 * 5. User submits an abuse report referencing the comment
 * 6. Switch to admin context, admin creates a moderation action referencing the
 *    abuse report and the comment
 * 7. Admin permanently deletes the moderation action
 * 8. Attempt to delete the same moderation action again and expect failure
 * 9. Attempt to delete a moderation action as a regular user and expect failure
 */
export async function test_api_admin_moderation_action_permanent_deletion(
  connection: api.IConnection,
) {
  // 1. Admin joins (registers and authenticates)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword as string &
          tags.MinLength<8> &
          tags.MaxLength<128>,
        display_name: RandomGenerator.name(),
        avatar_url: undefined,
      },
    });
  typia.assert(admin);

  // 2. User joins (registers and authenticates)
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = RandomGenerator.alphaNumeric(12);
  const user: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword as string &
          tags.MinLength<8> &
          tags.MaxLength<64>,
        display_name: RandomGenerator.name(),
        avatar_url: undefined,
      },
    });
  typia.assert(user);

  // 3. User creates an article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.user.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 10,
        }) as string & tags.MinLength<1> & tags.MaxLength<100>,
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 25,
        }) as string & tags.MinLength<1> & tags.MaxLength<10000>,
        attachments: [],
      },
    });
  typia.assert(article);

  // 4. User adds a comment to the article
  const comment: IDiscussionBoardArticleComment =
    await api.functional.discussionBoard.user.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          body: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 20,
          }) as string & tags.MinLength<1> & tags.MaxLength<1000>,
        },
      },
    );
  typia.assert(comment);

  // 5. User submits an abuse report referencing the comment
  const abuseReport: IDiscussionBoardAbuseReport =
    await api.functional.discussionBoard.user.abuseReports.create(connection, {
      body: {
        target_comment_id: comment.id,
        abuse_category: "spam",
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        target_article_id: undefined,
      },
    });
  typia.assert(abuseReport);

  // 6. Switch to admin context. (Already logged in from step 1, because admin account was authenticated to set connection headers)
  //    Admin creates a moderation action referencing the abuse report and comment
  const moderationAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.admin.moderationActions.create(
      connection,
      {
        body: {
          target_comment_id: comment.id,
          action_type: "delete",
          action_reason: "Violation confirmed by spam report",
          affected_data_ref: RandomGenerator.substring(comment.body),
          abuse_report_id: abuseReport.id,
          target_article_id: undefined,
        },
      },
    );
  typia.assert(moderationAction);

  // 7. Admin permanently deletes the moderation action
  await api.functional.discussionBoard.admin.moderationActions.erase(
    connection,
    {
      moderationActionId: moderationAction.id,
    },
  );
  // 8. Attempt to delete the same moderation action again and expect failure
  await TestValidator.error(
    "re-deleting same moderation action should fail",
    async () => {
      await api.functional.discussionBoard.admin.moderationActions.erase(
        connection,
        {
          moderationActionId: moderationAction.id,
        },
      );
    },
  );

  // 9. Attempt to delete a moderation action as a user (should not be permitted)
  //    Re-create moderation action for this error case
  const moderationAction2: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.admin.moderationActions.create(
      connection,
      {
        body: {
          target_comment_id: comment.id,
          action_type: "delete",
          action_reason: "Second deletion test for user error",
          affected_data_ref: RandomGenerator.substring(comment.body),
          abuse_report_id: abuseReport.id,
          target_article_id: undefined,
        },
      },
    );
  typia.assert(moderationAction2);
  // Switch to user authentication context
  await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword as string & tags.MinLength<8> & tags.MaxLength<64>,
      display_name: user.display_name,
      avatar_url: undefined,
    },
  });
  // User attempts to delete admin moderation action
  await TestValidator.error(
    "user cannot delete admin moderation action",
    async () => {
      await api.functional.discussionBoard.admin.moderationActions.erase(
        connection,
        {
          moderationActionId: moderationAction2.id,
        },
      );
    },
  );
}
