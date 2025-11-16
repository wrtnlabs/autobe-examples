import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttachmentFilename } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttachmentFilename";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachment";
import type { IEconomicDiscussionAttachmentFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachmentFileType";
import type { IEconomicDiscussionAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachments";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";
import type { IFileSize } from "@ORGANIZATION/PROJECT-api/lib/structures/IFileSize";
import type { IFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IFileType";
import type { IMimeType } from "@ORGANIZATION/PROJECT-api/lib/structures/IMimeType";

/**
 * Test uploading document file attachments including PDF, Word documents, and
 * spreadsheets within size limitations. This scenario validates document upload
 * functionality including 10MB size limit for documents, MIME type validation,
 * security scanning procedures, and metadata handling. Tests ensure proper
 * processing of various document formats commonly used in economic
 * discussions.
 *
 * The test follows a complete workflow:
 *
 * 1. Register a new member account to get authenticated access
 * 2. Create an economic discussion article to serve as the attachment host
 * 3. Test uploading different document file types (PDF, Word, Excel) with proper
 *    metadata
 * 4. Validate file size limits (up to 10MB) and MIME type constraints
 * 5. Verify security scanning procedures and attachment metadata completeness
 * 6. Confirm proper article association and comprehensive file information
 */
export async function test_api_attachment_upload_document_file(
  connection: api.IConnection,
) {
  // Step 1: Register as a member to get authenticated access
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IEconomicDiscussionMember.ICreate;

  const registeredMember: IEconomicDiscussionMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(registeredMember);

  // Step 2: Create an economic discussion article to host attachments
  const categoryIds = ArrayUtil.repeat(2, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    category_ids: categoryIds,
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article: IEconomicDiscussionArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 3: Test uploading PDF document attachment
  const pdfAttachmentData = {
    filename: "economic_analysis_2024.pdf",
    file_size: Math.floor(Math.random() * 3145728) + 524288, // Random size between 512KB and 3MB
    file_type: "document" as IEconomicDiscussionAttachmentFileType,
    mime_type: "application/pdf" as IMimeType,
  } satisfies IEconomicDiscussionAttachment.ICreate;

  const pdfAttachment: IEconomicDiscussionAttachment =
    await api.functional.economicDiscussion.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: pdfAttachmentData,
      },
    );
  typia.assert(pdfAttachment);

  // Validate PDF attachment metadata
  TestValidator.equals(
    "PDF filename matches",
    pdfAttachment.filename,
    pdfAttachmentData.filename,
  );
  TestValidator.equals(
    "PDF file size matches",
    pdfAttachment.file_size,
    pdfAttachmentData.file_size,
  );
  TestValidator.equals(
    "PDF file type",
    pdfAttachment.file_type,
    pdfAttachmentData.file_type,
  );
  TestValidator.equals(
    "PDF MIME type matches",
    pdfAttachment.mime_type,
    pdfAttachmentData.mime_type,
  );
  TestValidator.predicate(
    "PDF is attached to correct article",
    pdfAttachment.article.id === article.id,
  );
  TestValidator.predicate(
    "PDF has uploaded_at timestamp",
    pdfAttachment.uploaded_at.length > 0,
  );
  TestValidator.predicate(
    "PDF scan status exists",
    typeof pdfAttachment.is_scanned === "boolean",
  );

  // Step 4: Test uploading Word document attachment
  const wordAttachmentData = {
    filename: "policy_analysis_report.docx",
    file_size: Math.floor(Math.random() * 2097152) + 524288, // Random size between 512KB and 2MB
    file_type: "document" as IEconomicDiscussionAttachmentFileType,
    mime_type:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" as IMimeType,
  } satisfies IEconomicDiscussionAttachment.ICreate;

  const wordAttachment: IEconomicDiscussionAttachment =
    await api.functional.economicDiscussion.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: wordAttachmentData,
      },
    );
  typia.assert(wordAttachment);

  // Validate Word attachment metadata
  TestValidator.equals(
    "Word filename matches",
    wordAttachment.filename,
    wordAttachmentData.filename,
  );
  TestValidator.equals(
    "Word file size matches",
    wordAttachment.file_size,
    wordAttachmentData.file_size,
  );
  TestValidator.equals(
    "Word file type",
    wordAttachment.file_type,
    wordAttachmentData.file_type,
  );
  TestValidator.equals(
    "Word MIME type matches",
    wordAttachment.mime_type,
    wordAttachmentData.mime_type,
  );
  TestValidator.predicate(
    "Word is attached to correct article",
    wordAttachment.article.id === article.id,
  );

  // Step 5: Test uploading Excel spreadsheet attachment
  const excelAttachmentData = {
    filename: "budget_model_2024.xlsx",
    file_size: Math.floor(Math.random() * 5242880) + 1048576, // Random size between 1MB and 5MB
    file_type: "spreadsheet" as IEconomicDiscussionAttachmentFileType,
    mime_type:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" as IMimeType,
  } satisfies IEconomicDiscussionAttachment.ICreate;

  const excelAttachment: IEconomicDiscussionAttachment =
    await api.functional.economicDiscussion.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: excelAttachmentData,
      },
    );
  typia.assert(excelAttachment);

  // Validate Excel attachment metadata
  TestValidator.equals(
    "Excel filename matches",
    excelAttachment.filename,
    excelAttachmentData.filename,
  );
  TestValidator.equals(
    "Excel file size matches",
    excelAttachment.file_size,
    excelAttachmentData.file_size,
  );
  TestValidator.equals(
    "Excel file type",
    excelAttachment.file_type,
    excelAttachmentData.file_type,
  );
  TestValidator.equals(
    "Excel MIME type matches",
    excelAttachment.mime_type,
    excelAttachmentData.mime_type,
  );
  TestValidator.predicate(
    "Excel is attached to correct article",
    excelAttachment.article.id === article.id,
  );

  // Step 6: Test document attachment approaching size limit
  const largeAttachmentData = {
    filename: "large_economic_dataset.csv",
    file_size: 9437184, // 9MB - approaching 10MB limit
    file_type: "document" as IEconomicDiscussionAttachmentFileType,
    mime_type: "application/pdf" as IMimeType,
  } satisfies IEconomicDiscussionAttachment.ICreate;

  const largeAttachment: IEconomicDiscussionAttachment =
    await api.functional.economicDiscussion.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: largeAttachmentData,
      },
    );
  typia.assert(largeAttachment);

  // Validate large attachment met size constraints
  TestValidator.predicate(
    "Large attachment within 10MB limit",
    largeAttachment.file_size <= 10485760,
  );
  TestValidator.equals(
    "Large attachment filename",
    largeAttachment.filename,
    largeAttachmentData.filename,
  );

  // Step 7: Test invalid oversized document attachment (should fail)
  // Note: This test validates the business logic error handling for oversized files
  // The API enforces 10MB size limit for document types (as per IEconomicDiscussionAttachments.ICreate file_size constraint)
  await TestValidator.error(
    "oversized document attachment should be rejected",
    async () => {
      const oversizedData = {
        filename: "oversized_document.pdf",
        file_size: 10485761, // 10MB + 1 byte - should exceed limit
        file_type: "document" as IEconomicDiscussionAttachmentFileType,
        mime_type: "application/pdf" as IMimeType,
      } satisfies IEconomicDiscussionAttachment.ICreate;

      await api.functional.economicDiscussion.member.articles.attachments.create(
        connection,
        {
          articleId: article.id,
          body: oversizedData,
        },
      );
    },
  );

  // Final validation: Verify all attachments created successfully
  TestValidator.predicate(
    "All attachments have valid UUID format",
    [
      pdfAttachment.id,
      wordAttachment.id,
      excelAttachment.id,
      largeAttachment.id,
    ].every((id) => id.length === 36),
  );

  // Validate attachment metadata consistency and proper file handling
  const attachments = [
    pdfAttachment,
    wordAttachment,
    excelAttachment,
    largeAttachment,
  ];
  attachments.forEach((attachment, index) => {
    TestValidator.predicate(
      `Attachment ${index + 1} has valid UUID`,
      attachment.id.length === 36,
    );
    TestValidator.predicate(
      `Attachment ${index + 1} has upload timestamp`,
      attachment.uploaded_at.includes("T"),
    );
    TestValidator.predicate(
      `Attachment ${index + 1} has scan status defined`,
      typeof attachment.is_scanned === "boolean",
    );
    TestValidator.predicate(
      `Attachment ${index + 1} is linked to correct article`,
      attachment.article.id === article.id,
    );
  });

  // Step 8: Test document attachment with valid legacy formats
  const legacyDocData = {
    filename: "legacy_compliance_report.doc",
    file_size: Math.floor(Math.random() * 1048576) + 262144, // Random size between 256KB and 1MB
    file_type: "document" as IEconomicDiscussionAttachmentFileType,
    mime_type: "application/msword" as IMimeType,
  } satisfies IEconomicDiscussionAttachment.ICreate;

  const legacyDoc: IEconomicDiscussionAttachment =
    await api.functional.economicDiscussion.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: legacyDocData,
      },
    );
  typia.assert(legacyDoc);

  TestValidator.equals(
    "Legacy Word filename",
    legacyDoc.filename,
    legacyDocData.filename,
  );
  TestValidator.equals(
    "Legacy Word MIME type",
    legacyDoc.mime_type,
    "application/msword",
  );

  // Step 9: Test ZIP attachment (should fail due to unsupported file type)
  await TestValidator.error(
    "ZIP file attachment should be rejected due to unsupported MIME type",
    async () => {
      const zipData = {
        filename: "compressed_files.zip",
        file_size: 1048576, // 1MB
        file_type: "document" as IEconomicDiscussionAttachmentFileType,
        mime_type: "application/zip" as any, // ZIP is not in supported MIME list
      } satisfies IEconomicDiscussionAttachment.ICreate;

      await api.functional.economicDiscussion.member.articles.attachments.create(
        connection,
        {
          articleId: article.id,
          body: zipData,
        },
      );
    },
  );
}
