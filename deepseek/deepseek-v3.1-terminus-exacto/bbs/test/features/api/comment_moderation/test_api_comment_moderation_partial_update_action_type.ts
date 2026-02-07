import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentModeration";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_super_admin_articles_comments_moderations_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_comments_moderations_create";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_comment_moderation } from "../../../prepare/prepare_random_discussion_board_comment_moderation";

/**
 * Test partial update of comment moderation record by changing only the action type.
 * A super administrator creates a moderation workflow where they initially mark a comment
 * for editing but later decide to delete it instead. Validate that partial updates work
 * correctly - only the action_type field should be updated while reason and status remain
 * unchanged. Verify that the system handles partial updates properly and maintains data
 * consistency.
 */
export async function test_api_comment_moderation_partial_update_action_type(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create article as user - using a valid section_id from existing sections
  // Note: In a real scenario, we would need to create or fetch an existing section first
  // For this test, we'll assume a valid section_id exists in the system
  const article = await api.functional.discussionBoard.user.articles.create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        section_id: typia.random<string & tags.Format<"uuid">>(), // This should be a valid section ID
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create comment as user
  const comment =
    await api.functional.discussionBoard.user.articles.comments.create(
      userConnection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create initial moderation record with action_type 'edit'
  const initialModerationReason = RandomGenerator.paragraph({ sentences: 2 });
  const initialModeration =
    await api.functional.discussionBoard.superAdmin.articles.comments.moderations.create(
      superAdminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          action_type: "edit" as const,
          reason: initialModerationReason,
        } satisfies IDiscussionBoardCommentModeration.ICreate,
      },
    );
  typia.assert(initialModeration);
  // Store original values for comparison
  const originalReason = initialModeration.reason;
  const originalStatus = initialModeration.status;
  // Perform partial update changing only action_type to 'delete'
  const updatedModeration =
    await api.functional.discussionBoard.superAdmin.articles.comments.moderations.putByArticleidAndCommentidAndModerationid(
      superAdminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        moderationId: initialModeration.id,
        body: {
          action_type: "delete" as const,
        } satisfies IDiscussionBoardCommentModeration.IUpdate,
      },
    );
  typia.assert(updatedModeration);
  // Validate that only action_type changed
  TestValidator.equals(
    "action_type should be updated",
    updatedModeration.action_type,
    "delete",
  );
  TestValidator.equals(
    "reason should remain unchanged",
    updatedModeration.reason,
    originalReason,
  );
  TestValidator.equals(
    "status should remain unchanged",
    updatedModeration.status,
    originalStatus,
  );
  // Verify data consistency - comment and admin relationships should be preserved
  TestValidator.equals(
    "comment relationship should be preserved",
    updatedModeration.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "admin relationship should be preserved",
    updatedModeration.admin.id,
    initialModeration.admin.id,
  );
  // Verify audit trail integrity - created_at should remain unchanged
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedModeration.created_at,
    initialModeration.created_at,
  );
  TestValidator.predicate(
    "updated_at should be newer",
    updatedModeration.updated_at > initialModeration.updated_at,
  );
}
