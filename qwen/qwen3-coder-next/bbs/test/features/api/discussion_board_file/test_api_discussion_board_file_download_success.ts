import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_discussion_board_file_download_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate test data using available DTOs
  const mockArticleFile: IDiscussionBoardArticleFile = {
    id: typia.random<string & tags.Format<"uuid">>(),
    article_id: typia.random<string & tags.Format<"uuid">>(),
    article: {
      id: typia.random<string & tags.Format<"uuid">>(),
      title: RandomGenerator.name(),
      content: RandomGenerator.content({ paragraphs: 2 }),
      author: {
        id: typia.random<string & tags.Format<"uuid">>(),
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(),
        is_active: true,
        is_admin: false,
        is_super_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      section: {
        id: typia.random<string & tags.Format<"uuid">>(),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 1 }),
      },
      commentCount: typia.random<number & tags.Type<"int32">>(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    original_filename: "test_file.txt",
    file_path: `/uploads/${RandomGenerator.alphaNumeric(8)}/test_file.txt`,
    mime_type: "text/plain",
    file_size: 1024,
  };
  // Create a simulated response for the file download
  // Since we only have the 'at' function which returns random data,
  // we'll test with generated data that matches the expected structure
  typia.assert<IDiscussionBoardArticleFile>(mockArticleFile);
  // Test the API call with valid parameters
  const downloadedFile = await api.functional.discussionBoard.articles.files.at(
    connection,
    {
      articleId: mockArticleFile.article_id,
      fileId: mockArticleFile.id,
    },
  );
  // Verify the response structure
  typia.assert<IDiscussionBoardArticleFile>(downloadedFile);
  // Validate file metadata properties
  TestValidator.equals(
    "original filename is present",
    downloadedFile.original_filename.length > 0,
    true,
  );
  TestValidator.equals(
    "mime type is present",
    downloadedFile.mime_type.length > 0,
    true,
  );
  TestValidator.predicate(
    "file size is positive",
    downloadedFile.file_size > 0,
  );
  TestValidator.equals(
    "file path is present",
    downloadedFile.file_path.length > 0,
    true,
  );
  // Validate article relationship
  TestValidator.equals(
    "article has valid id",
    downloadedFile.article.id.length > 0,
    true,
  );
  TestValidator.equals(
    "article has title",
    downloadedFile.article.title.length > 0,
    true,
  );
  TestValidator.equals(
    "article has author",
    downloadedFile.article.author.id.length > 0,
    true,
  );
  TestValidator.equals(
    "article has section",
    downloadedFile.article.section.id.length > 0,
    true,
  );
  // Test that endpoint is public (no authentication required)
  // The 'at' function works with base connection without auth headers
  const publicConnection: api.IConnection = { host: connection.host };
  const publicFile = await api.functional.discussionBoard.articles.files.at(
    publicConnection,
    {
      articleId: downloadedFile.article_id,
      fileId: downloadedFile.id,
    },
  );
  typia.assert(publicFile);
}
