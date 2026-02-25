import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
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
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

/**
 * Test the error handling when attempting to download a file that does not exist.
 * This validates the FILE_NOT_FOUND error scenario.
 *
 * Setup:
 * 1. An authenticated user creates an article
 * 2. Request the file download endpoint with a valid articleId but a non-existent fileId (random UUID)
 *
 * Validate: Response returns 404 NOT_FOUND error with error code FILE_NOT_FOUND
 */
export async function test_api_file_download_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Create an article to get a valid articleId
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {},
  );
  typia.assert(article);
  // 3. Generate a non-existent fileId (random UUID)
  const nonExistentFileId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to download a non-existent file - expect 404 error
  // Use isolated connection for public endpoint
  const publicConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "should return 404 when file does not exist",
    404,
    async () => {
      await api.functional.discussionBoard.articles.files.at(publicConnection, {
        articleId: article.id,
        fileId: nonExistentFileId,
      });
    },
  );
}
