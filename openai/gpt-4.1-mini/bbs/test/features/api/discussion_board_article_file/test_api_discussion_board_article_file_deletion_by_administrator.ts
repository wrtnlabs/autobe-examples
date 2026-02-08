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

export async function test_api_discussion_board_article_file_deletion_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Registered user joins and authenticates
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_registered_user_join(userJoinConnection, {});
  typia.assert(userAuth);
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: userAuth.token.access };
  // 2. Registered user creates an article
  const articleRaw =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {},
    );
  typia.assert(articleRaw);
  const article = typia.assert<IDiscussionBoardArticle & IEntity>(articleRaw);
  // 3. Registered user attaches a file to the article
  const fileRaw =
    await generate_random_discussion_board_registered_user_articles_files_create_file(
      userConnection,
      {
        params: { articleId: article.id },
      },
    );
  typia.assert(fileRaw);
  const file = typia.assert<IDiscussionBoardArticleFile & IEntity>(fileRaw);
  // 4. Administrator joins and authenticates
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminJoinConnection, {});
  typia.assert(adminAuth);
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // 5. Administrator deletes the file attached to the registered user's article
  await api.functional.discussionBoard.registeredUser.articles.files.erase(
    adminConnection,
    {
      articleId: article.id,
      fileId: file.id,
    },
  );
  // 6. No content means successful deletion
  // Since erase returns void and no response body, reaching here means pass
  // For completeness no assertions needed on response as per REST conventions
}
