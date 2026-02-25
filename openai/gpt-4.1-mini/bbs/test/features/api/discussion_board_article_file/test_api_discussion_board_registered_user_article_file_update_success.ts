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

export async function test_api_discussion_board_registered_user_article_file_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user and login
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  typia.assert(authorized);
  userConnection.headers = { Authorization: authorized.token.access };
  // 2. Create a new article by the user
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      { body: {} },
    );
  typia.assert(article);
  // 3. Upload a file attachment to the article
  const file =
    await generate_random_discussion_board_registered_user_articles_files_create_file(
      userConnection,
      {
        params: { articleId: article.id },
        body: {},
      },
    );
  typia.assert(file);
  // 4. Prepare update payload with partial and full fields randomly
  const updatePayload: Partial<IDiscussionBoardArticleFile.IUpdate> = {};
  // Update all fields with new values
  updatePayload.fileName = RandomGenerator.alphabets(10) + ".txt";
  updatePayload.fileType = "text/plain";
  updatePayload.fileSize = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  updatePayload.downloadUrl = `https://example.com/downloads/${RandomGenerator.alphabets(8)}.txt`;
  updatePayload.displayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  // 5. Perform update by the owner user
  const updatedFile =
    await api.functional.discussionBoard.registeredUser.articles.files.update(
      userConnection,
      {
        articleId: article.id,
        fileId: file.id,
        body: updatePayload,
      },
    );
  typia.assert(updatedFile);
  // 6. Validate that updated values match updatePayload
  TestValidator.equals(
    "fileName updated",
    updatedFile.fileName,
    updatePayload.fileName,
  );
  TestValidator.equals(
    "fileType updated",
    updatedFile.fileType,
    updatePayload.fileType,
  );
  TestValidator.equals(
    "fileSize updated",
    updatedFile.fileSize,
    updatePayload.fileSize,
  );
  TestValidator.equals(
    "downloadUrl updated",
    updatedFile.downloadUrl,
    updatePayload.downloadUrl,
  );
  TestValidator.equals(
    "displayOrder updated",
    updatedFile.displayOrder,
    updatePayload.displayOrder,
  );
  // 7. Validate timestamps are present and updated
  TestValidator.predicate(
    "createdAt present",
    typeof updatedFile.createdAt === "string" &&
      updatedFile.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt present",
    typeof updatedFile.updatedAt === "string" &&
      updatedFile.updatedAt.length > 0,
  );
  // 8. Validate owner-only update access by attempting update with another user
  const otherUserConnection: api.IConnection = { host: connection.host };
  const otherAuthorized = await authorize_registered_user_join(
    otherUserConnection,
    { body: {} },
  );
  typia.assert(otherAuthorized);
  otherUserConnection.headers = { Authorization: otherAuthorized.token.access };
  // Attempt update with other user and expect error
  await TestValidator.error("non-owner update should fail", async () => {
    await api.functional.discussionBoard.registeredUser.articles.files.update(
      otherUserConnection,
      {
        articleId: article.id,
        fileId: file.id,
        body: { fileName: "hack.txt" },
      },
    );
  });
}
