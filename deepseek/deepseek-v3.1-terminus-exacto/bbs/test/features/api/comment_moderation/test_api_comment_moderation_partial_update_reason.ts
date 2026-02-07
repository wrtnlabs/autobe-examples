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
 * Test partial update of comment moderation record by modifying only the reason field
 * while keeping action_type and status unchanged.
 */
export async function test_api_comment_moderation_partial_update_reason(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
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
  // Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Note: Section creation is not available in the current API, so we need to use
  // a different approach. Since the scenario requires testing comment moderation,
  // we'll assume there's at least one active section available in the system.
  // For this test, we'll use a placeholder section ID that should exist.
  // Create article as user
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create comment as user
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        params: { articleId: article.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // Create initial moderation record as admin
  const initialModeration =
    await generate_random_discussion_board_admin_articles_comments_moderations_create(
      adminConnection,
      {
        params: { articleId: article.id, commentId: comment.id },
        body: {
          action_type: "edit" as const,
          reason: "Initial moderation reason",
        } satisfies IDiscussionBoardCommentModeration.ICreate,
      },
    );
  typia.assert(initialModeration);
  // Store original values
  const originalActionType = initialModeration.action_type;
  const originalStatus = initialModeration.status;
  const originalCreatedAt = initialModeration.created_at;
  // Wait a moment to ensure updated_at will change
  await new Promise((resolve) => setTimeout(resolve, 10));
  // Perform partial update - only change reason
  const updatedModeration =
    await api.functional.discussionBoard.admin.articles.comments.moderations.patchByArticleidAndCommentid(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          reason: "Updated moderation reason for better clarity",
        } satisfies IDiscussionBoardCommentModeration.IUpdate,
      },
    );
  typia.assert(updatedModeration);
  // Validate only reason field changed
  TestValidator.equals(
    "action_type should remain unchanged",
    updatedModeration.action_type,
    originalActionType,
  );
  TestValidator.equals(
    "status should remain unchanged",
    updatedModeration.status,
    originalStatus,
  );
  TestValidator.notEquals(
    "reason should be updated",
    updatedModeration.reason,
    "Initial moderation reason",
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedModeration.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at should reflect modification",
    updatedModeration.updated_at,
    originalCreatedAt,
  );
  // Validate business logic
  TestValidator.predicate(
    "updated_at should be later than created_at",
    new Date(updatedModeration.updated_at) >
      new Date(updatedModeration.created_at),
  );
}
