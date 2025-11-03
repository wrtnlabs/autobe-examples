import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Validates member attachment security status retrieval workflow.
 *
 * Tests the complete workflow for members to check security validation status
 * of attachments they have uploaded to articles. This ensures members can
 * verify that files have passed antivirus scanning and are marked as safe
 * before being downloaded by others.
 *
 * Test workflow:
 *
 * 1. Register a new member account
 * 2. Create an article with initial content
 * 3. Upload an attachment to the article
 * 4. Retrieve the attachment's security status
 * 5. Verify security_status is one of the valid values
 * 6. Confirm malware_scan_result is included when available
 */
export async function test_api_attachment_security_status_member_retrieval(
  connection: api.IConnection,
) {
  // 1. Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";

  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(memberAuth);
  TestValidator.predicate(
    "member authorization token should exist",
    memberAuth.token.access !== null && memberAuth.token.access !== undefined,
  );

  // 2. Create an article with initial content
  const categoryCode = "economics";
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 2,
          wordMax: 5,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        category_code: categoryCode,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  TestValidator.predicate(
    "article should be created successfully",
    article.id !== null && article.id !== undefined,
  );

  // 3. Upload an attachment to the article
  const attachmentFileName = "test-document.pdf";
  const attachmentMimeType = "application/pdf";
  const attachmentExtension = "pdf";
  const attachmentSize = 5242880; // 5 MB (within 20MB limit for documents)

  const attachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          filename: attachmentFileName,
          file_type: attachmentMimeType,
          file_extension: attachmentExtension,
          file_size: attachmentSize,
          attachable_type: "article",
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment);
  TestValidator.predicate(
    "attachment should be uploaded successfully",
    attachment.id !== null && attachment.id !== undefined,
  );

  // 4. Retrieve the attachment's security status
  const securityStatus =
    await api.functional.discussionBoard.member.attachments.security_status.at(
      connection,
      {
        attachmentId: attachment.id,
      },
    );
  typia.assert(securityStatus);

  // 5. Verify security_status is one of the valid values
  const validStatuses = ["pending_scan", "safe", "infected", "quarantined"];
  TestValidator.predicate(
    "security_status should be one of valid values",
    validStatuses.includes(securityStatus.security_status),
  );

  // 6. Verify attachment metadata is correctly returned
  TestValidator.equals(
    "returned attachment ID matches uploaded attachment",
    securityStatus.id,
    attachment.id,
  );

  TestValidator.equals(
    "returned filename matches uploaded filename",
    securityStatus.filename,
    attachmentFileName,
  );

  TestValidator.equals(
    "returned file_type matches uploaded file_type",
    securityStatus.file_type,
    attachmentMimeType,
  );

  TestValidator.equals(
    "returned file_extension matches uploaded file_extension",
    securityStatus.file_extension,
    attachmentExtension,
  );

  TestValidator.equals(
    "returned file_size matches uploaded file_size",
    securityStatus.file_size,
    attachmentSize,
  );

  // 7. If malware scan is complete, verify scan result is included when present
  if (
    securityStatus.security_status === "safe" ||
    securityStatus.security_status === "infected" ||
    securityStatus.security_status === "quarantined"
  ) {
    // For completed scans, malware_scan_result may be populated
    // We just verify it's either null, undefined, or a string
    TestValidator.predicate(
      "malware_scan_result should be string or null when scan is complete",
      typeof securityStatus.malware_scan_result === "string" ||
        securityStatus.malware_scan_result === null ||
        securityStatus.malware_scan_result === undefined,
    );
  }

  // 8. Verify created_at timestamp exists and is in ISO 8601 format
  TestValidator.predicate(
    "created_at should exist and be a valid ISO 8601 timestamp",
    typeof securityStatus.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(securityStatus.created_at),
  );
}
