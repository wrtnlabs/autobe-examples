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

export async function test_api_comment_moderation_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
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
  // Note: Since we cannot create sections via API (only administrators can create sections),
  // and we don't have a utility function for section creation, we need to use a different approach.
  // We'll assume there's at least one active section available in the system.
  // In a real scenario, we would need to create a section first, but since we don't have
  // the API endpoint for section creation, we'll proceed with the test logic.
  // Create an article (using a placeholder section_id - this would normally come from an existing section)
  const article = await api.functional.discussionBoard.user.articles.create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        section_id: typia.random<string & tags.Format<"uuid">>(), // This should be a valid section ID
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create a comment on the article
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
  // Create initial moderation record
  const initialModeration =
    await api.functional.discussionBoard.admin.articles.comments.moderations.create(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          action_type: "edit" as const,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardCommentModeration.ICreate,
      },
    );
  typia.assert(initialModeration);
  // Store original values for comparison
  const originalActionType = initialModeration.action_type;
  const originalReason = initialModeration.reason;
  const originalAdminId = initialModeration.admin.id;
  const originalCommentId = initialModeration.comment.id;
  // Perform partial update - only update status field
  const updatedModeration =
    await api.functional.discussionBoard.admin.articles.comments.moderations.putByArticleidAndCommentidAndModerationid(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        moderationId: initialModeration.id,
        body: {
          status: "completed" as const,
          // Intentionally omit action_type and reason to test partial update
        } satisfies IDiscussionBoardCommentModeration.IUpdate,
      },
    );
  typia.assert(updatedModeration);
  // Validate partial update semantics
  TestValidator.equals(
    "status should be updated",
    updatedModeration.status,
    "completed",
  );
  TestValidator.equals(
    "action_type should remain unchanged",
    updatedModeration.action_type,
    originalActionType,
  );
  TestValidator.equals(
    "reason should remain unchanged",
    updatedModeration.reason,
    originalReason,
  );
  TestValidator.equals(
    "admin relationship should remain unchanged",
    updatedModeration.admin.id,
    originalAdminId,
  );
  TestValidator.equals(
    "comment relationship should remain unchanged",
    updatedModeration.comment.id,
    originalCommentId,
  );
  TestValidator.predicate(
    "updated_at timestamp should be newer than created_at",
    new Date(updatedModeration.updated_at) >
      new Date(updatedModeration.created_at),
  );
  // Test with null values for nullable fields
  const updatedWithNulls =
    await api.functional.discussionBoard.admin.articles.comments.moderations.putByArticleidAndCommentidAndModerationid(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        moderationId: initialModeration.id,
        body: {
          action_type: null,
          reason: null,
          status: "reversed" as const,
        } satisfies IDiscussionBoardCommentModeration.IUpdate,
      },
    );
  typia.assert(updatedWithNulls);
  // Validate null handling
  TestValidator.equals(
    "status should be updated to reversed",
    updatedWithNulls.status,
    "reversed",
  );
  TestValidator.equals(
    "action_type should be set to null",
    updatedWithNulls.action_type,
    null,
  );
  TestValidator.equals(
    "reason should be set to null",
    updatedWithNulls.reason,
    null,
  );
  TestValidator.equals(
    "admin relationship should remain consistent",
    updatedWithNulls.admin.id,
    originalAdminId,
  );
  TestValidator.equals(
    "comment relationship should remain consistent",
    updatedWithNulls.comment.id,
    originalCommentId,
  );
}
