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

export async function test_api_comment_moderation_update_action_type_change(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create article as user
  const article = await api.functional.discussionBoard.user.articles.create(
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
  // Add comment to article
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
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create initial moderation record with 'edit' action
  const initialModeration =
    await api.functional.discussionBoard.admin.articles.comments.moderations.create(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          action_type: "edit" as const,
          reason: "Content needs editing",
        } satisfies IDiscussionBoardCommentModeration.ICreate,
      },
    );
  typia.assert(initialModeration);
  // Validate initial moderation record
  TestValidator.equals(
    "initial action type",
    initialModeration.action_type,
    "edit",
  );
  TestValidator.equals(
    "initial reason",
    initialModeration.reason,
    "Content needs editing",
  );
  TestValidator.equals(
    "comment ID matches",
    initialModeration.comment.id,
    comment.id,
  );
  TestValidator.predicate(
    "has admin ID",
    initialModeration.admin.id !== undefined,
  );
  // Update moderation record to 'delete' action
  const updatedModeration =
    await api.functional.discussionBoard.admin.articles.comments.moderations.putByArticleidAndCommentidAndModerationid(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        moderationId: initialModeration.id,
        body: {
          action_type: "delete" as const,
          reason: "Inappropriate content",
        } satisfies IDiscussionBoardCommentModeration.IUpdate,
      },
    );
  typia.assert(updatedModeration);
  // Validate updated moderation record
  TestValidator.equals(
    "updated action type",
    updatedModeration.action_type,
    "delete",
  );
  TestValidator.equals(
    "updated reason",
    updatedModeration.reason,
    "Inappropriate content",
  );
  TestValidator.equals(
    "moderation ID unchanged",
    updatedModeration.id,
    initialModeration.id,
  );
  TestValidator.equals(
    "comment relationship maintained",
    updatedModeration.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "admin relationship maintained",
    updatedModeration.admin.id,
    initialModeration.admin.id,
  );
  TestValidator.predicate(
    "updated timestamp changed",
    updatedModeration.updated_at !== initialModeration.updated_at,
  );
}
