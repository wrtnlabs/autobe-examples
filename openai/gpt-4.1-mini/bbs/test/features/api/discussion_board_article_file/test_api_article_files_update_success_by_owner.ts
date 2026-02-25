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
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_files_update_success_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authorize and register a new user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_registered_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongP@ssw0rd!123",
    },
  });
  userConnection.headers = { Authorization: userAuth.token.access };
  // 2. Create a new article by the user with optional file attachments (at least one attachment)
  const originalFile = {
    fileName: `file_${RandomGenerator.alphabets(5)}.txt`,
    fileType: "text/plain",
    fileSize: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    downloadUrl: `https://fileserver.com/download/${RandomGenerator.alphaNumeric(10)}`,
    displayOrder: 1,
  } satisfies IDiscussionBoardArticleFile.IUpdate;
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.name(3),
          content: RandomGenerator.content({ paragraphs: 2 }),
          sectionId: typia.random<string & tags.Format<"uuid">>(),
          attachments: [originalFile],
        },
      },
    );
  typia.assert(article);
  // 3. Update the metadata of the attached file
  const fileToUpdate = article.files.length > 0 ? article.files[0] : undefined;
  if (!fileToUpdate) throw new Error("Article has no attached files to update");
  const updatedFileData = {
    fileName: `updated_${RandomGenerator.alphabets(5)}.pdf`,
    fileType: "application/pdf",
    fileSize: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    downloadUrl: `https://cdn.example.com/files/${RandomGenerator.alphaNumeric(8)}`,
    displayOrder: 2,
  } satisfies IDiscussionBoardArticleFile.IUpdate;
  const updatedFile =
    await api.functional.discussionBoard.registeredUser.articles.files.updateFiles(
      userConnection,
      {
        articleId: article.id,
        body: updatedFileData,
      },
    );
  typia.assert(updatedFile);
  // 4. Validate updated file matches updated data
  TestValidator.equals("file id match", updatedFile.id, fileToUpdate.id);
  TestValidator.equals(
    "fileName updated",
    updatedFile.fileName,
    updatedFileData.fileName,
  );
  TestValidator.equals(
    "fileType updated",
    updatedFile.fileType,
    updatedFileData.fileType,
  );
  TestValidator.equals(
    "fileSize updated",
    updatedFile.fileSize,
    updatedFileData.fileSize,
  );
  TestValidator.equals(
    "downloadUrl updated",
    updatedFile.downloadUrl,
    updatedFileData.downloadUrl,
  );
  TestValidator.equals(
    "displayOrder updated",
    updatedFile.displayOrder,
    updatedFileData.displayOrder,
  );
}
