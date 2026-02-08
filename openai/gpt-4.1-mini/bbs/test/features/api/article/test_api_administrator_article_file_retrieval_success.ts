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

export async function test_api_administrator_article_file_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Administrator joins the system
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_administrator_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdministrator.IJoin>(),
  });
  typia.assert(adminJoin);
  // Registered user joins and logs in
  const userConnection: api.IConnection = { host: connection.host };
  const userJoin = await authorize_registered_user_join(userConnection, {
    body: typia.random<IDiscussionBoardRegisteredUser.IJoin>(),
  });
  typia.assert(userJoin);
  const userLogin = await authorize_registered_user_login(userConnection, {
    body: typia.random<IDiscussionBoardRegisteredUser.ILogin>(),
  });
  typia.assert(userLogin);
  // Registered user creates an article
  const articleRaw =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {},
    );
  const article: IDiscussionBoardArticle = articleRaw satisfies IDiscussionBoardArticle;
  typia.assert(article);
  // Registered user attaches a file to the article
  const fileRaw =
    await generate_random_discussion_board_registered_user_articles_files_create_file(
      userConnection,
      {
        params: { articleId: (article as IDiscussionBoardArticle & { id: string }).id },
      },
    );
  const file: IDiscussionBoardArticleFile = fileRaw satisfies IDiscussionBoardArticleFile;
  typia.assert(file);
  // Administrator retrieves the metadata of the attached file
  const retrievedFileRaw =
    await api.functional.discussionBoard.administrator.articles.files.at(
      adminConnection,
      { articleId: (article as IDiscussionBoardArticle & { id: string }).id, fileId: (file as IDiscussionBoardArticleFile & { id: string }).id },
    );
  const retrievedFile: IDiscussionBoardArticleFile = retrievedFileRaw satisfies IDiscussionBoardArticleFile;
  typia.assert(retrievedFile);
  // Validate fields are as expected
  TestValidator.equals("file ID", (retrievedFile as IDiscussionBoardArticleFile & { id: string }).id, (file as IDiscussionBoardArticleFile & { id: string }).id);
  TestValidator.equals("file name", (retrievedFile as IDiscussionBoardArticleFile & { fileName: string }).fileName, (file as IDiscussionBoardArticleFile & { fileName: string }).fileName);
  TestValidator.equals("file type", (retrievedFile as IDiscussionBoardArticleFile & { fileType: string }).fileType, (file as IDiscussionBoardArticleFile & { fileType: string }).fileType);
  TestValidator.equals("file size", (retrievedFile as IDiscussionBoardArticleFile & { fileSize: number }).fileSize, (file as IDiscussionBoardArticleFile & { fileSize: number }).fileSize);
  TestValidator.equals(
    "download URL",
    (retrievedFile as IDiscussionBoardArticleFile & { downloadUrl: string }).downloadUrl,
    (file as IDiscussionBoardArticleFile & { downloadUrl: string }).downloadUrl,
  );
  TestValidator.predicate(
    "createdAt is recent",
    new Date((retrievedFile as IDiscussionBoardArticleFile & { createdAt: string }).createdAt).getTime() > Date.now() - 1000 * 60 * 60,
  );
  TestValidator.predicate(
    "updatedAt is recent",
    new Date((retrievedFile as IDiscussionBoardArticleFile & { updatedAt: string }).updatedAt).getTime() > Date.now() - 1000 * 60 * 60,
  );
  // Authorization enforcement test: invalid connection
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access by non-admin", async () => {
    await api.functional.discussionBoard.administrator.articles.files.at(
      guestConnection,
      {
        articleId: (article as IDiscussionBoardArticle & { id: string }).id,
        fileId: (file as IDiscussionBoardArticleFile & { id: string }).id,
      },
    );
  });
  // Error handling: non-existent article
  await TestValidator.error("non-existent article", async () => {
    await api.functional.discussionBoard.administrator.articles.files.at(
      adminConnection,
      {
        articleId: typia.random<string & tags.Format<"uuid">>(),
        fileId: (file as IDiscussionBoardArticleFile & { id: string }).id,
      },
    );
  });
  // Error handling: non-existent file
  await TestValidator.error("non-existent file", async () => {
    await api.functional.discussionBoard.administrator.articles.files.at(
      adminConnection,
      {
        articleId: (article as IDiscussionBoardArticle & { id: string }).id,
        fileId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
