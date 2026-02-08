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

export async function test_api_discussion_board_article_file_deletion_unauthorized_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register user A and authorize
  const userAConnection: api.IConnection = { host: connection.host };
  const userAJoin = await authorize_registered_user_join(userAConnection, {
    body: {},
  });
  typia.assert(userAJoin);
  userAConnection.headers = {
    Authorization: `Bearer ${userAJoin.token.access}`,
  };
  // 2. User A creates an article
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userAConnection,
      {},
    );
  typia.assert(article);
  const articleId = (article as unknown as { id: string }).id ?? (article as unknown as { articleId: string }).articleId;
  // 3. User A attaches a file to the article
  const file =
    await generate_random_discussion_board_registered_user_articles_files_create_file(
      userAConnection,
      {
        params: { articleId },
      },
    );
  typia.assert(file);
  const fileId = (file as unknown as { id: string }).id ?? (file as unknown as { fileId: string }).fileId;
  // 4. Register user B and authorize
  const userBConnection: api.IConnection = { host: connection.host };
  const userBJoin = await authorize_registered_user_join(userBConnection, {
    body: {},
  });
  typia.assert(userBJoin);
  userBConnection.headers = {
    Authorization: `Bearer ${userBJoin.token.access}`,
  };
  // 5. User B tries to delete the file attached to user A's article
  await TestValidator.httpError(
    "unauthorized deletion attempt",
    403,
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.files.erase(
        userBConnection,
        {
          articleId: articleId,
          fileId: fileId,
        },
      );
    },
  );
  // 6. Confirm the file still exists by having user A try to delete it (success)
  await api.functional.discussionBoard.registeredUser.articles.files.erase(
    userAConnection,
    {
      articleId: articleId,
      fileId: fileId,
    },
  );
}
