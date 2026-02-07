import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentFlag";
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
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_comments_flags_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_flags_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_comment_flag } from "../../../prepare/prepare_random_discussion_board_comment_flag";

export async function test_api_comment_flag_update_flag_reason_type_only(
  connection: api.IConnection,
): Promise<void> {
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
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth =
    await api.functional.discussionBoard.auth.superAdmin.join(
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
  // Create an article as user - we need a valid section ID
  // For testing purposes, we'll use a random UUID since we don't have section creation API
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
  // Create initial flag on the comment
  const initialFlag =
    await api.functional.discussionBoard.user.articles.comments.flags.create(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          flag_reason: RandomGenerator.paragraph({ sentences: 1 }),
          flag_type: "spam",
        } satisfies IDiscussionBoardCommentFlag.ICreate,
      },
    );
  typia.assert(initialFlag);
  // Store initial status and timestamps
  const initialStatus = initialFlag.status;
  const initialReviewedAt = initialFlag.reviewed_at;
  const initialResolvedAt = initialFlag.resolved_at;
  // Update only flag_reason and flag_type fields
  const updatedFlag =
    await api.functional.discussionBoard.superAdmin.articles.comments.flags.update(
      superAdminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        flagId: initialFlag.id,
        body: {
          flag_reason: RandomGenerator.paragraph({ sentences: 2 }),
          flag_type: "harassment",
          // Intentionally omit status to keep it unchanged
        } satisfies IDiscussionBoardCommentFlag.IUpdate,
      },
    );
  typia.assert(updatedFlag);
  // Validate that flag_reason and flag_type were updated
  TestValidator.notEquals(
    "flag_reason should be updated",
    initialFlag.flag_reason,
    updatedFlag.flag_reason,
  );
  TestValidator.notEquals(
    "flag_type should be updated",
    initialFlag.flag_type,
    updatedFlag.flag_type,
  );
  // Validate that status remains unchanged
  TestValidator.equals(
    "status should remain unchanged",
    initialStatus,
    updatedFlag.status,
  );
  // Validate that timestamps remain null since status didn't change
  TestValidator.equals(
    "reviewed_at should remain null",
    initialReviewedAt,
    updatedFlag.reviewed_at,
  );
  TestValidator.equals(
    "resolved_at should remain null",
    initialResolvedAt,
    updatedFlag.resolved_at,
  );
  // Validate that other fields remain consistent
  TestValidator.equals(
    "flag ID should remain the same",
    initialFlag.id,
    updatedFlag.id,
  );
  TestValidator.equals(
    "user ID should remain the same",
    initialFlag.user.id,
    updatedFlag.user.id,
  );
  TestValidator.equals(
    "comment ID should remain the same",
    initialFlag.comment.id,
    updatedFlag.comment.id,
  );
  TestValidator.equals(
    "created_at should remain the same",
    initialFlag.created_at,
    updatedFlag.created_at,
  );
}
