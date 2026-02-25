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
 * Test authorization enforcement when a non-author attempts to attach files to another user's article.
 *
 * This test validates the business rule that only the article author can attach files
 * to their article. Administrators also cannot modify user articles.
 *
 * Flow:
 * 1. User A authenticates and creates an article
 * 2. User B authenticates separately (different user)
 * 3. User B attempts to attach a file to User A's article
 * 4. System must reject with 403 Forbidden error
 */
export async function test_api_article_file_authorization_non_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. User A joins and authenticates
  const userAConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userAConnection, {});
  // 2. User A creates an article
  const article = await generate_random_discussion_board_user_articles_create(
    userAConnection,
    {},
  );
  typia.assert(article);
  // 3. User B joins and authenticates (separate connection - different user)
  const userBConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userBConnection, {});
  // 4. User B attempts to attach a file to User A's article
  // This should fail with 403 Forbidden - User B is not the author
  await TestValidator.httpError(
    "non-author cannot attach file to another user's article",
    403,
    async () => {
      await generate_random_discussion_board_user_articles_files_create(
        userBConnection,
        {
          params: { articleId: article.id },
        },
      );
    },
  );
}
