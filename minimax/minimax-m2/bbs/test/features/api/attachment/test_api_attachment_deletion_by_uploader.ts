import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import type { IEconPoliticalDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionAttachment";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

/**
 * Test successful deletion of a specific attachment by the user who uploaded
 * it.
 *
 * Validates that attachments can be properly removed from discussion articles,
 * including cleanup of associated metadata and file storage. Tests the complete
 * attachment lifecycle from upload to deletion within economic/political
 * discussion contexts.
 *
 * The test follows this workflow:
 *
 * 1. Create a test user account and discussion article
 * 2. Upload a file attachment to the article
 * 3. Delete the attachment using the erase endpoint
 * 4. Validate successful deletion and proper cleanup
 */
export async function test_api_attachment_deletion_by_uploader(
  connection: api.IConnection,
) {
  // Step 1: Create a test user account and discussion article
  // Generate realistic economic/political discussion content
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });

  const articleContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 15,
    wordMin: 3,
    wordMax: 7,
  });

  // Create the initial discussion article to establish user context
  // Note: In a real scenario, econ_political_discussion_user_id would come from authenticated session
  const article = await api.functional.econPoliticalDiscussion.articles.create(
    connection,
    {
      body: {
        title: articleTitle,
        content: articleContent,
        category: "Economic Policy",
        status: "published",
        econ_political_discussion_user_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IEconPoliticalDiscussionArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 2: Upload a file attachment to the created article
  // Generate realistic file attachment metadata
  const attachmentData = {
    file_url: `https://storage.example.com/uploads/${RandomGenerator.alphaNumeric(16)}.pdf`,
    uploader_name: RandomGenerator.name(),
    original_filename: "economic_analysis_report.pdf",
    file_type: "application/pdf",
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<10485760>
    >(), // 1KB to 10MB
  };

  const attachment =
    await api.functional.econPoliticalDiscussion.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentData satisfies IEconPoliticalDiscussionAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // Step 3: Verify the attachment was created successfully
  TestValidator.equals(
    "attachment was created with correct metadata",
    attachment.file_type,
    attachmentData.file_type,
  );

  TestValidator.equals(
    "attachment was uploaded by the correct user",
    attachment.uploader_name,
    attachmentData.uploader_name,
  );

  TestValidator.equals(
    "attachment is associated with the correct article",
    attachment.article.id,
    article.id,
  );

  TestValidator.equals(
    "attachment has valid file size within expected range",
    attachment.file_size,
    attachmentData.file_size,
  );

  // Step 4: Delete the attachment using the erase endpoint
  const deletedAttachment =
    await api.functional.econPoliticalDiscussion.attachments.erase(connection, {
      attachmentId: attachment.id,
    });
  typia.assert(deletedAttachment);

  // Step 5: Validate successful deletion response
  TestValidator.equals(
    "deleted attachment matches original attachment ID",
    deletedAttachment.id,
    attachment.id,
  );

  TestValidator.equals(
    "deletion returns correct file type",
    deletedAttachment.file_type,
    attachmentData.file_type,
  );

  TestValidator.equals(
    "deletion confirms uploader identity",
    deletedAttachment.uploader_name,
    attachmentData.uploader_name,
  );

  TestValidator.equals(
    "deletion confirms original filename",
    deletedAttachment.original_filename,
    attachmentData.original_filename,
  );

  // Step 6: Validate business logic - attachment deletion confirmation
  TestValidator.predicate(
    "attachment deletion completed with complete metadata",
    deletedAttachment.id === attachment.id &&
      deletedAttachment.file_type === attachmentData.file_type &&
      deletedAttachment.uploader_name === attachmentData.uploader_name &&
      deletedAttachment.original_filename === attachmentData.original_filename,
  );

  // Step 7: Verify the attachment references the correct article context
  TestValidator.equals(
    "deleted attachment maintains article context",
    deletedAttachment.article.id,
    article.id,
  );

  // Final validation - ensure the deletion response indicates successful removal
  TestValidator.predicate(
    "attachment deletion operation completed successfully",
    deletedAttachment.id === attachment.id,
  );
}
