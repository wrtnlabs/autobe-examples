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
import { generate_random_discussion_board_user_articles_files_create } from "../../../generate/generate_random_discussion_board_user_articles_files_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

/**
 * Test that a file cannot be downloaded using a different article's ID than the one it belongs to.
 * This validates the security requirement that files are properly scoped to their parent articles.
 *
 * Setup:
 * 1. User registers and authenticates
 * 2. Create first article and attach a file to it
 * 3. Create second article (without any files)
 *
 * Test:
 * - Request file download using second article's ID and first article's file ID
 * - Expect 404 NOT_FOUND error (FILE_NOT_FOUND)
 */
export async function test_api_file_download_article_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // 1. User authentication
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Create first article
  const firstArticle =
    await generate_random_discussion_board_user_articles_create(
      userConnection,
      {},
    );
  typia.assert(firstArticle);
  // 3. Attach file to first article
  const file =
    await generate_random_discussion_board_user_articles_files_create(
      userConnection,
      {
        params: {
          articleId: firstArticle.id,
        },
      },
    );
  typia.assert(file);
  // 4. Create second article
  const secondArticle =
    await generate_random_discussion_board_user_articles_create(
      userConnection,
      {},
    );
  typia.assert(secondArticle);
  // 5. Test: Try to download file using wrong article ID
  // The file belongs to firstArticle, but we use secondArticle's ID
  await TestValidator.httpError(
    "file download with wrong article ID should return 404",
    404,
    async () =>
      await api.functional.discussionBoard.articles.files.at(userConnection, {
        articleId: secondArticle.id,
        fileId: file.id,
      }),
  );
}
