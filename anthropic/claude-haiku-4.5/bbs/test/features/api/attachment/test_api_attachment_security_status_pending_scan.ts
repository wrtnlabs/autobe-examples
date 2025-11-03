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
 * Validates that recently uploaded attachments correctly report 'pending_scan'
 * security status.
 *
 * This test verifies the attachment security scanning workflow by:
 *
 * 1. Creating a member account to authenticate file operations
 * 2. Creating an article as the container for attachments
 * 3. Uploading an attachment file
 * 4. Immediately checking the attachment's security status
 * 5. Confirming the status is 'pending_scan' (not yet scanned by antivirus)
 *
 * This ensures the system properly tracks files through the scanning lifecycle
 * and prevents access to files that haven't completed security validation,
 * protecting against malicious content from being served to users.
 */
export async function test_api_attachment_security_status_pending_scan(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(member);
  TestValidator.predicate(
    "member created successfully",
    member.id !== null && member.id.length > 0,
  );

  // Step 2: Create an article to host the attachment
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: "Test Article for Attachment Security Status",
        content:
          "This article contains a test attachment to verify pending_scan status.",
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  TestValidator.predicate("article created successfully", article.id !== null);

  // Step 3: Upload an attachment to the article
  const attachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          filename: "test-document.pdf",
          file_type: "application/pdf",
          file_extension: "pdf",
          file_size: 50000,
          attachable_type: "article",
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment);
  TestValidator.predicate(
    "attachment created successfully",
    attachment.id !== null,
  );

  // Step 4: Immediately check the security status of the uploaded attachment
  const securityStatus =
    await api.functional.discussionBoard.member.attachments.security_status.at(
      connection,
      {
        attachmentId: attachment.id,
      },
    );
  typia.assert(securityStatus);

  // Step 5: Validate that the security status is 'pending_scan'
  TestValidator.equals(
    "attachment security status should be pending_scan immediately after upload",
    securityStatus.security_status,
    "pending_scan",
  );

  // Validate the attachment metadata is correct
  TestValidator.equals(
    "attachment ID matches",
    securityStatus.id,
    attachment.id,
  );
  TestValidator.equals(
    "attachment filename preserved",
    securityStatus.filename,
    "test-document.pdf",
  );
  TestValidator.equals(
    "attachment file type preserved",
    securityStatus.file_type,
    "application/pdf",
  );
  TestValidator.equals(
    "attachment file extension preserved",
    securityStatus.file_extension,
    "pdf",
  );
  TestValidator.equals(
    "attachment file size preserved",
    securityStatus.file_size,
    50000,
  );

  // Verify malware scan result is null (scanning hasn't completed yet)
  TestValidator.predicate(
    "malware scan result should be null or undefined for pending scan",
    securityStatus.malware_scan_result === null ||
      securityStatus.malware_scan_result === undefined,
  );
}
