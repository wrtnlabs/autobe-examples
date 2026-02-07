import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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

export async function test_api_article_file_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // 2. Create article
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Upload file attachment
  const fileAttachment =
    await generate_random_discussion_board_user_articles_files_create(
      userConnection,
      {
        params: { articleId: article.id },
        body: {
          file_name: `test-file-${RandomGenerator.alphabets(5)}.txt`,
          file_type: "text/plain",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
          >(),
          storage_path: `/uploads/${typia.random<string & tags.Format<"uuid">>()}.txt`,
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(fileAttachment);
  // 4. Retrieve file metadata using user connection
  const retrievedFile = await api.functional.discussionBoard.articles.files.at(
    userConnection,
    {
      articleId: article.id,
      fileId: fileAttachment.id,
    },
  );
  typia.assert(retrievedFile);
  // 5. Validate file properties
  TestValidator.equals("file ID matches", retrievedFile.id, fileAttachment.id);
  TestValidator.equals(
    "file name matches",
    retrievedFile.fileName,
    fileAttachment.fileName,
  );
  TestValidator.equals(
    "file type matches",
    retrievedFile.fileType,
    fileAttachment.fileType,
  );
  TestValidator.equals(
    "file size matches",
    retrievedFile.fileSize,
    fileAttachment.fileSize,
  );
  TestValidator.equals(
    "storage path matches",
    retrievedFile.storagePath,
    fileAttachment.storagePath,
  );
  TestValidator.equals(
    "download count is zero",
    retrievedFile.downloadCount,
    0,
  );
  TestValidator.equals(
    "description matches",
    retrievedFile.description,
    fileAttachment.description,
  );
  TestValidator.predicate(
    "uploaded by matches user",
    retrievedFile.uploadedBy === user.id,
  );
  TestValidator.predicate(
    "created at is valid date",
    !isNaN(new Date(retrievedFile.createdAt).getTime()),
  );
  TestValidator.predicate(
    "updated at is valid date",
    !isNaN(new Date(retrievedFile.updatedAt).getTime()),
  );
  TestValidator.equals("deleted at is null", retrievedFile.deletedAt, null);
}