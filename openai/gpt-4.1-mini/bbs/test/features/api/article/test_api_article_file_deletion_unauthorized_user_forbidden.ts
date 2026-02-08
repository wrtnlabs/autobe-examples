import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { generate_random_discussion_board_registered_user_articles_files_create_file } from "../../../generate/generate_random_discussion_board_registered_user_articles_files_create_file";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

export async function test_api_article_file_deletion_unauthorized_user_forbidden(
  connection: api.IConnection,
): Promise<void> {
  /*
    This test scenario verifies that a deletion request by an unauthorized user (non-administrator) to delete a file attached to an article must fail.
    It ensures the system rejects unauthorized deletion attempts and protects file integrity.
  
    Steps:
    1. A user is registered and logs in.
    2. The user creates an article.
    3. The user attaches a file to the article.
    4. The user attempts to delete the attached file via administrator API and expects a forbidden error.
    */
  // 1. User joins
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  typia.assert(userAuth);
  // 2. User logs in
  const userLoginConnection: api.IConnection = { host: connection.host };
  const userLogin = await authorize_registered_user_login(userLoginConnection, {
    body: {},
  });
  typia.assert(userLogin);
  userLoginConnection.headers ??= {};
  userLoginConnection.headers.Authorization = userLogin.token.access;
  // 3. User creates an article
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userLoginConnection,
      { body: {} },
    );
  typia.assert(article);
  // 4. User attaches a file to the article
  const file =
    await generate_random_discussion_board_registered_user_articles_files_create_file(
      userLoginConnection,
      {
        params: { articleId: "00000000-0000-0000-0000-000000000000" },
        body: {},
      },
    );
  typia.assert(file);
  // 5. Unauthorized user tries deleting the file through administrator API - expect 403 Forbidden
  await TestValidator.httpError(
    "delete article file failure for unauthorized user",
    403,
    async () => {
      await api.functional.discussionBoard.administrator.articles.files.erase(
        userLoginConnection,
        {
          articleId: typia.random<string & tags.Format<"uuid">>(),
          fileId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
