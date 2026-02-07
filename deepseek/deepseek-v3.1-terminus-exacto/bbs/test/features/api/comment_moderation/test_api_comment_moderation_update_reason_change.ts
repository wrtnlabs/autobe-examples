import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentModeration";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_articles_comments_moderations_create } from "../../../generate/generate_random_discussion_board_admin_articles_comments_moderations_create";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_comment_moderation } from "../../../prepare/prepare_random_discussion_board_comment_moderation";

/**
 * Test updating a comment moderation record by changing the reason field.
 *
 * Workflow:
 * 1. Create administrator account and authenticate
 * 2. Create regular user account and authenticate
 * 3. User creates an article
 * 4. User adds a comment to the article
 * 5. Administrator performs initial moderation action
 * 6. Administrator updates the moderation reason
 * 7. Validate that reason changed while other fields remain consistent
 * 8. Verify timestamp behavior (created_at unchanged, updated_at changed)
 */
export async function test_api_comment_moderation_update_reason_change(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await api.functional.discussionBoard.auth.user.join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(userAuth);
  // User creates an article
  const article = await api.functional.discussionBoard.user.articles.create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // User adds a comment to the article
  const comment =
    await api.functional.discussionBoard.user.articles.comments.create(
      userConnection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // Administrator performs initial moderation action
  const initialModeration =
    await api.functional.discussionBoard.admin.articles.comments.moderations.create(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          action_type: "edit" as const,
          reason: "Initial moderation reason",
        } satisfies IDiscussionBoardCommentModeration.ICreate,
      },
    );
  typia.assert(initialModeration);
  // Store original timestamps for comparison
  const originalCreatedAt = initialModeration.created_at;
  const originalUpdatedAt = initialModeration.updated_at;
  // Administrator updates the moderation reason
  const updatedModeration =
    await api.functional.discussionBoard.admin.articles.comments.moderations.putByArticleidAndCommentidAndModerationid(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        moderationId: initialModeration.id,
        body: {
          reason: "Updated moderation reason with more details",
        } satisfies IDiscussionBoardCommentModeration.IUpdate,
      },
    );
  typia.assert(updatedModeration);
  // Validate that reason was updated
  TestValidator.equals(
    "reason field should be updated",
    updatedModeration.reason,
    "Updated moderation reason with more details",
  );
  // Validate that action_type remains unchanged
  TestValidator.equals(
    "action_type should remain unchanged",
    updatedModeration.action_type,
    initialModeration.action_type,
  );
  // Validate that created_at timestamp remains unchanged
  TestValidator.equals(
    "created_at timestamp should remain unchanged",
    updatedModeration.created_at,
    originalCreatedAt,
  );
  // Validate that updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at timestamp should change",
    updatedModeration.updated_at,
    originalUpdatedAt,
  );
  // Validate that comment relationship remains consistent
  TestValidator.equals(
    "comment ID should remain unchanged",
    updatedModeration.comment.id,
    comment.id,
  );
  // Validate that admin relationship remains consistent
  TestValidator.equals(
    "admin ID should remain unchanged",
    updatedModeration.admin.id,
    initialModeration.admin.id,
  );
}
