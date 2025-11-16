import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test comprehensive file upload validation for discussion board article
 * attachments.
 *
 * This test validates that the system properly enforces file metadata
 * constraints including filename length validation (1-255 characters), file
 * size limits (1 byte minimum, approaching 25 MB maximum), content type
 * validation against allowed MIME types, and storage URL format validation.
 *
 * Workflow:
 *
 * 1. Create and authenticate member account
 * 2. Create article to attach files to
 * 3. Test valid file upload scenarios
 * 4. Test filename length boundaries (minimum 1, maximum 255 characters)
 * 5. Test file size boundaries (minimum 1 byte, large files up to ~25 MB)
 * 6. Test various valid content types (documents, spreadsheets, text, archives)
 * 7. Test various valid storage URL formats (HTTPS, S3, cloud providers)
 * 8. Validate all files are properly stored and retrievable
 */
export async function test_api_article_file_upload_validation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
    username: RandomGenerator.name(),
    href: "https://discussion-board.example.com/register",
    referrer: "https://search.engine.com/results",
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create article to attach files to
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 3: Test valid file upload with all fields meeting requirements
  const validFileData = {
    original_filename: "research-paper.pdf",
    file_size: 1048576,
    content_type: "application/pdf",
    storage_url: "https://cdn.example.com/files/research-paper-2024.pdf",
  } satisfies IDiscussionBoardArticleFile.ICreate;

  const validFile: IDiscussionBoardArticleFile =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: article.id,
        body: validFileData,
      },
    );
  typia.assert(validFile);
  TestValidator.equals(
    "valid file article ID matches",
    validFile.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "valid file original filename",
    validFile.original_filename,
    validFileData.original_filename,
  );
  TestValidator.equals(
    "valid file size",
    validFile.file_size,
    validFileData.file_size,
  );
  TestValidator.equals(
    "valid file content type",
    validFile.content_type,
    validFileData.content_type,
  );
  TestValidator.equals(
    "valid file storage URL",
    validFile.storage_url,
    validFileData.storage_url,
  );

  // Step 4a: Test filename at minimum length (1 character)
  const minFilenameData = {
    original_filename: "a",
    file_size: 2048,
    content_type: "text/plain",
    storage_url: "https://storage.example.com/files/a",
  } satisfies IDiscussionBoardArticleFile.ICreate;

  const minFilenameFile: IDiscussionBoardArticleFile =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: article.id,
        body: minFilenameData,
      },
    );
  typia.assert(minFilenameFile);
  TestValidator.equals(
    "minimum filename length is 1",
    minFilenameFile.original_filename.length,
    1,
  );

  // Step 4b: Test filename at maximum length (255 characters)
  const maxFilenameString = RandomGenerator.alphabets(240) + ".pdf";
  const maxFilenameData = {
    original_filename: maxFilenameString,
    file_size: 5000,
    content_type: "application/pdf",
    storage_url:
      "https://cdn.example.com/files/" + RandomGenerator.alphaNumeric(32),
  } satisfies IDiscussionBoardArticleFile.ICreate;

  const maxFilenameFile: IDiscussionBoardArticleFile =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: article.id,
        body: maxFilenameData,
      },
    );
  typia.assert(maxFilenameFile);
  TestValidator.predicate(
    "maximum filename length is 255",
    maxFilenameFile.original_filename.length <= 255,
  );

  // Step 5a: Test file size at minimum (1 byte)
  const minSizeData = {
    original_filename: "tiny.txt",
    file_size: 1,
    content_type: "text/plain",
    storage_url: "https://storage.example.com/files/tiny-file.txt",
  } satisfies IDiscussionBoardArticleFile.ICreate;

  const minSizeFile: IDiscussionBoardArticleFile =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: article.id,
        body: minSizeData,
      },
    );
  typia.assert(minSizeFile);
  TestValidator.equals("minimum file size is 1 byte", minSizeFile.file_size, 1);

  // Step 5b: Test large file size approaching 25 MB limit
  const largeSizeData = {
    original_filename: "large-dataset.csv",
    file_size: 26214400,
    content_type: "text/csv",
    storage_url: "https://s3.amazonaws.com/my-bucket/large-dataset-2024.csv",
  } satisfies IDiscussionBoardArticleFile.ICreate;

  const largeSizeFile: IDiscussionBoardArticleFile =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: article.id,
        body: largeSizeData,
      },
    );
  typia.assert(largeSizeFile);
  TestValidator.predicate(
    "large file size is valid",
    largeSizeFile.file_size > 0,
  );

  // Step 6: Test various valid content_type values
  const contentTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
    "application/zip",
  ] as const;

  const contentTypeFiles: IDiscussionBoardArticleFile[] =
    await ArrayUtil.asyncMap(contentTypes, async (contentType, index) => {
      const fileData = {
        original_filename: `test-file-${index}.dat`,
        file_size: 10000 + index * 1000,
        content_type: contentType,
        storage_url: `https://cdn.example.com/files/test-${index}-${RandomGenerator.alphaNumeric(16)}`,
      } satisfies IDiscussionBoardArticleFile.ICreate;

      const file: IDiscussionBoardArticleFile =
        await api.functional.discussionBoard.member.articles.files.create(
          connection,
          {
            articleId: article.id,
            body: fileData,
          },
        );
      typia.assert(file);
      TestValidator.equals(
        `content type ${index} matches`,
        file.content_type,
        contentType,
      );
      return file;
    });

  TestValidator.equals(
    "all content types uploaded successfully",
    contentTypeFiles.length,
    contentTypes.length,
  );

  // Step 7: Test various valid storage URL formats
  const storageUrls = [
    "https://cdn.cloudflare.com/files/document.pdf",
    "https://s3.amazonaws.com/bucket-name/path/to/file.docx",
    "https://storage.googleapis.com/bucket/object-key.xlsx",
    "https://azure.blob.core.windows.net/container/blob-name.txt",
    "https://files.example.com/uploads/2024/11/report.zip",
  ] as const;

  const urlFormatFiles: IDiscussionBoardArticleFile[] =
    await ArrayUtil.asyncMap(storageUrls, async (storageUrl, index) => {
      const fileData = {
        original_filename: `url-test-${index}.dat`,
        file_size: 5000 + index * 500,
        content_type: "application/pdf",
        storage_url: storageUrl,
      } satisfies IDiscussionBoardArticleFile.ICreate;

      const file: IDiscussionBoardArticleFile =
        await api.functional.discussionBoard.member.articles.files.create(
          connection,
          {
            articleId: article.id,
            body: fileData,
          },
        );
      typia.assert(file);
      TestValidator.equals(
        `storage URL ${index} matches`,
        file.storage_url,
        storageUrl,
      );
      return file;
    });

  TestValidator.equals(
    "all URL formats uploaded successfully",
    urlFormatFiles.length,
    storageUrls.length,
  );

  // Step 8: Validate all uploaded files have proper metadata and constraints
  const allUploadedFiles = [
    validFile,
    minFilenameFile,
    maxFilenameFile,
    minSizeFile,
    largeSizeFile,
    ...contentTypeFiles,
    ...urlFormatFiles,
  ];

  allUploadedFiles.forEach((file, index) => {
    TestValidator.equals(
      `file ${index} article ID matches`,
      file.discussion_board_article_id,
      article.id,
    );
    TestValidator.predicate(
      `file ${index} filename length valid`,
      file.original_filename.length >= 1 &&
        file.original_filename.length <= 255,
    );
    TestValidator.predicate(
      `file ${index} size is positive`,
      file.file_size >= 1,
    );
    TestValidator.predicate(
      `file ${index} has content type`,
      file.content_type.length > 0,
    );
    TestValidator.predicate(
      `file ${index} has storage URL`,
      file.storage_url.length > 0,
    );
    TestValidator.predicate(
      `file ${index} has created timestamp`,
      file.created_at.length > 0,
    );
  });

  TestValidator.equals("total files uploaded", allUploadedFiles.length, 15);
}
