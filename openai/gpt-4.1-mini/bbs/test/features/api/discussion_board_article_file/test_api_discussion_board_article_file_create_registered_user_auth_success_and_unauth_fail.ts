import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachmentReference";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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

export async function test_api_discussion_board_article_file_create_registered_user_auth_success_and_unauth_fail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new registered user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_registered_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Abcd1234!",
    },
  });
  typia.assert(userAuth);
  userConnection.headers = {
    Authorization: userAuth.token.access,
  };
  // 2. Create a new article as the registered user
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {},
    );
  typia.assert(article);
  // 3. Generate a random article file for the article
  const file =
    await generate_random_discussion_board_registered_user_articles_files_create_file(
      userConnection,
      {
        params: { articleId: article.id },
      },
    );
  typia.assert(file);
  // 4. Validate that returned file data matches input and article linkage
  TestValidator.equals("linked article ID", file.articleId, article.id);
  TestValidator.predicate("fileName is non-empty", file.fileName.length > 0);
  TestValidator.predicate("fileType is non-empty", file.fileType.length > 0);
  TestValidator.predicate("fileSize is positive", file.fileSize > 0);
  TestValidator.predicate(
    "downloadUrl is non-empty",
    file.downloadUrl.length > 0,
  );
  TestValidator.predicate(
    "displayOrder is non-negative",
    file.displayOrder >= 0,
  );
  // 5. Attempt to create a file attachment without authentication
  const unauthFileCreateBody =
    typia.random<IDiscussionBoardArticleFile.ICreate>();
  await TestValidator.httpError(
    "unauthorized file create should fail",
    401,
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.files.createFile(
        connection,
        { articleId: article.id, body: unauthFileCreateBody },
      );
    },
  );
}
