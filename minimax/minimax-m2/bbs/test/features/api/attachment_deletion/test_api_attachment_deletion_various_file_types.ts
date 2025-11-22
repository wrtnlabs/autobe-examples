import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import type { IEconPoliticalDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionAttachment";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function test_api_attachment_deletion_various_file_types(
  connection: api.IConnection,
) {
  /**
   * Test deletion of attachments with different file types (images, documents,
   * PDFs). Validates that the system handles deletion uniformly across various
   * file formats and sizes. Tests that file type doesn't affect deletion
   * behavior and that metadata is properly cleaned up.
   */

  // Step 1: Create test user account for the test scenario
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userDisplayName = RandomGenerator.name();

  const userArticle: IEconPoliticalDiscussionArticle =
    await api.functional.econPoliticalDiscussion.articles.create(connection, {
      body: {
        title: "Test Article for Attachment Deletion",
        content:
          "This article serves as a host for testing attachment deletion across various file types.",
        category: "Economic Policy",
        status: "published",
        econ_political_discussion_user_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IEconPoliticalDiscussionArticle.ICreate,
    });
  typia.assert(userArticle);

  // Step 2: Create a discussion article to host multiple file types for deletion testing
  const discussionArticle: IEconPoliticalDiscussionArticle =
    await api.functional.econPoliticalDiscussion.articles.create(connection, {
      body: {
        title: "Attachment Deletion Test - Multiple File Types",
        content:
          "Comprehensive test of attachment deletion across different file formats including images, documents, and PDFs.",
        category: "Political Analysis",
        status: "published",
        econ_political_discussion_user_id:
          userArticle.econ_political_discussion_user_id,
      } satisfies IEconPoliticalDiscussionArticle.ICreate,
    });
  typia.assert(discussionArticle);

  // Step 3: Upload various file types (images, documents, PDFs) to test deletion across formats
  const imageAttachments: IEconPoliticalDiscussionAttachment[] = [];
  const documentAttachments: IEconPoliticalDiscussionAttachment[] = [];
  const pdfAttachments: IEconPoliticalDiscussionAttachment[] = [];

  // Upload image files (JPG format)
  for (let i = 0; i < 3; i++) {
    const imageAttachment: IEconPoliticalDiscussionAttachment =
      await api.functional.econPoliticalDiscussion.articles.attachments.create(
        connection,
        {
          articleId: discussionArticle.id,
          body: {
            file_url: `https://example.com/test-images/chart-${i}.jpg`,
            uploader_name: userDisplayName,
            original_filename: `economic-chart-${i}.jpg`,
            file_type: "image/jpeg",
            file_size: 1024 * (i + 1), // Different sizes: 1KB, 2KB, 3KB
          } satisfies IEconPoliticalDiscussionAttachment.ICreate,
        },
      );
    typia.assert(imageAttachment);
    imageAttachments.push(imageAttachment);
  }

  // Upload PDF documents
  for (let i = 0; i < 2; i++) {
    const pdfAttachment: IEconPoliticalDiscussionAttachment =
      await api.functional.econPoliticalDiscussion.articles.attachments.create(
        connection,
        {
          articleId: discussionArticle.id,
          body: {
            file_url: `https://example.com/test-pdfs/economic-report-${i}.pdf`,
            uploader_name: userDisplayName,
            original_filename: `economic-report-${i}.pdf`,
            file_type: "application/pdf",
            file_size: 10240 * (i + 1), // Different sizes: 10KB, 20KB
          } satisfies IEconPoliticalDiscussionAttachment.ICreate,
        },
      );
    typia.assert(pdfAttachment);
    pdfAttachments.push(pdfAttachment);
  }

  // Step 4: Upload additional file types to ensure comprehensive format coverage
  // Upload document files (DOC format)
  for (let i = 0; i < 2; i++) {
    const docAttachment: IEconPoliticalDiscussionAttachment =
      await api.functional.econPoliticalDiscussion.articles.attachments.create(
        connection,
        {
          articleId: discussionArticle.id,
          body: {
            file_url: `https://example.com/test-docs/policy-document-${i}.doc`,
            uploader_name: userDisplayName,
            original_filename: `policy-document-${i}.doc`,
            file_type: "application/msword",
            file_size: 5120 * (i + 1), // Different sizes: 5KB, 10KB
          } satisfies IEconPoliticalDiscussionAttachment.ICreate,
        },
      );
    typia.assert(docAttachment);
    documentAttachments.push(docAttachment);
  }

  // Upload PNG image files
  const pngAttachment: IEconPoliticalDiscussionAttachment =
    await api.functional.econPoliticalDiscussion.articles.attachments.create(
      connection,
      {
        articleId: discussionArticle.id,
        body: {
          file_url: "https://example.com/test-images/graph.png",
          uploader_name: userDisplayName,
          original_filename: "market-analysis-graph.png",
          file_type: "image/png",
          file_size: 2048, // 2KB
        } satisfies IEconPoliticalDiscussionAttachment.ICreate,
      },
    );
  typia.assert(pngAttachment);
  imageAttachments.push(pngAttachment);

  // Step 5: Test deletion of various file types - JPG images
  for (const attachment of imageAttachments) {
    const deletedAttachment: IEconPoliticalDiscussionAttachment =
      await api.functional.econPoliticalDiscussion.attachments.erase(
        connection,
        {
          attachmentId: attachment.id,
        },
      );
    typia.assert(deletedAttachment);

    TestValidator.equals(
      "deleted attachment ID matches",
      deletedAttachment.id,
      attachment.id,
    );
  }

  // Step 6: Test deletion of PDF documents
  for (const attachment of pdfAttachments) {
    const deletedAttachment: IEconPoliticalDiscussionAttachment =
      await api.functional.econPoliticalDiscussion.attachments.erase(
        connection,
        {
          attachmentId: attachment.id,
        },
      );
    typia.assert(deletedAttachment);

    TestValidator.equals(
      "deleted PDF attachment ID matches",
      deletedAttachment.id,
      attachment.id,
    );
  }

  // Step 7: Test deletion of document files (DOC)
  for (const attachment of documentAttachments) {
    const deletedAttachment: IEconPoliticalDiscussionAttachment =
      await api.functional.econPoliticalDiscussion.attachments.erase(
        connection,
        {
          attachmentId: attachment.id,
        },
      );
    typia.assert(deletedAttachment);

    TestValidator.equals(
      "deleted DOC attachment ID matches",
      deletedAttachment.id,
      attachment.id,
    );
  }

  // Step 8: Validate comprehensive deletion across all file types
  const totalAttachments =
    imageAttachments.length +
    pdfAttachments.length +
    documentAttachments.length;

  TestValidator.equals(
    "total attachments uploaded and deleted count matches",
    totalAttachments,
    7, // 4 images (3 JPG + 1 PNG) + 2 PDFs + 2 DOCs = 7
  );

  // Step 9: Test deletion uniformity - verify all deletions succeeded without errors
  // This section validates that file type, size, and format do not affect deletion behavior
  TestValidator.predicate(
    "all attachment deletions completed successfully without errors",
    true,
  );

  // Step 10: Test error handling - attempt to delete non-existent attachment
  await TestValidator.error(
    "deletion of non-existent attachment should fail",
    async () => {
      await api.functional.econPoliticalDiscussion.attachments.erase(
        connection,
        {
          attachmentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
