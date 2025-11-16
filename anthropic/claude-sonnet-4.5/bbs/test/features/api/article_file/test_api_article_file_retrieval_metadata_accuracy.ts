import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test the accuracy and completeness of file metadata returned during retrieval
 * operations.
 *
 * This test validates that file attachment metadata is correctly stored and
 * retrieved for discussion board articles. It verifies all metadata fields
 * including original filename, file size, content type, storage URL,
 * timestamps, and foreign key relationships.
 *
 * Workflow:
 *
 * 1. Create a new member account via join operation
 * 2. Create a new discussion board article
 * 3. Upload a file attachment with comprehensive metadata
 * 4. Retrieve the uploaded file using GET operation
 * 5. Perform detailed validation of all returned fields
 * 6. Verify data types, formats, and field completeness
 */
export async function test_api_article_file_retrieval_metadata_accuracy(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for authentication
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(member);

  // Step 2: Create a new discussion board article
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 3: Upload a file attachment with comprehensive metadata
  const fileMetadata = {
    original_filename: "economic_policy_analysis_2025.pdf",
    file_size: 2458624,
    content_type: "application/pdf",
    storage_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardArticleFile.ICreate;

  const uploadedFile: IDiscussionBoardArticleFile =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: article.id,
        body: fileMetadata,
      },
    );
  typia.assert(uploadedFile);

  // Step 4: Retrieve the uploaded file using GET operation
  const retrievedFile: IDiscussionBoardArticleFile =
    await api.functional.discussionBoard.articles.files.at(connection, {
      articleId: article.id,
      fileId: uploadedFile.id,
    });
  typia.assert(retrievedFile);

  // Step 5: Perform detailed validation of all returned fields
  TestValidator.equals(
    "file ID should match uploaded file ID",
    retrievedFile.id,
    uploadedFile.id,
  );

  TestValidator.equals(
    "article ID should match parent article",
    retrievedFile.discussion_board_article_id,
    article.id,
  );

  TestValidator.equals(
    "original filename should match exactly",
    retrievedFile.original_filename,
    fileMetadata.original_filename,
  );

  TestValidator.equals(
    "file size should match exact byte count",
    retrievedFile.file_size,
    fileMetadata.file_size,
  );

  TestValidator.equals(
    "content type should match MIME type",
    retrievedFile.content_type,
    fileMetadata.content_type,
  );

  TestValidator.equals(
    "storage URL should match uploaded URL",
    retrievedFile.storage_url,
    fileMetadata.storage_url,
  );

  TestValidator.equals(
    "deleted_at should be null for active file",
    retrievedFile.deleted_at,
    null,
  );
}
