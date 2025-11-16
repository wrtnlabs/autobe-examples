import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test the complete workflow of a member attaching a document file to their own
 * article.
 *
 * This test validates that authenticated members can successfully upload file
 * attachments to articles they have created through the two-phase upload
 * pattern.
 *
 * Test workflow:
 *
 * 1. Register a new member account and obtain authentication token
 * 2. Create a discussion board article as the authenticated member
 * 3. Upload a file attachment (PDF document) to the created article with valid
 *    metadata
 * 4. Verify the file attachment is created successfully with correct metadata
 * 5. Validate that the file is properly associated with the parent article
 * 6. Confirm all expected file metadata fields are present in the response
 */
export async function test_api_article_file_attachment_by_author(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!";
  const memberUsername = RandomGenerator.name(2);

  const registrationData = {
    email: memberEmail,
    password: memberPassword,
    username: memberUsername,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });
  typia.assert(authorizedMember);

  // Step 2: Create a discussion board article as the authenticated member
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const articleBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 4,
    wordMax: 8,
  });

  const articleData = {
    title: articleTitle,
    body: articleBody,
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(createdArticle);

  TestValidator.equals(
    "article title matches input",
    createdArticle.title,
    articleTitle,
  );
  TestValidator.equals(
    "article body matches input",
    createdArticle.body,
    articleBody,
  );
  TestValidator.equals(
    "article author ID matches authenticated member",
    createdArticle.author.id,
    authorizedMember.id,
  );

  // Step 3: Upload a file attachment to the created article
  // Simulate phase 1: Binary file already uploaded to external storage (mocked)
  // Phase 2: Create database record linking file metadata to article

  const fileMetadata = {
    original_filename: "economic_analysis_report.pdf",
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5000000>
    >(),
    content_type: "application/pdf",
    storage_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardArticleFile.ICreate;

  const uploadedFile: IDiscussionBoardArticleFile =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: createdArticle.id,
        body: fileMetadata,
      },
    );
  typia.assert(uploadedFile);

  // Step 4: Validate the file attachment metadata
  TestValidator.equals(
    "file original filename matches",
    uploadedFile.original_filename,
    fileMetadata.original_filename,
  );
  TestValidator.equals(
    "file size matches",
    uploadedFile.file_size,
    fileMetadata.file_size,
  );
  TestValidator.equals(
    "file content type matches",
    uploadedFile.content_type,
    fileMetadata.content_type,
  );
  TestValidator.equals(
    "file storage URL matches",
    uploadedFile.storage_url,
    fileMetadata.storage_url,
  );

  // Step 5: Verify file is properly associated with the article
  TestValidator.equals(
    "file is associated with correct article",
    uploadedFile.discussion_board_article_id,
    createdArticle.id,
  );
}
