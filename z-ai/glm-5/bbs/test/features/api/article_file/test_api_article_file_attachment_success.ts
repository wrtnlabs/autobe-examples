import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_articles_files_create } from "../../../generate/generate_random_discussion_board_user_articles_files_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

/**
 * Test successful file attachment to an article by the article author.
 *
 * This test validates that a user can successfully attach a file to their article.
 * The workflow includes:
 * 1. User authentication via join
 * 2. Article creation
 * 3. File attachment with metadata validation
 */
export async function test_api_article_file_attachment_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Create an article with a random section ID
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        sectionId: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(article);
  // 3. Prepare file attachment metadata
  const fileMetadata = {
    original_filename: "test-document.pdf",
    storage_path: "https://storage.example.com/files/test-document.pdf",
    file_size: 1024000 satisfies number as number,
    mime_type: "application/pdf",
  } satisfies IDiscussionBoardArticleFile.ICreate;
  // 4. Attach file to the article
  const attachedFile =
    await api.functional.discussionBoard.user.articles.files.create(
      userConnection,
      {
        articleId: article.id,
        body: fileMetadata,
      },
    );
  typia.assert(attachedFile);
  // 5. Validate business logic: input matches output
  TestValidator.equals(
    "original filename matches",
    attachedFile.original_filename,
    fileMetadata.original_filename,
  );
  TestValidator.equals(
    "file size matches",
    attachedFile.file_size,
    fileMetadata.file_size,
  );
  TestValidator.equals(
    "mime type matches",
    attachedFile.mime_type,
    fileMetadata.mime_type,
  );
}
