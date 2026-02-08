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

export async function test_api_registered_user_article_file_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new user and authorize
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Create article as the registered user
  const articleRaw =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      { body: {} },
    );
  const article = typia.assert(
    articleRaw as IDiscussionBoardArticle & {
      id: string;
    },
  );
  // 3. Attach a file to the article
  const fileRaw =
    await generate_random_discussion_board_registered_user_articles_files_create_file(
      userConnection,
      { params: { articleId: article.id }, body: {} },
    );
  const file = typia.assert(
    fileRaw as IDiscussionBoardArticleFile & {
      id: string;
      name: string;
      mime: string;
      size: number | null;
      download_url: string;
      order: number | null;
    },
  );
  // 4. Prepare updated file data
  const updatedName = file.name + "_updated";
  const updatedMime =
    file.mime === "application/octet-stream" ? "application/pdf" : file.mime;
  const updatedSize = (file.size ?? 1024) + 512;
  const updatedDownloadUrl = file.download_url + "?updated=true";
  const updatedOrder = (file.order ?? 0) + 1;
  const updatedFileBody: IDiscussionBoardArticleFile.IUpdate = {
    name: updatedName,
    mime: updatedMime,
    size: updatedSize,
    download_url: updatedDownloadUrl,
    order: updatedOrder,
  };
  // 5. Update the file as article author
  const updatedFileRaw =
    await api.functional.discussionBoard.registeredUser.articles.files.updateFile(
      userConnection,
      {
        articleId: article.id,
        fileId: file.id,
        body: updatedFileBody,
      },
    );
  const updatedFile = typia.assert(
    updatedFileRaw as IDiscussionBoardArticleFile & {
      name: string;
      mime: string;
      size: number | null;
      download_url: string;
      order: number | null;
    },
  );
  // 6. Verify updated metadata
  TestValidator.equals("file name updated", updatedFile.name, updatedName);
  TestValidator.equals("file mime updated", updatedFile.mime, updatedMime);
  TestValidator.equals("file size updated", updatedFile.size, updatedSize);
  TestValidator.equals(
    "file download_url updated",
    updatedFile.download_url,
    updatedDownloadUrl,
  );
  TestValidator.equals("file order updated", updatedFile.order, updatedOrder);
  // 7. Attempt updating with mismatched articleId and fileId
  await TestValidator.error(
    "update rejected for mismatched articleId and fileId",
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.files.updateFile(
        userConnection,
        {
          articleId: article.id,
          fileId: typia.random<string & tags.Format<"uuid">>(),
          body: updatedFileBody,
        },
      );
    },
  );
  // 8. Attempt update by another user
  const anotherUserConnection: api.IConnection = { host: connection.host };
  const anotherAuthorized = await authorize_registered_user_join(
    anotherUserConnection,
    { body: {} },
  );
  anotherUserConnection.headers = {
    Authorization: `Bearer ${anotherAuthorized.token.access}`,
  };
  await TestValidator.error("update rejected for non-author user", async () => {
    await api.functional.discussionBoard.registeredUser.articles.files.updateFile(
      anotherUserConnection,
      {
        articleId: article.id,
        fileId: file.id,
        body: updatedFileBody,
      },
    );
  });
}
