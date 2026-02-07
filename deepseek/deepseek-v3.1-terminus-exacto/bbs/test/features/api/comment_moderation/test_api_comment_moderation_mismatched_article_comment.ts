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

export async function test_api_comment_moderation_mismatched_article_comment(
  connection: api.IConnection,
): Promise<void> {
  // Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" satisfies string & tags.Format<"password">,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // Create first article and comment
  const user1Connection: api.IConnection = { host: connection.host };
  await authorize_user_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678" satisfies string & tags.MinLength<8>,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  const article1 = await api.functional.discussionBoard.user.articles.create(
    user1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article1);
  const comment1 =
    await api.functional.discussionBoard.user.articles.comments.create(
      user1Connection,
      {
        articleId: article1.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment1);
  // Create moderation for first comment
  const moderation1 =
    await api.functional.discussionBoard.admin.articles.comments.moderations.create(
      adminConnection,
      {
        articleId: article1.id,
        commentId: comment1.id,
        body: {
          action_type: "approve" as const,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardCommentModeration.ICreate,
      },
    );
  typia.assert(moderation1);
  // Create second article and comment
  const user2Connection: api.IConnection = { host: connection.host };
  await authorize_user_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678" satisfies string & tags.MinLength<8>,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  const article2 = await api.functional.discussionBoard.user.articles.create(
    user2Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article2);
  const comment2 =
    await api.functional.discussionBoard.user.articles.comments.create(
      user2Connection,
      {
        articleId: article2.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment2);
  // Create moderation for second comment
  const moderation2 =
    await api.functional.discussionBoard.admin.articles.comments.moderations.create(
      adminConnection,
      {
        articleId: article2.id,
        commentId: comment2.id,
        body: {
          action_type: "approve" as const,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardCommentModeration.ICreate,
      },
    );
  typia.assert(moderation2);
  // Test mismatched article-comment combination (article1.id + comment2.id)
  await TestValidator.error("mismatched article-comment", async () => {
    await api.functional.discussionBoard.admin.articles.comments.moderations.at(
      adminConnection,
      {
        articleId: article1.id,
        commentId: comment2.id,
        moderationId: moderation1.id,
      },
    );
  });
  // Test mismatched article-comment combination (article2.id + comment1.id)
  await TestValidator.error("mismatched article-comment reverse", async () => {
    await api.functional.discussionBoard.admin.articles.comments.moderations.at(
      adminConnection,
      {
        articleId: article2.id,
        commentId: comment1.id,
        moderationId: moderation2.id,
      },
    );
  });
  // Verify valid combinations still work
  const validModeration1 =
    await api.functional.discussionBoard.admin.articles.comments.moderations.at(
      adminConnection,
      {
        articleId: article1.id,
        commentId: comment1.id,
        moderationId: moderation1.id,
      },
    );
  typia.assert(validModeration1);
  TestValidator.equals(
    "valid moderation 1",
    validModeration1.id,
    moderation1.id,
  );
  const validModeration2 =
    await api.functional.discussionBoard.admin.articles.comments.moderations.at(
      adminConnection,
      {
        articleId: article2.id,
        commentId: comment2.id,
        moderationId: moderation2.id,
      },
    );
  typia.assert(validModeration2);
  TestValidator.equals(
    "valid moderation 2",
    validModeration2.id,
    moderation2.id,
  );
}
