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
 * Validates attachment download security based on malware scanning status.
 *
 * This test ensures the platform enforces security validation on attachment
 * downloads:
 *
 * - Files that have completed security scanning with safe status are downloadable
 * - Files still pending malware scan completion are not yet available for
 *   download
 * - Files flagged as infected or quarantined are permanently blocked from
 *   download
 *
 * The test validates the attachment lifecycle by creating articles, uploading
 * attachments, and verifying download behavior is properly controlled by the
 * security_status field.
 *
 * Workflow:
 *
 * 1. Register a new member with valid credentials
 * 2. Create an article in the discussion board
 * 3. Upload an attachment to the article
 * 4. Verify the attachment can be downloaded if security scanning permits
 * 5. Confirm download endpoint properly enforces security status validation
 */
export async function test_api_attachment_download_security_validation(
  connection: api.IConnection,
) {
  // Step 1: Register a new member for article and attachment creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPass123";

  const authorizedMember = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(authorizedMember);

  // Step 2: Create an article for attachment uploads
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 2, wordMax: 5 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    category_code: "economics",
  } satisfies IDiscussionBoardArticle.ICreate;

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: articleData,
    },
  );
  typia.assert(article);

  // Step 3: Upload an attachment to the article
  const attachmentData = {
    filename: "research-document.pdf",
    file_type: "application/pdf",
    file_extension: "pdf",
    file_size: 102400,
    attachable_type: "article" as const,
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentData,
      },
    );
  typia.assert(attachment);

  // Step 4: Verify attachment metadata is properly created
  TestValidator.equals(
    "attachment filename matches uploaded value",
    attachment.filename,
    attachmentData.filename,
  );
  TestValidator.equals(
    "attachment file type matches uploaded value",
    attachment.file_type,
    attachmentData.file_type,
  );
  TestValidator.equals(
    "attachment size matches uploaded value",
    attachment.file_size,
    attachmentData.file_size,
  );

  // Step 5: Verify attachment security status is tracked
  TestValidator.predicate(
    "attachment has security_status field set",
    attachment.security_status !== undefined &&
      attachment.security_status !== null,
  );

  // Step 6: Test download based on security status
  // If attachment is marked as safe, download should succeed
  if (attachment.security_status === "safe") {
    const downloadResult =
      await api.functional.discussionBoard.attachments.download(connection, {
        attachmentId: attachment.id,
      });
    typia.assert(downloadResult);

    TestValidator.equals(
      "downloaded file has correct filename",
      downloadResult.filename,
      attachmentData.filename,
    );
    TestValidator.equals(
      "downloaded file has correct MIME type",
      downloadResult.file_type,
      attachmentData.file_type,
    );
    TestValidator.equals(
      "downloaded file has correct size",
      downloadResult.file_size,
      attachmentData.file_size,
    );
  } else if (
    attachment.security_status === "pending_scan" ||
    attachment.security_status === "infected" ||
    attachment.security_status === "quarantined"
  ) {
    // For non-safe status, download should fail with appropriate error
    await TestValidator.error(
      `attachment with security_status='${attachment.security_status}' cannot be downloaded`,
      async () => {
        await api.functional.discussionBoard.attachments.download(connection, {
          attachmentId: attachment.id,
        });
      },
    );
  }

  // Step 7: Verify article contains the uploaded attachment
  TestValidator.predicate(
    "article attachments array is defined",
    article.attachments !== undefined,
  );

  if (article.attachments && article.attachments.length > 0) {
    const articleAttachment = article.attachments.find(
      (att) => att.id === attachment.id,
    );
    TestValidator.predicate(
      "uploaded attachment is present in article attachments",
      articleAttachment !== undefined,
    );
  }
}
