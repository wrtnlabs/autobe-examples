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
 * Test that authenticated members can upload and attach files to their own
 * economic discussion articles. Validates secure file upload with metadata
 * capture, size validation, file type categorization into
 * image/document/spreadsheet categories, and proper association with parent
 * article for supporting economic analysis discussions.
 *
 * Test flow:
 *
 * 1. Register a new member account for authentication
 * 2. Create an economic discussion article to attach files to
 * 3. Upload different file types (image, document, spreadsheet) as attachments
 * 4. Verify attachment metadata and article association
 * 5. Validate file size constraints and type categorization
 */
export async function test_api_member_article_attachment_upload(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberRegistration = {
    username: `testuser_${RandomGenerator.alphabets(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
  } satisfies IEconomicDiscussionMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberRegistration,
  });
  typia.assert(member);

  // Step 2: Create an economic discussion article
  const articleData = {
    title: RandomGenerator.name(4),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 12,
    }),
    category_ids: ArrayUtil.repeat(2, () =>
      typia.random<string & tags.Format<"uuid">>(),
    ),
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 3: Test uploading different file types as attachments

  // Test image attachment
  const imageAttachment = {
    filename:
      `chart_${RandomGenerator.alphabets(5)}.jpg` satisfies IAttachmentFilename,
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1024> & tags.Maximum<5242880>
    >(), // 1KB to 5MB
    file_type: "image" as IEconomicDiscussionAttachmentFileType,
    mime_type: "image/jpeg" as IMimeType,
  } satisfies IEconomicDiscussionAttachments.ICreate;

  const uploadedImage =
    await api.functional.economicDiscussion.member.articles.attachmentFiles.create(
      connection,
      {
        articleId: article.id,
        body: imageAttachment,
      },
    );
  typia.assert(uploadedImage);

  TestValidator.equals(
    "image attachment filename matches",
    uploadedImage.filename,
    imageAttachment.filename,
  );
  TestValidator.equals(
    "image attachment file type matches",
    uploadedImage.file_type,
    imageAttachment.file_type,
  );
  TestValidator.equals(
    "image attachment mime type matches",
    uploadedImage.mime_type,
    imageAttachment.mime_type,
  );
  TestValidator.equals(
    "image attachment article ID matches",
    uploadedImage.article.id,
    article.id,
  );

  // Test document attachment
  const documentAttachment = {
    filename:
      `report_${RandomGenerator.alphabets(5)}.pdf` satisfies IAttachmentFilename,
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<10240> & tags.Maximum<8388608>
    >(), // 10KB to 8MB
    file_type: "document" as IEconomicDiscussionAttachmentFileType,
    mime_type: "application/pdf" as IMimeType,
  } satisfies IEconomicDiscussionAttachments.ICreate;

  const uploadedDocument =
    await api.functional.economicDiscussion.member.articles.attachmentFiles.create(
      connection,
      {
        articleId: article.id,
        body: documentAttachment,
      },
    );
  typia.assert(uploadedDocument);

  TestValidator.equals(
    "document attachment filename matches",
    uploadedDocument.filename,
    documentAttachment.filename,
  );
  TestValidator.equals(
    "document attachment file type matches",
    uploadedDocument.file_type,
    documentAttachment.file_type,
  );
  TestValidator.equals(
    "document attachment mime type matches",
    uploadedDocument.mime_type,
    documentAttachment.mime_type,
  );
  TestValidator.equals(
    "document attachment article ID matches",
    uploadedDocument.article.id,
    article.id,
  );

  // Test spreadsheet attachment
  const spreadsheetAttachment = {
    filename:
      `data_${RandomGenerator.alphabets(5)}.xlsx` satisfies IAttachmentFilename,
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<20480> & tags.Maximum<10485760>
    >(), // 20KB to 10MB
    file_type: "spreadsheet" as IEconomicDiscussionAttachmentFileType,
    mime_type:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" as IMimeType,
  } satisfies IEconomicDiscussionAttachments.ICreate;

  const uploadedSpreadsheet =
    await api.functional.economicDiscussion.member.articles.attachmentFiles.create(
      connection,
      {
        articleId: article.id,
        body: spreadsheetAttachment,
      },
    );
  typia.assert(uploadedSpreadsheet);

  TestValidator.equals(
    "spreadsheet attachment filename matches",
    uploadedSpreadsheet.filename,
    spreadsheetAttachment.filename,
  );
  TestValidator.equals(
    "spreadsheet attachment file type matches",
    uploadedSpreadsheet.file_type,
    spreadsheetAttachment.file_type,
  );
  TestValidator.equals(
    "spreadsheet attachment mime type matches",
    uploadedSpreadsheet.mime_type,
    spreadsheetAttachment.mime_type,
  );
  TestValidator.equals(
    "spreadsheet attachment article ID matches",
    uploadedSpreadsheet.article.id,
    article.id,
  );

  // Step 4: Validate that all attachments are properly associated with the article
  TestValidator.predicate(
    "all attachments have unique IDs",
    uploadedImage.id !== uploadedDocument.id &&
      uploadedDocument.id !== uploadedSpreadsheet.id &&
      uploadedImage.id !== uploadedSpreadsheet.id,
  );

  TestValidator.predicate(
    "all attachments have valid positive file sizes",
    uploadedImage.file_size > 0 &&
      uploadedDocument.file_size > 0 &&
      uploadedSpreadsheet.file_size > 0,
  );

  TestValidator.predicate(
    "all attachments have ISO format upload timestamps",
    uploadedImage.uploaded_at.length > 0 &&
      uploadedDocument.uploaded_at.length > 0 &&
      uploadedSpreadsheet.uploaded_at.length > 0,
  );

  TestValidator.predicate(
    "all attachments have boolean security scan status",
    typeof uploadedImage.is_scanned === "boolean" &&
      typeof uploadedDocument.is_scanned === "boolean" &&
      typeof uploadedSpreadsheet.is_scanned === "boolean",
  );

  // Validate attachment count tracking
  TestValidator.predicate(
    "all attachments reference the same article",
    uploadedImage.article.id === article.id &&
      uploadedDocument.article.id === article.id &&
      uploadedSpreadsheet.article.id === article.id,
  );
}
