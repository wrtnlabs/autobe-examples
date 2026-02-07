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

export async function test_api_comment_moderation_update_reason_modification(
  connection: api.IConnection,
): Promise<void> {
  // Create user account and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(userAuth);
  // Create article as user using utility function with proper section_id
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        section_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies DeepPartial<IDiscussionBoardArticle.ICreate>,
    },
  );
  typia.assert(article);
  // Create comment on the article using utility function
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(comment);
  // Create superAdmin account and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        privilege_level: "super_admin",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // Create initial moderation record
  const initialModeration =
    await generate_random_discussion_board_super_admin_articles_comments_moderations_create(
      superAdminConnection,
      {
        body: {
          action_type: "edit" as const,
          reason: "Initial moderation reason",
        } satisfies IDiscussionBoardCommentModeration.ICreate,
        params: {
          articleId: article.id,
          commentId: comment.id,
        },
      },
    );
  typia.assert(initialModeration);
  // Update moderation record with new reason
  const updatedModeration =
    await api.functional.discussionBoard.superAdmin.articles.comments.moderations.patchByArticleidAndCommentid(
      superAdminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          reason: "Updated moderation reason with more details",
        } satisfies IDiscussionBoardCommentModeration.IUpdate,
      },
    );
  typia.assert(updatedModeration);
  // Validate that reason field was updated
  TestValidator.equals(
    "reason field should be updated",
    updatedModeration.reason,
    "Updated moderation reason with more details",
  );
  // Validate that other fields remain unchanged
  TestValidator.equals(
    "action_type should remain unchanged",
    updatedModeration.action_type,
    initialModeration.action_type,
  );
  TestValidator.equals(
    "status should remain unchanged",
    updatedModeration.status,
    initialModeration.status,
  );
  TestValidator.equals(
    "comment ID should remain unchanged",
    updatedModeration.comment.id,
    initialModeration.comment.id,
  );
  TestValidator.equals(
    "admin ID should remain unchanged",
    updatedModeration.admin.id,
    initialModeration.admin.id,
  );
  // Validate that updated_at timestamp reflects the modification
  TestValidator.notEquals(
    "updated_at timestamp should be different",
    updatedModeration.updated_at,
    initialModeration.updated_at,
  );
  // Validate that created_at timestamp remains unchanged
  TestValidator.equals(
    "created_at timestamp should remain unchanged",
    updatedModeration.created_at,
    initialModeration.created_at,
  );
}
