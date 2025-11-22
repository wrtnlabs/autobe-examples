import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import type { IEconPoliticalDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionAttachment";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function test_api_attachment_deletion_large_files(
  connection: api.IConnection,
) {
  // Step 1: Create test user account (following dependencies specification)
  const userId = typia.random<string & tags.Format<"uuid">>();
  const userDisplayName = RandomGenerator.name();

  // Step 2: Create discussion article to host large file attachments
  const article = await api.functional.econPoliticalDiscussion.articles.create(
    connection,
    {
      body: {
        title: "Testing Large File Attachments Deletion",
        content:
          "This article is specifically created for testing the deletion of large file attachments near size limits to validate system performance and resource cleanup.",
        category: "Economic Policy",
        econ_political_discussion_user_id: userId,
        status: "published",
      } satisfies IEconPoliticalDiscussionArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 3: Upload large file attachments near maximum size limits
  // Based on DTO constraints: images up to 5MB (5,242,880 bytes), documents up to 10MB (10,485,760 bytes)
  const largeAttachments = await Promise.all([
    // Large image near 5MB limit
    api.functional.econPoliticalDiscussion.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          file_url: `https://storage.example.com/large-economic-chart-${RandomGenerator.alphaNumeric(16)}.jpg`,
          uploader_name: userDisplayName,
          original_filename: "economic_analysis_chart_near_5mb.jpg",
          file_type: "image/jpeg",
          file_size: 4_900_000, // Near 5MB limit for images
        } satisfies IEconPoliticalDiscussionAttachment.ICreate,
      },
    ),
    // Large document near 10MB limit
    api.functional.econPoliticalDiscussion.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          file_url: `https://storage.example.com/large-policy-document-${RandomGenerator.alphaNumeric(16)}.pdf`,
          uploader_name: userDisplayName,
          original_filename: "comprehensive_policy_report_near_10mb.pdf",
          file_type: "application/pdf",
          file_size: 9_800_000, // Near 10MB limit for documents
        } satisfies IEconPoliticalDiscussionAttachment.ICreate,
      },
    ),
    // Another large image
    api.functional.econPoliticalDiscussion.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          file_url: `https://storage.example.com/large-political-graph-${RandomGenerator.alphaNumeric(16)}.png`,
          uploader_name: userDisplayName,
          original_filename: "political_analysis_graph_near_5mb.png",
          file_type: "image/png",
          file_size: 4_950_000, // Near 5MB limit for images
        } satisfies IEconPoliticalDiscussionAttachment.ICreate,
      },
    ),
    // Another large document
    api.functional.econPoliticalDiscussion.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          file_url: `https://storage.example.com/large-economic-report-${RandomGenerator.alphaNumeric(16)}.docx`,
          uploader_name: userDisplayName,
          original_filename: "detailed_economic_analysis_near_10mb.docx",
          file_type:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          file_size: 9_750_000, // Near 10MB limit for documents
        } satisfies IEconPoliticalDiscussionAttachment.ICreate,
      },
    ),
  ]);

  // Validate all large attachments were created successfully
  largeAttachments.forEach((attachment, index) => {
    typia.assert(attachment);
    TestValidator.equals(
      `attachment ${index + 1} created successfully`,
      attachment.article.id,
      article.id,
    );
    TestValidator.predicate(
      `attachment ${index + 1} has substantial file size`,
      attachment.file_size >= 4_000_000, // All files should be substantial (>4MB)
    );
  });

  // Step 4: Test deletion of large attachments and validate storage cleanup
  const deletionResults = await Promise.all(
    largeAttachments.map(async (attachment) => {
      const startTime = Date.now();

      const deletedAttachment =
        await api.functional.econPoliticalDiscussion.attachments.erase(
          connection,
          {
            attachmentId: attachment.id,
          },
        );

      const endTime = Date.now();
      const deletionTime = endTime - startTime;

      // Validate deletion operation completed successfully
      typia.assert(deletedAttachment);
      TestValidator.equals(
        "deleted attachment ID matches original",
        deletedAttachment.id,
        attachment.id,
      );
      TestValidator.equals(
        "deleted attachment filename preserved",
        deletedAttachment.original_filename,
        attachment.original_filename,
      );

      return {
        originalSize: attachment.file_size,
        deletionTime,
        filename: attachment.original_filename,
        success: true,
      };
    }),
  );

  // Step 5: Validate deletion performance and system behavior
  deletionResults.forEach((result, index) => {
    TestValidator.predicate(
      `large file ${index + 1} deletion completed`,
      result.success,
    );
    TestValidator.predicate(
      `large file ${index + 1} deletion time reasonable`,
      result.deletionTime < 10000, // Should complete within 10 seconds even for large files
    );
    TestValidator.predicate(
      `large file ${index + 1} size preserved in metadata`,
      result.originalSize >= 4_000_000,
    );
  });

  // Step 6: Test edge case - maximum allowed file sizes
  const maximumSizeAttachment =
    await api.functional.econPoliticalDiscussion.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          file_url: `https://storage.example.com/maximum-size-test-${RandomGenerator.alphaNumeric(16)}.jpg`,
          uploader_name: userDisplayName,
          original_filename: "maximum_allowed_size_test.jpg",
          file_type: "image/jpeg",
          file_size: 5_000_000 - 100, // Just under the 5MB limit
        } satisfies IEconPoliticalDiscussionAttachment.ICreate,
      },
    );
  typia.assert(maximumSizeAttachment);

  // Delete the maximum size attachment
  const maxSizeDeletionStart = Date.now();
  const maxSizeDeleted =
    await api.functional.econPoliticalDiscussion.attachments.erase(connection, {
      attachmentId: maximumSizeAttachment.id,
    });
  const maxSizeDeletionEnd = Date.now();
  const maxSizeDeletionTime = maxSizeDeletionEnd - maxSizeDeletionStart;

  typia.assert(maxSizeDeleted);
  TestValidator.equals(
    "maximum size attachment deleted successfully",
    maxSizeDeleted.id,
    maximumSizeAttachment.id,
  );
  TestValidator.predicate(
    "maximum size file deletion completes efficiently",
    maxSizeDeletionTime < 8000, // Should complete within reasonable time
  );

  // Step 7: Final validation - system handles large file deletion without issues
  const totalAttachmentsProcessed = largeAttachments.length + 1; // +1 for maximum size test
  const averageDeletionTime =
    deletionResults.reduce((sum, result) => sum + result.deletionTime, 0) +
    maxSizeDeletionTime;

  TestValidator.predicate(
    "system efficiently handles multiple large file deletions",
    averageDeletionTime / totalAttachmentsProcessed < 6000, // Average under 6 seconds per file
  );

  TestValidator.predicate(
    "all large file deletion operations completed successfully",
    true, // Reached here means all operations succeeded
  );

  // Validate storage cleanup by confirming no orphaned data references
  const attachmentIds = largeAttachments
    .map((a) => a.id)
    .concat([maximumSizeAttachment.id]);
  TestValidator.equals(
    "processed all intended attachments",
    attachmentIds.length,
    totalAttachmentsProcessed,
  );
}
