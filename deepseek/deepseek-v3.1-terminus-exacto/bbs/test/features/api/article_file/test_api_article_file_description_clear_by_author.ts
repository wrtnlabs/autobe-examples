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

export async function test_api_article_file_description_clear_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Step 1: Create user account
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Step 2: Create article with valid section_id
  // Note: This assumes a valid section exists in the system
  // In a real test, we would need to create a section first or use an existing one
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      },
    },
  );
  typia.assert(article);
  // Step 3: Attach file with description
  const file =
    await generate_random_discussion_board_user_articles_files_create(
      userConnection,
      {
        params: { articleId: article.id },
        body: {
          file_name: "test_file.txt",
          file_type: "text/plain",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
          >(),
          storage_path: "/uploads/test_file.txt",
          description: "Initial file description",
        },
      },
    );
  typia.assert(file);
  // Step 4: Update file description to null
  const updatedFile =
    await api.functional.discussionBoard.user.articles.files.update(
      userConnection,
      {
        articleId: article.id,
        fileId: file.id,
        body: {
          description: null,
        } satisfies IDiscussionBoardArticleFile.IUpdate,
      },
    );
  typia.assert(updatedFile);
  // Validate that description is now null
  TestValidator.equals(
    "description should be null",
    updatedFile.description,
    null,
  );
  // Validate that other file properties remain unchanged
  TestValidator.equals(
    "file id should remain the same",
    updatedFile.id,
    file.id,
  );
  TestValidator.equals(
    "file name should remain the same",
    updatedFile.fileName,
    file.fileName,
  );
  TestValidator.equals(
    "file type should remain the same",
    updatedFile.fileType,
    file.fileType,
  );
  TestValidator.equals(
    "file size should remain the same",
    updatedFile.fileSize,
    file.fileSize,
  );
  TestValidator.equals(
    "storage path should remain the same",
    updatedFile.storagePath,
    file.storagePath,
  );
}
