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

export async function test_api_user_article_file_deletion_own_article(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Authenticate as regular user
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Create an article with a valid section ID (using a random UUID as placeholder)
  // In a real scenario, we would need to create or reference an existing section
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
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
  // Attach a file to the article
  const file =
    await generate_random_discussion_board_user_articles_files_create(
      userConnection,
      {
        body: {
          file_name: `test-file-${RandomGenerator.alphabets(5)}.txt`,
          file_type: "text/plain",
          file_size: typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<100> &
              tags.Maximum<5000>
          >(),
          storage_path: `/uploads/${typia.random<string & tags.Format<"uuid">>()}.txt`,
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardArticleFile.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(file);
  // Delete the file attachment
  const deletedFile =
    await api.functional.discussionBoard.user.articles.files.erase(
      userConnection,
      {
        articleId: article.id,
        fileId: file.id,
      },
    );
  typia.assert(deletedFile);
  // Validate that the file is soft-deleted (deletedAt timestamp is set)
  TestValidator.predicate(
    "file should have deletion timestamp",
    deletedFile.deletedAt !== null,
  );
  TestValidator.predicate(
    "deletion timestamp should be valid date",
    !isNaN(new Date(deletedFile.deletedAt!).getTime()),
  );
  // Validate that file metadata is preserved
  TestValidator.equals("file ID should match", deletedFile.id, file.id);
  TestValidator.equals(
    "file name should match",
    deletedFile.fileName,
    file.fileName,
  );
  TestValidator.equals(
    "file type should match",
    deletedFile.fileType,
    file.fileType,
  );
  TestValidator.equals(
    "file size should match",
    deletedFile.fileSize,
    file.fileSize,
  );
  TestValidator.equals(
    "storage path should match",
    deletedFile.storagePath,
    file.storagePath,
  );
  TestValidator.equals(
    "description should match",
    deletedFile.description,
    file.description,
  );
  TestValidator.equals(
    "uploadedBy should match",
    deletedFile.uploadedBy,
    file.uploadedBy,
  );
  // Verify that attempting to delete the same file again should fail
  await TestValidator.error(
    "should not allow deleting already deleted file",
    async () => {
      await api.functional.discussionBoard.user.articles.files.erase(
        userConnection,
        {
          articleId: article.id,
          fileId: file.id,
        },
      );
    },
  );
}
