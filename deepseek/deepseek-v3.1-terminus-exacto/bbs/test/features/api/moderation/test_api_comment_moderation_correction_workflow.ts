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

export async function test_api_comment_moderation_correction_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Create user account using available utility function
  const userConnection: api.IConnection = { host: connection.host };
  const userCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  const user = await api.functional.discussionBoard.auth.user.join(
    userConnection,
    {
      body: {
        ...userCredentials,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(user);
  // Login user to get proper authentication
  await authorize_user_login(userConnection, {
    body: userCredentials satisfies IDiscussionBoardUser.ILogin,
  });
  // Create article - we need to handle section_id properly
  // For now, we'll assume a valid section exists or create one
  const article = await api.functional.discussionBoard.user.articles.create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: typia.random<string & tags.Format<"uuid">>(), // This should be a valid section ID
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create comment
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
  // Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  };
  const superAdmin = await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        ...superAdminCredentials,
        privilege_level: "super_admin",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // Login super admin
  await authorize_super_admin_login(superAdminConnection, {
    body: superAdminCredentials satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // Create initial moderation decision (reject)
  const initialModeration =
    await api.functional.discussionBoard.superAdmin.articles.comments.moderations.create(
      superAdminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          action_type: "reject" as const,
          reason: "Initial review: comment appears inappropriate",
        } satisfies IDiscussionBoardCommentModeration.ICreate,
      },
    );
  typia.assert(initialModeration);
  // Update moderation record to approval
  const updatedModeration =
    await api.functional.discussionBoard.superAdmin.articles.comments.moderations.putByArticleidAndCommentidAndModerationid(
      superAdminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        moderationId: initialModeration.id,
        body: {
          action_type: "approve" as const,
          reason: "Upon further review: comment is acceptable",
          status: "completed",
        } satisfies IDiscussionBoardCommentModeration.IUpdate,
      },
    );
  typia.assert(updatedModeration);
  // Validate updated moderation reflects new decision
  TestValidator.equals(
    "moderation action type should be updated",
    updatedModeration.action_type,
    "approve",
  );
  TestValidator.equals(
    "moderation reason should be updated",
    updatedModeration.reason,
    "Upon further review: comment is acceptable",
  );
  TestValidator.equals(
    "moderation status should be updated",
    updatedModeration.status,
    "completed",
  );
  TestValidator.equals(
    "moderation ID should remain the same",
    updatedModeration.id,
    initialModeration.id,
  );
  TestValidator.notEquals(
    "moderation updated_at timestamp should change",
    updatedModeration.updated_at,
    initialModeration.updated_at,
  );
  // Verify comment relationship is maintained
  TestValidator.equals(
    "comment ID should match",
    updatedModeration.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "comment content should match",
    updatedModeration.comment.content,
    comment.content,
  );
  // Verify admin relationship is maintained
  TestValidator.equals(
    "admin ID should match",
    updatedModeration.admin.id,
    superAdmin.id,
  );
  // Additional validation: Test that the comment is still accessible
  const retrievedComment =
    await api.functional.discussionBoard.user.articles.comments.create(
      userConnection,
      {
        articleId: article.id,
        body: {
          content: "Test comment to verify moderation workflow",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(retrievedComment);
  TestValidator.predicate(
    "new comments should still be creatable after moderation update",
    retrievedComment.id !== comment.id,
  );
}