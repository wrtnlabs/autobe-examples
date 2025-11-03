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
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that moderators can retrieve detailed security validation status of any
 * attachment.
 *
 * This test validates the moderator's ability to access comprehensive security
 * information about attachments, including malware scan results. It
 * demonstrates the complete workflow from member account creation through
 * article and attachment upload, to moderator-level security status retrieval.
 * The test ensures that security validation data is properly recorded and
 * accessible to authorized moderators for content moderation decisions.
 *
 * Test workflow:
 *
 * 1. Register member account for creating articles and uploading attachments
 * 2. Create article with metadata for attachment context
 * 3. Upload attachment with security metadata
 * 4. Register moderator account with elevated permissions
 * 5. Retrieve attachment security status using moderator credentials
 * 6. Validate security_status and malware_scan_result fields
 */
export async function test_api_attachment_security_status_moderator_review(
  connection: api.IConnection,
) {
  // 1. Register member account to create articles and upload attachments
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePassword123";

  const memberRegistered: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(memberRegistered);

  // 2. Create article for attachment context
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 2, wordMax: 5 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    category_code: "economics",
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(createdArticle);

  // 3. Upload attachment with security metadata
  const attachmentData = {
    filename: "document.pdf",
    file_type: "application/pdf",
    file_extension: "pdf",
    file_size: 1024,
    attachable_type: "article" as const,
  } satisfies IDiscussionBoardAttachment.ICreate;

  const uploadedAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: createdArticle.id,
        body: attachmentData,
      },
    );
  typia.assert(uploadedAttachment);

  // Validate attachment was created with proper ID
  TestValidator.equals(
    "attachment should be created successfully",
    typeof uploadedAttachment.id,
    "string",
  );

  // 4. Register moderator account with elevated permissions
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModeratorPass456";
  const testHref = "https://moderator.example.com/join";
  const testReferrer = "https://moderator.example.com";

  const moderatorRegistered: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        ip: "192.168.1.1",
        href: testHref,
        referrer: testReferrer,
      } satisfies IDiscussionBoardModerator.IJoin,
    });
  typia.assert(moderatorRegistered);

  // Validate moderator has elevated permissions
  TestValidator.predicate(
    "moderator should have permissions array",
    Array.isArray(moderatorRegistered.permissions),
  );

  // 5. Retrieve attachment security status using moderator credentials
  const securityStatus: IDiscussionBoardAttachment.ISecurityStatus =
    await api.functional.discussionBoard.moderator.attachments.security_status.at(
      connection,
      {
        attachmentId: uploadedAttachment.id,
      },
    );
  typia.assert(securityStatus);

  // 6. Validate security status response structure and content
  TestValidator.equals(
    "security status should contain correct attachment ID",
    securityStatus.id,
    uploadedAttachment.id,
  );

  TestValidator.equals(
    "security status should have valid filename",
    securityStatus.filename,
    attachmentData.filename,
  );

  TestValidator.equals(
    "security status should have correct file type",
    securityStatus.file_type,
    attachmentData.file_type,
  );

  TestValidator.equals(
    "security status should have correct file extension",
    securityStatus.file_extension,
    attachmentData.file_extension,
  );

  TestValidator.equals(
    "security status should have correct file size",
    securityStatus.file_size,
    attachmentData.file_size,
  );

  // Validate security_status is one of expected values
  TestValidator.predicate(
    "security_status should be one of valid states",
    ["pending_scan", "safe", "infected", "quarantined"].includes(
      securityStatus.security_status,
    ),
  );

  // Validate malware_scan_result structure (may be null or string)
  TestValidator.predicate(
    "malware_scan_result should be null, undefined, or string",
    securityStatus.malware_scan_result === null ||
      securityStatus.malware_scan_result === undefined ||
      typeof securityStatus.malware_scan_result === "string",
  );

  // Validate created_at timestamp is present and valid
  TestValidator.predicate(
    "created_at should be valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(securityStatus.created_at),
  );
}
