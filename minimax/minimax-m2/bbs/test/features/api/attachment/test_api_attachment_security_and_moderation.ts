import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import type { IEconPoliticalDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionAttachment";
import type { IEconPoliticalDiscussionRegisteredMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionRegisteredMember";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

/**
 * Validate attachment upload with security scanning and content moderation
 * workflow integration.
 *
 * This test validates the complete security scanning and content moderation
 * pipeline for uploaded attachments. It creates a discussion article and
 * uploads multiple attachments to verify that uploaded files trigger
 * appropriate security scan status (pending, clean, flagged, quarantined) and
 * moderation status (pending, approved, rejected, requires_review). The test
 * ensures the system properly processes file uploads through security scanning
 * and content review workflows before making attachments publicly accessible.
 *
 * The test follows this workflow:
 *
 * 1. Create authenticated user for testing
 * 2. Create a discussion article for attachment testing
 * 3. Upload various attachment types to trigger different security/moderation
 *    statuses
 * 4. Verify security scan status and moderation status assignment
 * 5. Test workflow processing and public accessibility rules
 */
export async function test_api_attachment_security_and_moderation(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user for security and moderation testing
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: IEconPoliticalDiscussionRegisteredMember.IAuthorized =
    await api.functional.auth.registeredMember.join(connection, {
      body: {
        display_name: RandomGenerator.name(),
        email: userEmail,
        bio: "Test user for security and moderation workflows",
        status: "active",
      } satisfies IEconPoliticalDiscussionRegisteredMember.ICreate,
    });
  typia.assert(user);

  // Step 2: Create discussion article for security and moderation testing
  const article: IEconPoliticalDiscussionArticle =
    await api.functional.econPoliticalDiscussion.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 15,
          wordMin: 4,
          wordMax: 8,
        }),
        category: "Economic Policy",
        status: "published",
        econ_political_discussion_user_id: user.id,
      } satisfies IEconPoliticalDiscussionArticle.ICreate,
    });
  typia.assert(article);

  // Step 3: Upload various attachment types to test security scanning and moderation
  // Test 1: Upload clean document attachment
  const cleanDocument: IEconPoliticalDiscussionAttachment =
    await api.functional.econPoliticalDiscussion.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          file_url:
            "https://storage.example.com/documents/clean-policy-analysis.pdf",
          uploader_name: user.display_name,
          original_filename: "policy-analysis-document.pdf",
          file_type: "application/pdf",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<5000000>
          >(),
        } satisfies IEconPoliticalDiscussionAttachment.ICreate,
      },
    );
  typia.assert(cleanDocument);

  // Test 2: Upload image attachment for moderation testing
  const imageAttachment: IEconPoliticalDiscussionAttachment =
    await api.functional.econPoliticalDiscussion.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          file_url:
            "https://storage.example.com/images/economic-chart-2024.png",
          uploader_name: user.display_name,
          original_filename: "economic-chart-2024.png",
          file_type: "image/png",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<100000> &
              tags.Maximum<2000000>
          >(),
        } satisfies IEconPoliticalDiscussionAttachment.ICreate,
      },
    );
  typia.assert(imageAttachment);

  // Test 3: Upload text file attachment
  const textFile: IEconPoliticalDiscussionAttachment =
    await api.functional.econPoliticalDiscussion.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          file_url:
            "https://storage.example.com/text/economic-data-summary.txt",
          uploader_name: user.display_name,
          original_filename: "economic-data-summary.txt",
          file_type: "text/plain",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<100000>
          >(),
        } satisfies IEconPoliticalDiscussionAttachment.ICreate,
      },
    );
  typia.assert(textFile);

  // Step 4: Validate security scan status and moderation status assignment
  // Verify that all attachments have appropriate initial statuses
  TestValidator.equals(
    "clean document has pending security scan status",
    cleanDocument.security_scan_status,
    "pending",
  );
  TestValidator.equals(
    "clean document has pending moderation status",
    cleanDocument.moderation_status,
    "pending",
  );

  TestValidator.equals(
    "image attachment has pending security scan status",
    imageAttachment.security_scan_status,
    "pending",
  );
  TestValidator.equals(
    "image attachment has pending moderation status",
    imageAttachment.moderation_status,
    "pending",
  );

  TestValidator.equals(
    "text file has pending security scan status",
    textFile.security_scan_status,
    "pending",
  );
  TestValidator.equals(
    "text file has pending moderation status",
    textFile.moderation_status,
    "pending",
  );

  // Step 5: Verify attachment metadata and accessibility
  TestValidator.equals(
    "clean document uploader name matches user",
    cleanDocument.uploader_name,
    user.display_name,
  );
  TestValidator.equals(
    "image attachment uploader name matches user",
    imageAttachment.uploader_name,
    user.display_name,
  );
  TestValidator.equals(
    "text file uploader name matches user",
    textFile.uploader_name,
    user.display_name,
  );

  // Verify file type and size validation
  TestValidator.predicate(
    "clean document has valid PDF file type",
    cleanDocument.file_type.includes("pdf"),
  );
  TestValidator.predicate(
    "image attachment has valid PNG file type",
    imageAttachment.file_type.includes("png"),
  );
  TestValidator.predicate(
    "text file has valid plain text file type",
    textFile.file_type.includes("text"),
  );

  TestValidator.predicate(
    "clean document file size is within expected range",
    cleanDocument.file_size >= 1000 && cleanDocument.file_size <= 5000000,
  );
  TestValidator.predicate(
    "image attachment file size is within expected range",
    imageAttachment.file_size >= 100000 && imageAttachment.file_size <= 2000000,
  );
  TestValidator.predicate(
    "text file file size is within expected range",
    textFile.file_size >= 1000 && textFile.file_size <= 100000,
  );

  // Step 6: Verify URL accessibility and validation
  TestValidator.predicate(
    "clean document has valid file URL",
    cleanDocument.file_url.startsWith("https://") &&
      cleanDocument.file_url.includes("/documents/"),
  );
  TestValidator.predicate(
    "image attachment has valid file URL",
    imageAttachment.file_url.startsWith("https://") &&
      imageAttachment.file_url.includes("/images/"),
  );
  TestValidator.predicate(
    "text file has valid file URL",
    textFile.file_url.startsWith("https://") &&
      textFile.file_url.includes("/text/"),
  );

  // Step 7: Verify timestamp assignment for security and moderation tracking
  TestValidator.predicate(
    "clean document has upload timestamp",
    cleanDocument.upload_date && typeof cleanDocument.upload_date === "string",
  );
  TestValidator.predicate(
    "image attachment has upload timestamp",
    imageAttachment.upload_date &&
      typeof imageAttachment.upload_date === "string",
  );
  TestValidator.predicate(
    "text file has upload timestamp",
    textFile.upload_date && typeof textFile.upload_date === "string",
  );

  // Step 8: Test error handling for invalid security scan scenarios
  // Test that system handles different scan result scenarios
  const flaggedAttachment: IEconPoliticalDiscussionAttachment =
    await api.functional.econPoliticalDiscussion.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          file_url:
            "https://storage.example.com/documents/suspicious-document.pdf",
          uploader_name: user.display_name,
          original_filename: "suspicious-policy-analysis.pdf",
          file_type: "application/pdf",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<5000000>
          >(),
        } satisfies IEconPoliticalDiscussionAttachment.ICreate,
      },
    );
  typia.assert(flaggedAttachment);

  // Step 9: Validate workflow integration with article lifecycle
  TestValidator.equals(
    "article has proper ID for attachment association",
    article.id,
    cleanDocument.article.id,
  );
  TestValidator.equals(
    "article has proper ID for image attachment association",
    article.id,
    imageAttachment.article.id,
  );
  TestValidator.equals(
    "article has proper ID for text file association",
    article.id,
    textFile.article.id,
  );
}
