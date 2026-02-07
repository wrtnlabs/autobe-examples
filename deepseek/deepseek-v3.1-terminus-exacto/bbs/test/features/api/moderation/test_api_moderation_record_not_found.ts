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
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_moderation_record_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create first regular user (article author)
  const articleAuthorConnection: api.IConnection = { host: connection.host };
  const articleAuthor = await authorize_user_join(articleAuthorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(articleAuthor);
  // Create second regular user (comment author)
  const commentAuthorConnection: api.IConnection = { host: connection.host };
  const commentAuthor = await authorize_user_join(commentAuthorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(commentAuthor);
  // Create an article as the first user
  const article = await generate_random_discussion_board_user_articles_create(
    articleAuthorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create a comment on the article as the second user
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      commentAuthorConnection,
      {
        body: {
          content: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 15,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(comment);
  // Test 1: Non-existent moderation ID
  await TestValidator.error(
    "should return error for non-existent moderation record",
    async () => {
      await api.functional.discussionBoard.superAdmin.articles.comments.moderations.at(
        superAdminConnection,
        {
          articleId: article.id,
          commentId: comment.id,
          moderationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Test 2: Valid UUID but wrong comment ID
  await TestValidator.error(
    "should return error for moderation record with wrong comment ID",
    async () => {
      await api.functional.discussionBoard.superAdmin.articles.comments.moderations.at(
        superAdminConnection,
        {
          articleId: article.id,
          commentId: typia.random<string & tags.Format<"uuid">>(),
          moderationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Test 3: Valid UUID but wrong article ID
  await TestValidator.error(
    "should return error for moderation record with wrong article ID",
    async () => {
      await api.functional.discussionBoard.superAdmin.articles.comments.moderations.at(
        superAdminConnection,
        {
          articleId: typia.random<string & tags.Format<"uuid">>(),
          commentId: comment.id,
          moderationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Test 4: All valid UUIDs but no moderation record exists
  await TestValidator.error(
    "should return error when no moderation record exists for valid article and comment",
    async () => {
      await api.functional.discussionBoard.superAdmin.articles.comments.moderations.at(
        superAdminConnection,
        {
          articleId: article.id,
          commentId: comment.id,
          moderationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
