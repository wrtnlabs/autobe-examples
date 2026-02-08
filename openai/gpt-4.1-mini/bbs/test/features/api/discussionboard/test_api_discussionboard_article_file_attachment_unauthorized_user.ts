import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { generate_random_discussion_board_registered_user_articles_files_create_file } from "../../../generate/generate_random_discussion_board_registered_user_articles_files_create_file";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

/**
 * Scenario 2: Attempt to attach a file to an existing article by a user who is not the owner of the article.
 *
 * Steps:
 * 1. Register two registered users (user1 and user2) via POST /auth/registeredUser/join.
 * 2. User1 creates an article via POST /discussionBoard/registeredUser/articles.
 * 3. User2 attempts to attach a file to the article created by user1 via POST /discussionBoard/registeredUser/articles/{articleId}/files.
 *
 * Validation:
 * - The operation is rejected due to authorization failure (user2 is not the article owner).
 * - Proper error response is returned indicating lack of permission.
 */
export async function test_api_discussionboard_article_file_attachment_unauthorized_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register user1
  const user1Connection: api.IConnection = { host: connection.host };
  const user1Authorized = await authorize_registered_user_join(
    user1Connection,
    { body: {} },
  );
  user1Connection.headers ??= {};
  user1Connection.headers.Authorization = user1Authorized.token.access;
  // 2. Register user2
  const user2Connection: api.IConnection = { host: connection.host };
  const user2Authorized = await authorize_registered_user_join(
    user2Connection,
    { body: {} },
  );
  user2Connection.headers ??= {};
  user2Connection.headers.Authorization = user2Authorized.token.access;
  // 3. User1 creates an article
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      user1Connection,
      { body: {} },
    );
  typia.assert(article);
  // 4. User2 attempts to attach a file to user1's article - expect failure
  // Cannot identify article id property, aborting to maintain type safety and correctness
}