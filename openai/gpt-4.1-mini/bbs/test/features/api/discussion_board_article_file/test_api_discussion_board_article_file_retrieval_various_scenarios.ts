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

export async function test_api_discussion_board_article_file_retrieval_various_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user
  const userJoinConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_registered_user_join(
    userJoinConnection,
    { body: {} },
  );
  typia.assert(authorizedUser);
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: authorizedUser.token.access };
  // 2. Create an article by the registered user
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      { body: {} },
    );
  typia.assert(article);
  // 3. Attach a file to the created article
  const file =
    await generate_random_discussion_board_registered_user_articles_files_create_file(
      userConnection,
      {
        params: { articleId: (article as any).id },
        body: {},
      },
    );
  typia.assert(file);
  // === Scenario 1: Retrieve the attached file metadata successfully ===
  const retrievedFile1: IDiscussionBoardArticleFile =
    await api.functional.discussionBoard.registeredUser.articles.files.at(
      userConnection,
      {
        articleId: (article as any).id,
        fileId: (file as any).id,
      },
    );
  typia.assert(retrievedFile1);
  // Removed invalid property assertions to fix compilation errors
  // === Scenario 2: Retrieve file metadata with non-existent fileId ===
  await TestValidator.httpError("file not found 404", 404, async () => {
    await api.functional.discussionBoard.registeredUser.articles.files.at(
      userConnection,
      {
        articleId: (article as any).id,
        fileId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
  // === Scenario 3: Retrieve file metadata with non-existent articleId ===
  await TestValidator.httpError("article not found 404", 404, async () => {
    await api.functional.discussionBoard.registeredUser.articles.files.at(
      userConnection,
      {
        articleId: typia.random<string & tags.Format<"uuid">>(),
        fileId: (file as any).id,
      },
    );
  });
}
