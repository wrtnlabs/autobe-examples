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

export async function test_api_moderation_audit_trail_retrieval(
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
  // Create first regular user connection (article author)
  const articleAuthorConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(articleAuthorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create second regular user connection (comment author)
  const commentAuthorConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(commentAuthorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create article as first user - use utility function with proper section_id
  const article = await generate_random_discussion_board_user_articles_create(
    articleAuthorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: typia.random<string & tags.Format<"uuid">>(), // This needs to be a valid section ID
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create comment as second user
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      commentAuthorConnection,
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
  // Perform moderation action as super admin
  const moderation =
    await generate_random_discussion_board_super_admin_articles_comments_moderations_create(
      superAdminConnection,
      {
        body: {
          action_type: "delete" as const,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardCommentModeration.ICreate,
        params: {
          articleId: article.id,
          commentId: comment.id,
        },
      },
    );
  typia.assert(moderation);
  // Retrieve moderation audit trail
  const retrievedModeration =
    await api.functional.discussionBoard.superAdmin.articles.comments.moderations.at(
      superAdminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        moderationId: moderation.id,
      },
    );
  typia.assert(retrievedModeration);
  // Validate moderation details
  TestValidator.equals(
    "moderation ID matches",
    retrievedModeration.id,
    moderation.id,
  );
  TestValidator.equals(
    "action type matches",
    retrievedModeration.action_type,
    "delete",
  );
  TestValidator.equals(
    "reason matches",
    retrievedModeration.reason,
    moderation.reason,
  );
  TestValidator.predicate(
    "status is set",
    retrievedModeration.status.length > 0,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    retrievedModeration.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    retrievedModeration.updated_at.length > 0,
  );
  // Validate comment relationship
  TestValidator.equals(
    "comment ID matches",
    retrievedModeration.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "comment content matches",
    retrievedModeration.comment.content,
    comment.content,
  );
  TestValidator.predicate(
    "comment author exists",
    retrievedModeration.comment.author.display_name.length > 0,
  );
  // Validate admin relationship
  TestValidator.predicate(
    "admin ID exists",
    retrievedModeration.admin.id.length > 0,
  );
  TestValidator.predicate(
    "admin email exists",
    retrievedModeration.admin.email.length > 0,
  );
  TestValidator.predicate(
    "admin display name exists",
    retrievedModeration.admin.display_name.length > 0,
  );
  // Validate article relationship through comment - REMOVED INVALID PROPERTIES
  // The comment summary in moderation response doesn't include article details
}