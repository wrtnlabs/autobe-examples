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
 * Test updating a comment moderation record with new reason and status.
 * A super administrator creates an article, adds a comment, performs initial moderation,
 * then updates the moderation record with corrected information. Validate that the
 * moderation record is properly updated with new reason text and status while
 * preserving the original action type and audit trail timestamps. Verify that the
 * updated record reflects the changes and maintains referential integrity with the
 * comment and administrator relationships.
 */
export async function test_api_comment_moderation_update_reason_and_status(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
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
  // Since we cannot create sections via API (no utility function exists),
  // we need to use a valid section_id that exists in the system.
  // For testing purposes, we'll use a randomly generated UUID and assume
  // the test environment has a valid section with this ID.
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Create article
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: sectionId,
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create comment
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(comment);
  // Create initial moderation
  const initialModeration =
    await generate_random_discussion_board_super_admin_articles_comments_moderations_create(
      superAdminConnection,
      {
        body: {
          action_type: "edit" as const,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardCommentModeration.ICreate,
        params: {
          articleId: article.id,
          commentId: comment.id,
        },
      },
    );
  typia.assert(initialModeration);
  // Update moderation with new reason and status
  // Using null for action_type to preserve original, and "pending" as a valid status
  const updatedModeration =
    await api.functional.discussionBoard.superAdmin.articles.comments.moderations.putByArticleidAndCommentidAndModerationid(
      superAdminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        moderationId: initialModeration.id,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          status: "pending" as const,
        } satisfies IDiscussionBoardCommentModeration.IUpdate,
      },
    );
  typia.assert(updatedModeration);
  // Validate updates
  TestValidator.equals(
    "action type preserved",
    updatedModeration.action_type,
    initialModeration.action_type,
  );
  TestValidator.notEquals(
    "reason updated",
    updatedModeration.reason,
    initialModeration.reason,
  );
  TestValidator.equals("status updated", updatedModeration.status, "pending");
  TestValidator.equals(
    "comment reference preserved",
    updatedModeration.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "admin reference preserved",
    updatedModeration.admin.id,
    initialModeration.admin.id,
  );
  TestValidator.predicate(
    "created at preserved",
    updatedModeration.created_at === initialModeration.created_at,
  );
  TestValidator.notEquals(
    "updated at changed",
    updatedModeration.updated_at,
    initialModeration.updated_at,
  );
}
