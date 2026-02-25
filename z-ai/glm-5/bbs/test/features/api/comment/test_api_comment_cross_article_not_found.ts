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
 * Test that requesting a comment with an articleId from a different article
 * returns 404 Not Found, validating the data integrity constraint that
 * comments are scoped to their parent articles.
 *
 * Test Steps:
 * 1. Register a new user
 * 2. Create two different articles
 * 3. Create a comment on the first article
 * 4. Attempt to retrieve the comment using the second article's ID
 * 5. Expect 404 Not Found error
 */
export async function test_api_comment_cross_article_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Create two different articles
  const article1 = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {},
  );
  typia.assert(article1);
  const article2 = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {},
  );
  typia.assert(article2);
  // 3. Create a comment on article1
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        params: { articleId: article1.id },
      },
    );
  typia.assert(comment);
  // 4 & 5. Attempt to retrieve the comment using article2's articleId
  // This should return 404 Not Found because the comment belongs to article1, not article2
  await TestValidator.httpError(
    "comment not found when using different article ID",
    404,
    async () =>
      await api.functional.discussionBoard.articles.comments.at(connection, {
        articleId: article2.id,
        commentId: comment.id,
      }),
  );
}
