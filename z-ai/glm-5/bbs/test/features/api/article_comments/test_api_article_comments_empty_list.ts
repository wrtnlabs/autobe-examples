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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

/**
 * Test listing comments for an article with no comments.
 *
 * This test validates that when a newly created article has no comments,
 * the comment list endpoint returns an empty data array with proper
 * pagination metadata.
 *
 * Test Flow:
 * 1. User joins the platform and authenticates
 * 2. User creates a new article
 * 3. Call comment list endpoint for the article
 * 4. Verify response: empty data array, correct pagination metadata
 */
export async function test_api_article_comments_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. User joins the platform
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. User creates a new article
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {},
  );
  typia.assert(article);
  // 3. Call comment list endpoint for the article
  const commentList =
    await api.functional.discussionBoard.articles.comments.index(
      userConnection,
      {
        articleId: article.id,
        body: {} satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(commentList);
  // 4. Verify response - empty data array
  TestValidator.equals("data array is empty", commentList.data, []);
  // 5. Verify pagination metadata
  TestValidator.equals(
    "pagination.current equals 1",
    commentList.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit equals 20",
    commentList.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination.records equals 0",
    commentList.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination.pages equals 0",
    commentList.pagination.pages,
    0,
  );
}
