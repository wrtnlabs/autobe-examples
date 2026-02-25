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

export async function test_api_discussion_board_article_file_metadata_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as registered user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  typia.assert(userAuth);
  userConnection.headers = { Authorization: userAuth.token.access };
  // Create a new article
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      { body: {} },
    );
  typia.assert(article);
  // Attach a file to the article
  const file =
    await generate_random_discussion_board_registered_user_articles_files_create_file(
      userConnection,
      {
        params: { articleId: article.id },
        body: {},
      },
    );
  typia.assert(file);
  // Retrieve the metadata and download URL
  const fileMetadata =
    await api.functional.discussionBoard.registeredUser.articles.files.atFile(
      userConnection,
      {
        articleId: article.id,
        fileId: file.id,
      },
    );
  typia.assert(fileMetadata);
  // Validate fields
  TestValidator.equals("file id", fileMetadata.id, file.id);
  TestValidator.equals(
    "article id in file",
    fileMetadata.articleId,
    article.id,
  );
  TestValidator.equals("file name", fileMetadata.fileName, file.fileName);
  TestValidator.equals("file type", fileMetadata.fileType, file.fileType);
  TestValidator.equals("file size", fileMetadata.fileSize, file.fileSize);
  TestValidator.equals(
    "download URL",
    fileMetadata.downloadUrl,
    file.downloadUrl,
  );
  TestValidator.equals(
    "display order",
    fileMetadata.displayOrder,
    file.displayOrder,
  );
  TestValidator.predicate(
    "createdAt is ISO string",
    new Date(fileMetadata.createdAt).toISOString() === fileMetadata.createdAt,
  );
  TestValidator.predicate(
    "updatedAt is ISO string",
    new Date(fileMetadata.updatedAt).toISOString() === fileMetadata.updatedAt,
  );
  // Optionally check deletedAt presence (it can be null or ISO string)
  if (fileMetadata.deletedAt !== null && fileMetadata.deletedAt !== undefined) {
    TestValidator.predicate(
      "deletedAt is ISO string",
      new Date(fileMetadata.deletedAt).toISOString() === fileMetadata.deletedAt,
    );
  }
  // Test download URL accessibility by simple request (fetch)
  const res = await fetch(fileMetadata.downloadUrl, { method: "HEAD" });
  TestValidator.predicate("download URL is accessible", res.ok);
}
