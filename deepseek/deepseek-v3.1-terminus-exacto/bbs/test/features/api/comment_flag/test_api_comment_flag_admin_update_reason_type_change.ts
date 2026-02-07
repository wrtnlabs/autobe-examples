import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentFlag";
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
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_comments_flags_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_flags_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_comment_flag } from "../../../prepare/prepare_random_discussion_board_comment_flag";

/**
 * Test administrator updating comment flag reason and type without changing status.
 *
 * This test validates that administrators can update specific fields of a comment flag
 * (reason and type) without affecting the status field or triggering timestamp updates.
 * The test creates a complete workflow: user creates article and comment, user flags
 * the comment, then administrator updates the flag's reason and type while preserving
 * the original status and timestamps.
 */
export async function test_api_comment_flag_admin_update_reason_type_change(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
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
  // Create article as user - use a valid section_id from typia.random
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.paragraph({ sentences: 5 }),
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
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(comment);
  // Create flag as user with schema-compliant flag_type
  const originalFlag =
    await generate_random_discussion_board_user_articles_comments_flags_create(
      userConnection,
      {
        body: {
          flag_reason: RandomGenerator.paragraph({ sentences: 2 }),
          flag_type: RandomGenerator.paragraph({ sentences: 1 }), // Use random string instead of hardcoded values
        } satisfies IDiscussionBoardCommentFlag.ICreate,
        params: {
          articleId: article.id,
          commentId: comment.id,
        },
      },
    );
  typia.assert(originalFlag);
  // Store original status and timestamps for verification
  const originalStatus = originalFlag.status;
  const originalCreatedAt = originalFlag.created_at;
  const originalReviewedAt = originalFlag.reviewed_at;
  const originalResolvedAt = originalFlag.resolved_at;
  // Administrator updates only reason and type - use SDK directly since no utility function exists
  const updatedFlag =
    await api.functional.discussionBoard.admin.articles.comments.flags.update(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        flagId: originalFlag.id,
        body: {
          flag_reason: RandomGenerator.paragraph({ sentences: 3 }),
          flag_type: RandomGenerator.paragraph({ sentences: 1 }), // Use random string instead of hardcoded values
        } satisfies IDiscussionBoardCommentFlag.IUpdate,
      },
    );
  typia.assert(updatedFlag);
  // Verify that only reason and type were updated
  TestValidator.notEquals(
    "flag reason should be updated",
    originalFlag.flag_reason,
    updatedFlag.flag_reason,
  );
  TestValidator.notEquals(
    "flag type should be updated",
    originalFlag.flag_type,
    updatedFlag.flag_type,
  );
  // Verify that status remains unchanged
  TestValidator.equals(
    "status should remain unchanged",
    updatedFlag.status,
    originalStatus,
  );
  // Verify that timestamps remain unchanged (no status change should trigger timestamp updates)
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedFlag.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "reviewed_at should remain unchanged",
    updatedFlag.reviewed_at,
    originalReviewedAt,
  );
  TestValidator.equals(
    "resolved_at should remain unchanged",
    updatedFlag.resolved_at,
    originalResolvedAt,
  );
  // Verify that other identifying information remains consistent
  TestValidator.equals(
    "flag ID should remain the same",
    updatedFlag.id,
    originalFlag.id,
  );
  TestValidator.equals(
    "user should remain the same",
    updatedFlag.user.id,
    originalFlag.user.id,
  );
  TestValidator.equals(
    "comment should remain the same",
    updatedFlag.comment.id,
    originalFlag.comment.id,
  );
}
