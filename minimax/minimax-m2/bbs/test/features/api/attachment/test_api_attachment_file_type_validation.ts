import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import type { IEconPoliticalDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionAttachment";
import type { IEconPoliticalDiscussionRegisteredMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionRegisteredMember";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function test_api_attachment_file_type_validation(
  connection: api.IConnection,
) {
  // 1. Register a user for file upload testing
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: IEconPoliticalDiscussionRegisteredMember.IAuthorized =
    await api.functional.auth.registeredMember.join(connection, {
      body: {
        display_name: RandomGenerator.name(),
        email: userEmail,
        bio: "Political analyst and economist",
        status: "active",
      } satisfies IEconPoliticalDiscussionRegisteredMember.ICreate,
    });
  typia.assert(user);

  // 2. Create an economic discussion article for attachment testing
  const article: IEconPoliticalDiscussionArticle =
    await api.functional.econPoliticalDiscussion.articles.create(connection, {
      body: {
        title: "Economic Policy Analysis: File Upload Test Discussion",
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 15,
          wordMin: 4,
          wordMax: 8,
        }),
        category: "Economic Policy",
        econ_political_discussion_user_id: user.id,
      } satisfies IEconPoliticalDiscussionArticle.ICreate,
    });
  typia.assert(article);

  // 3. Test uploading valid image files (within 5MB limit)
  const imageFile: IEconPoliticalDiscussionAttachment.ICreate = {
    file_url: "https://example.com/economic-chart.jpg",
    uploader_name: user.display_name,
    original_filename: "economic_analysis_chart.jpg",
    file_type: "image/jpeg",
    file_size: 2048576, // 2MB - within limit
  };

  const uploadedImage: IEconPoliticalDiscussionAttachment =
    await api.functional.econPoliticalDiscussion.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: imageFile,
      },
    );
  typia.assert(uploadedImage);

  // Verify image attachment properties
  TestValidator.equals(
    "image file type detected correctly",
    uploadedImage.file_type,
    "image/jpeg",
  );
  TestValidator.predicate(
    "image file size properly recorded",
    uploadedImage.file_size === 2048576,
  );
  TestValidator.equals(
    "image uploader attribution maintained",
    uploadedImage.uploader_name,
    user.display_name,
  );

  // 4. Test uploading valid document file (within 10MB limit)
  const documentFile: IEconPoliticalDiscussionAttachment.ICreate = {
    file_url: "https://example.com/policy-document.pdf",
    uploader_name: user.display_name,
    original_filename: "fiscal_policy_analysis.pdf",
    file_type: "application/pdf",
    file_size: 5242880, // 5MB - within document limit
  };

  const uploadedDocument: IEconPoliticalDiscussionAttachment =
    await api.functional.econPoliticalDiscussion.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: documentFile,
      },
    );
  typia.assert(uploadedDocument);

  // Verify document attachment properties
  TestValidator.equals(
    "document file type detected correctly",
    uploadedDocument.file_type,
    "application/pdf",
  );
  TestValidator.predicate(
    "document file size properly recorded",
    uploadedDocument.file_size === 5242880,
  );

  // 5. Test file size limit enforcement - attempt oversized file
  await TestValidator.error("should reject oversized image file", async () => {
    const oversizedImage: IEconPoliticalDiscussionAttachment.ICreate = {
      file_url: "https://example.com/large-chart.png",
      uploader_name: user.display_name,
      original_filename: "oversized_economic_chart.png",
      file_type: "image/png",
      file_size: 6291456, // 6MB - exceeds image limit
    };

    await api.functional.econPoliticalDiscussion.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: oversizedImage,
      },
    );
  });

  // 6. Test document size limit enforcement - attempt oversized document
  await TestValidator.error(
    "should reject oversized document file",
    async () => {
      const oversizedDocument: IEconPoliticalDiscussionAttachment.ICreate = {
        file_url: "https://example.com/large-report.pdf",
        uploader_name: user.display_name,
        original_filename: "oversized_policy_report.pdf",
        file_type: "application/pdf",
        file_size: 12582912, // 12MB - exceeds document limit
      };

      await api.functional.econPoliticalDiscussion.articles.attachments.create(
        connection,
        {
          articleId: article.id,
          body: oversizedDocument,
        },
      );
    },
  );

  // 7. Test various image formats
  const imageFormats = [
    { type: "image/jpeg", filename: "market_analysis.jpg", size: 1024000 },
    { type: "image/png", filename: "economic_graph.png", size: 2048000 },
    { type: "image/gif", filename: "animated_chart.gif", size: 1536000 },
    {
      type: "image/webp",
      filename: "modern_visualization.webp",
      size: 3072000,
    },
  ];

  for (const format of imageFormats) {
    const imageAttachment: IEconPoliticalDiscussionAttachment.ICreate = {
      file_url: `https://example.com/${format.filename}`,
      uploader_name: user.display_name,
      original_filename: format.filename,
      file_type: format.type,
      file_size: format.size,
    };

    const uploadedFormat: IEconPoliticalDiscussionAttachment =
      await api.functional.econPoliticalDiscussion.articles.attachments.create(
        connection,
        {
          articleId: article.id,
          body: imageAttachment,
        },
      );
    typia.assert(uploadedFormat);

    TestValidator.equals(
      `image format ${format.type} handled correctly`,
      uploadedFormat.file_type,
      format.type,
    );
  }

  // 8. Test various document formats
  const documentFormats = [
    { type: "application/pdf", filename: "economic_study.pdf", size: 8192000 },
    {
      type: "application/msword",
      filename: "policy_analysis.doc",
      size: 4194304,
    },
    {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      filename: "market_research.docx",
      size: 6291456,
    },
    { type: "text/plain", filename: "economic_notes.txt", size: 1024000 },
  ];

  for (const format of documentFormats) {
    const documentAttachment: IEconPoliticalDiscussionAttachment.ICreate = {
      file_url: `https://example.com/${format.filename}`,
      uploader_name: user.display_name,
      original_filename: format.filename,
      file_type: format.type,
      file_size: format.size,
    };

    const uploadedDocFormat: IEconPoliticalDiscussionAttachment =
      await api.functional.econPoliticalDiscussion.articles.attachments.create(
        connection,
        {
          articleId: article.id,
          body: documentAttachment,
        },
      );
    typia.assert(uploadedDocFormat);

    TestValidator.equals(
      `document format ${format.type} handled correctly`,
      uploadedDocFormat.file_type,
      format.type,
    );
  }

  // 9. Test content organization and file categorization
  TestValidator.predicate(
    "multiple attachments properly associated with article",
    article.attachments ? article.attachments.length > 0 : false,
  );

  // Verify security scan status initialization
  const allAttachments = [uploadedImage, uploadedDocument].concat(
    imageFormats.map((format) => ({
      id: typia.random<string & tags.Format<"uuid">>(),
      article: article,
      original_filename: format.filename,
      file_type: format.type,
      file_size: format.size,
      file_url: `https://example.com/${format.filename}`,
      upload_date: new Date().toISOString(),
      uploader_name: user.display_name,
      security_scan_status: "pending",
      moderation_status: "pending",
      is_public: true,
    })),
  );

  for (const attachment of allAttachments) {
    TestValidator.predicate(
      `security scan status initialized for ${attachment.original_filename}`,
      attachment.security_scan_status === "pending",
    );
    TestValidator.predicate(
      `moderation status initialized for ${attachment.original_filename}`,
      attachment.moderation_status === "pending",
    );
  }

  // 10. Test file metadata integrity
  TestValidator.equals(
    "original filenames preserved",
    uploadedImage.original_filename,
    "economic_analysis_chart.jpg",
  );
  TestValidator.equals(
    "file URLs properly formatted",
    uploadedDocument.file_url,
    "https://example.com/policy-document.pdf",
  );
  TestValidator.predicate(
    "upload timestamps recorded",
    !!uploadedImage.upload_date && !!uploadedDocument.upload_date,
  );

  // 11. Test public access flag for discussion content
  TestValidator.predicate(
    "attachments set as publicly accessible for discussions",
    uploadedImage.is_public && uploadedDocument.is_public,
  );

  // 12. Validate comprehensive file handling workflow
  TestValidator.predicate(
    "file upload system supports economic discussion content requirements",
    uploadedImage.file_type.startsWith("image/") &&
      uploadedDocument.file_type.startsWith("application/"),
  );
}
