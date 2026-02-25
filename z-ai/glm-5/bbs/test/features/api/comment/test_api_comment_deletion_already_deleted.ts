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

/**
 * Test idempotency behavior when attempting to delete an already-deleted comment.
 *
 * Steps:
 * 1. User registers and authenticates
 * 2. User creates an article
 * 3. User creates a comment on the article
 * 4. User successfully deletes the comment (first deletion)
 * 5. User attempts to delete the same comment again (second deletion)
 *
 * Validation:
 * - Second deletion attempt returns 404 Not Found error
 * - Confirms the soft-deleted comment is properly excluded from further operations
 */
export async function test_api_comment_deletion_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration and authentication
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Create article
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {},
  );
  typia.assert(article);
  // 3. Create comment
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
  // 4. First deletion - should succeed
  await api.functional.discussionBoard.user.articles.comments.erase(
    userConnection,
    {
      articleId: article.id,
      commentId: comment.id,
    },
  );
  // 5. Second deletion - should return 404 Not Found
  await TestValidator.httpError(
    "already deleted comment returns 404",
    404,
    async () =>
      await api.functional.discussionBoard.user.articles.comments.erase(
        userConnection,
        {
          articleId: article.id,
          commentId: comment.id,
        },
      ),
  );
}