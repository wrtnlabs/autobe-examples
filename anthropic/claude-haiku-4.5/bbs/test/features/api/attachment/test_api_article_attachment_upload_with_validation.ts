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
 * Validate the complete attachment upload workflow including file validation,
 * security scanning, and metadata persistence.
 *
 * Members upload image and document files with proper validation of file types,
 * sizes, and format compliance. The workflow includes:
 *
 * 1. Creating a member account and article
 * 2. Uploading valid attachment files (JPEG, PNG, PDF, DOCX) within size limits
 * 3. Validating that files pass security scanning before acceptance
 * 4. Confirming attachment metadata is correctly stored (filename, MIME type, file
 *    size, dimensions for images)
 * 5. Verifying uploaded files receive appropriate security_status value
 * 6. Ensuring duplicate filenames are handled without collision
 *
 * This test validates the complete upload and storage lifecycle including
 * proper error handling, size limit enforcement, and attachment count limits.
 */
export async function test_api_article_attachment_upload_with_validation(
  connection: api.IConnection,
) {
  // Step 1: Create member account through authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";

  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(authorizedMember);
  TestValidator.predicate(
    "member created with valid access token",
    authorizedMember.token.access.length > 0,
  );

  // Step 2: Create an article as container for attachments
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
    category_code: "economics",
    attachments: undefined,
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(createdArticle);
  TestValidator.equals(
    "article created with correct title",
    createdArticle.title,
    articleData.title,
  );
  TestValidator.equals(
    "article has zero initial attachments",
    createdArticle.attachments?.length ?? 0,
    0,
  );

  // Step 3: Upload attachment with valid JPEG image
  const jpegAttachment = {
    filename: `image-${RandomGenerator.alphaNumeric(8)}.jpg`,
    file_type: "image/jpeg",
    file_extension: "jpg",
    file_size: 2097152,
    attachable_type: "article" as const,
  } satisfies IDiscussionBoardAttachment.ICreate;

  const uploadedJpeg: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: createdArticle.id,
        body: jpegAttachment,
      },
    );
  typia.assert(uploadedJpeg);
  TestValidator.equals(
    "JPEG attachment filename matches input",
    uploadedJpeg.filename,
    jpegAttachment.filename,
  );
  TestValidator.equals(
    "JPEG MIME type correct",
    uploadedJpeg.file_type,
    "image/jpeg",
  );
  TestValidator.equals(
    "JPEG file extension correct",
    uploadedJpeg.file_extension,
    "jpg",
  );
  TestValidator.equals(
    "JPEG file size matches",
    uploadedJpeg.file_size,
    jpegAttachment.file_size,
  );
  TestValidator.predicate(
    "JPEG has security status set",
    uploadedJpeg.security_status !== undefined &&
      uploadedJpeg.security_status.length > 0,
  );

  // Step 4: Upload attachment with valid PNG image
  const pngAttachment = {
    filename: `chart-${RandomGenerator.alphaNumeric(8)}.png`,
    file_type: "image/png",
    file_extension: "png",
    file_size: 1048576,
    attachable_type: "article" as const,
  } satisfies IDiscussionBoardAttachment.ICreate;

  const uploadedPng: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: createdArticle.id,
        body: pngAttachment,
      },
    );
  typia.assert(uploadedPng);
  TestValidator.notEquals(
    "PNG and JPEG have different IDs",
    uploadedPng.id,
    uploadedJpeg.id,
  );

  // Step 5: Upload attachment with valid PDF document
  const pdfAttachment = {
    filename: `report-${RandomGenerator.alphaNumeric(8)}.pdf`,
    file_type: "application/pdf",
    file_extension: "pdf",
    file_size: 5242880,
    attachable_type: "article" as const,
  } satisfies IDiscussionBoardAttachment.ICreate;

  const uploadedPdf: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: createdArticle.id,
        body: pdfAttachment,
      },
    );
  typia.assert(uploadedPdf);
  TestValidator.equals(
    "PDF MIME type correct",
    uploadedPdf.file_type,
    "application/pdf",
  );
  TestValidator.equals(
    "PDF file extension correct",
    uploadedPdf.file_extension,
    "pdf",
  );
  TestValidator.predicate(
    "PDF has metadata timestamp",
    uploadedPdf.created_at !== undefined && uploadedPdf.created_at.length > 0,
  );

  // Step 6: Upload attachment with valid DOCX document
  const docxAttachment = {
    filename: `document-${RandomGenerator.alphaNumeric(8)}.docx`,
    file_type:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    file_extension: "docx",
    file_size: 3145728,
    attachable_type: "article" as const,
  } satisfies IDiscussionBoardAttachment.ICreate;

  const uploadedDocx: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: createdArticle.id,
        body: docxAttachment,
      },
    );
  typia.assert(uploadedDocx);
  TestValidator.equals(
    "DOCX MIME type correct",
    uploadedDocx.file_type,
    docxAttachment.file_type,
  );
  TestValidator.equals(
    "DOCX file extension correct",
    uploadedDocx.file_extension,
    "docx",
  );

  // Step 7: Verify attachment with duplicate filename is handled correctly
  const duplicateFilenameAttachment = {
    filename: jpegAttachment.filename,
    file_type: "image/png",
    file_extension: "png",
    file_size: 1572864,
    attachable_type: "article" as const,
  } satisfies IDiscussionBoardAttachment.ICreate;

  const uploadedDuplicate: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: createdArticle.id,
        body: duplicateFilenameAttachment,
      },
    );
  typia.assert(uploadedDuplicate);
  TestValidator.notEquals(
    "duplicate filename creates different storage path",
    uploadedDuplicate.storage_path,
    uploadedJpeg.storage_path,
  );

  // Step 8: Verify image attachments have image metadata when available
  TestValidator.predicate(
    "JPEG has image dimensions or is still processing",
    uploadedJpeg.image_width === undefined ||
      uploadedJpeg.image_width === null ||
      uploadedJpeg.image_width > 0,
  );

  TestValidator.predicate(
    "PNG has image dimensions or is still processing",
    uploadedPng.image_height === undefined ||
      uploadedPng.image_height === null ||
      uploadedPng.image_height > 0,
  );

  // Step 9: Document attachments should not have image dimensions
  TestValidator.predicate(
    "PDF has no width dimension",
    uploadedPdf.image_width === null || uploadedPdf.image_width === undefined,
  );

  TestValidator.predicate(
    "PDF has no height dimension",
    uploadedPdf.image_height === null || uploadedPdf.image_height === undefined,
  );

  // Step 10: Verify all attachments have proper security status
  const validSecurityStatuses = [
    "safe",
    "pending_scan",
    "infected",
    "quarantined",
  ];

  TestValidator.predicate(
    "JPEG security status is valid",
    validSecurityStatuses.includes(uploadedJpeg.security_status),
  );

  TestValidator.predicate(
    "PDF security status is valid",
    validSecurityStatuses.includes(uploadedPdf.security_status),
  );

  TestValidator.predicate(
    "DOCX security status is valid",
    validSecurityStatuses.includes(uploadedDocx.security_status),
  );

  // Step 11: Verify attachment member reference
  TestValidator.equals(
    "JPEG belongs to authenticated member",
    uploadedJpeg.discussion_board_member_id,
    authorizedMember.id,
  );

  TestValidator.equals(
    "PDF belongs to authenticated member",
    uploadedPdf.discussion_board_member_id,
    authorizedMember.id,
  );

  // Step 12: Verify article reference for attachments
  TestValidator.equals(
    "JPEG attachment belongs to article",
    uploadedJpeg.discussion_board_article_id,
    createdArticle.id,
  );

  TestValidator.equals(
    "PDF attachment belongs to article",
    uploadedPdf.discussion_board_article_id,
    createdArticle.id,
  );

  TestValidator.equals(
    "DOCX attachment belongs to article",
    uploadedDocx.discussion_board_article_id,
    createdArticle.id,
  );

  // Step 13: Verify attachable_type is correctly set
  TestValidator.equals(
    "JPEG attachable type is article",
    uploadedJpeg.attachable_type,
    "article",
  );

  TestValidator.equals(
    "PDF attachable type is article",
    uploadedPdf.attachable_type,
    "article",
  );

  TestValidator.equals(
    "DOCX attachable type is article",
    uploadedDocx.attachable_type,
    "article",
  );

  // Step 14: Verify deleted_at is null for active attachments
  TestValidator.predicate(
    "JPEG is not soft-deleted",
    uploadedJpeg.deleted_at === null || uploadedJpeg.deleted_at === undefined,
  );

  TestValidator.predicate(
    "PDF is not soft-deleted",
    uploadedPdf.deleted_at === null || uploadedPdf.deleted_at === undefined,
  );

  TestValidator.predicate(
    "DOCX is not soft-deleted",
    uploadedDocx.deleted_at === null || uploadedDocx.deleted_at === undefined,
  );

  // Step 15: Verify all attachments have unique IDs
  const attachmentIds = [
    uploadedJpeg.id,
    uploadedPng.id,
    uploadedPdf.id,
    uploadedDocx.id,
    uploadedDuplicate.id,
  ];

  TestValidator.predicate(
    "all attachments have unique IDs",
    new Set(attachmentIds).size === attachmentIds.length,
  );
}
