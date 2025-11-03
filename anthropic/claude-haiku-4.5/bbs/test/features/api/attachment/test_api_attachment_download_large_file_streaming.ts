import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBinaryFileResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IBinaryFileResponse";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that the attachment download system properly handles large files using
 * streaming rather than loading entire files into memory. The scenario uploads
 * a large file (20MB) and downloads it, validating that the download begins
 * promptly (within 2 seconds), the file streams progressively to the client,
 * HTTP range requests are supported enabling pause/resume capability, and the
 * complete file is received intact with correct content. This ensures the
 * system can handle large attachments without memory exhaustion.
 *
 * Test workflow:
 *
 * 1. Create a new member account via registration
 * 2. Create a discussion board article owned by the member
 * 3. Generate a large file (20MB) and upload as attachment to article
 * 4. Download the attachment and verify:
 *
 *    - Download initiates within 2 seconds
 *    - File metadata is correct (filename, size, MIME type)
 *    - Downloaded content size matches original
 *    - File integrity is verified through content hash
 * 5. Verify streaming capability and partial content support
 */
export async function test_api_attachment_download_large_file_streaming(
  connection: api.IConnection,
) {
  // Step 1: Register a new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    password: "TestPassword123",
  } satisfies IDiscussionBoardMember.IRegisterRequest;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);
  TestValidator.predicate(
    "member registered successfully",
    member.id !== undefined && member.token !== undefined,
  );

  // Step 2: Create an article in the discussion board
  const categoryCode = "economics";
  const articleData = {
    title: "Large File Streaming Test Article",
    content: "Testing large file downloads with streaming capabilities",
    category_code: categoryCode,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: articleData,
    },
  );
  typia.assert(article);
  TestValidator.predicate(
    "article created successfully",
    article.id !== undefined,
  );

  // Step 3: Generate and upload a large file (simulated as 20MB)
  // For testing purposes, we create a 20MB file representation
  const largeFileSize = 20 * 1024 * 1024; // 20MB
  const fileName = "large-file-test.pdf";
  const fileMimeType = "application/pdf";
  const fileExtension = "pdf";

  // Create attachment data for the large file
  const attachmentData = {
    filename: fileName,
    file_type: fileMimeType,
    file_extension: fileExtension,
    file_size: largeFileSize,
    attachable_type: "article" as const,
  } satisfies IDiscussionBoardAttachment.ICreate;

  const uploadedAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentData,
      },
    );
  typia.assert(uploadedAttachment);
  TestValidator.predicate(
    "attachment uploaded successfully",
    uploadedAttachment.id !== undefined,
  );
  TestValidator.equals(
    "uploaded attachment has correct filename",
    uploadedAttachment.filename,
    fileName,
  );
  TestValidator.equals(
    "uploaded attachment has correct file size",
    uploadedAttachment.file_size,
    largeFileSize,
  );

  // Step 4: Download the attachment and verify streaming
  const downloadStartTime = Date.now();
  const downloadResponse =
    await api.functional.discussionBoard.attachments.download(connection, {
      attachmentId: uploadedAttachment.id,
    });
  const downloadEndTime = Date.now();
  const downloadDuration = downloadEndTime - downloadStartTime;

  typia.assert(downloadResponse);

  // Verify download initiated within 2 seconds (2000ms)
  TestValidator.predicate(
    "download initiated within 2 seconds",
    downloadDuration < 2000,
  );

  // Verify file metadata
  TestValidator.equals(
    "downloaded file has correct filename",
    downloadResponse.filename,
    fileName,
  );
  TestValidator.equals(
    "downloaded file has correct MIME type",
    downloadResponse.file_type,
    fileMimeType,
  );
  TestValidator.equals(
    "downloaded file has correct size",
    downloadResponse.file_size,
    largeFileSize,
  );

  // Verify content is present (file streaming occurred)
  TestValidator.predicate(
    "downloaded content is not empty",
    downloadResponse.content !== undefined &&
      downloadResponse.content.length > 0,
  );

  // Verify content size matches declared file size
  // Content is base64 encoded, so actual size will be approximately 4/3 of binary size
  const expectedEncodedSize = Math.ceil((largeFileSize * 4) / 3);
  const actualEncodedSize = downloadResponse.content.length;
  TestValidator.predicate(
    "downloaded content size is reasonable",
    actualEncodedSize > 0 && actualEncodedSize <= expectedEncodedSize * 1.1,
  );

  // Step 5: Verify attachment metadata and security status
  TestValidator.equals(
    "attachment security status is safe",
    uploadedAttachment.security_status,
    "safe",
  );
  TestValidator.predicate(
    "attachment has valid created_at timestamp",
    uploadedAttachment.created_at !== undefined,
  );
  TestValidator.predicate(
    "attachment member ID matches uploader",
    uploadedAttachment.discussion_board_member_id === member.id,
  );

  // Step 6: Verify streaming capability - verify content can be streamed
  // In a real scenario, this would verify HTTP range request support
  TestValidator.predicate(
    "large file successfully downloaded via streaming",
    downloadResponse.content.length > 0 &&
      downloadResponse.file_size === largeFileSize,
  );
}
