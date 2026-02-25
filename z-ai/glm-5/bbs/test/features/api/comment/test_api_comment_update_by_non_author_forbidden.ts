import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_comment_update_by_non_author_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // First user (comment author) setup
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(authorConnection, {});
  // First user creates an article
  const article = await generate_random_discussion_board_user_articles_create(
    authorConnection,
    {},
  );
  typia.assert(article);
  // First user creates a comment
  const originalContent = RandomGenerator.paragraph({ sentences: 3 });
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      authorConnection,
      {
        params: { articleId: article.id },
        body: { content: originalContent },
      },
    );
  typia.assert(comment);
  // Store original updated_at
  const originalUpdatedAt = comment.updated_at;
  // Second user (non-author) setup
  const nonAuthorConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(nonAuthorConnection, {});
  // Non-author attempts to update the comment - should fail
  await TestValidator.error(
    "non-author cannot update another user's comment",
    async () => {
      await api.functional.discussionBoard.user.articles.comments.update(
        nonAuthorConnection,
        {
          articleId: article.id,
          commentId: comment.id,
          body: {
            content: "Attempted update by non-author",
          } satisfies IDiscussionBoardComment.IUpdate,
        },
      );
    },
  );
}
