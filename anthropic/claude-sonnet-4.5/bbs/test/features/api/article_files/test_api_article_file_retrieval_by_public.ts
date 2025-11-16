import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test the complete workflow of retrieving a specific file attachment from a
 * discussion board article without authentication.
 *
 * This test validates that file attachments are publicly accessible once
 * uploaded by members.
 *
 * Workflow:
 *
 * 1. Create a new member account via join operation to establish authentication
 *    context
 * 2. Create a new discussion board article using the authenticated member context
 * 3. Upload a file attachment to the created article with proper metadata
 * 4. Retrieve the specific file attachment using its article ID and file ID
 *    without any authentication
 * 5. Validate that the returned file object contains all expected metadata fields
 * 6. Verify that the file metadata matches what was originally uploaded
 * 7. Confirm that the storage_url is accessible and properly formatted
 * 8. Ensure that deleted_at is null indicating the file is active and not
 *    soft-deleted
 */
export async function test_api_article_file_retrieval_by_public(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for authenticated operations
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create a new discussion board article
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

  // Step 3: Upload a file attachment to the created article
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

  const selectedContentType = RandomGenerator.pick(contentTypes);

  const getFileExtension = (contentType: string): string => {
    const extensionMap: Record<string, string> = {
      "application/pdf": ".pdf",
      "application/msword": ".doc",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        ".docx",
      "application/vnd.ms-excel": ".xls",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        ".xlsx",
      "text/plain": ".txt",
      "text/csv": ".csv",
      "application/zip": ".zip",
    };
    return extensionMap[contentType] || ".bin";
  };

  const fileData = {
    original_filename: `${RandomGenerator.name(1)}_${RandomGenerator.alphaNumeric(6)}${getFileExtension(selectedContentType)}`,
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<26214400>
    >(),
    content_type: selectedContentType,
    storage_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardArticleFile.ICreate;

  const uploadedFile: IDiscussionBoardArticleFile =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: article.id,
        body: fileData,
      },
    );
  typia.assert(uploadedFile);

  // Step 4: Create unauthenticated connection and retrieve file without authentication
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const retrievedFile: IDiscussionBoardArticleFile =
    await api.functional.discussionBoard.articles.files.at(
      unauthenticatedConnection,
      {
        articleId: article.id,
        fileId: uploadedFile.id,
      },
    );
  typia.assert(retrievedFile);

  // Step 5: Validate all file metadata fields
  TestValidator.equals("file ID matches", retrievedFile.id, uploadedFile.id);
  TestValidator.equals(
    "article ID association",
    retrievedFile.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "original filename preserved",
    retrievedFile.original_filename,
    fileData.original_filename,
  );
  TestValidator.equals(
    "file size matches",
    retrievedFile.file_size,
    fileData.file_size,
  );
  TestValidator.equals(
    "content type matches",
    retrievedFile.content_type,
    selectedContentType,
  );
  TestValidator.equals(
    "storage URL matches",
    retrievedFile.storage_url,
    fileData.storage_url,
  );
  TestValidator.equals("deleted_at is null", retrievedFile.deleted_at, null);
  TestValidator.predicate(
    "created_at exists",
    retrievedFile.created_at !== null && retrievedFile.created_at !== undefined,
  );
}
