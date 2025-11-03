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
 * Test article creation with file and image attachments.
 *
 * This test validates the complete workflow of creating a discussion board
 * article with multiple file and image attachments. The test ensures that:
 *
 * 1. A member can register and authenticate
 * 2. Articles can be created with various attachment types (images and documents)
 * 3. Attachment metadata is properly returned and validated
 * 4. All attachments are correctly associated with the article
 * 5. Download URLs are available for all safe attachments
 *
 * The test creates an article with a mix of image attachments (JPG, PNG) and
 * document attachments (PDF, TXT) to validate the system handles different file
 * types correctly.
 */
export async function test_api_article_creation_with_attachments(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";

  const memberAuth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(memberAuth);
  TestValidator.predicate(
    "member authenticated successfully",
    memberAuth.id !== null,
  );

  // Step 2: Create multiple attachments with different file types
  const imageAttachment1 = {
    filename: "market-analysis.jpg",
    file_type: "image/jpeg",
    file_extension: "jpg",
    file_size: 2097152, // 2 MB
    attachable_type: "article" as const,
  } satisfies IDiscussionBoardAttachment.ICreate;

  const imageAttachment2 = {
    filename: "economic-chart.png",
    file_type: "image/png",
    file_extension: "png",
    file_size: 1048576, // 1 MB
    attachable_type: "article" as const,
  } satisfies IDiscussionBoardAttachment.ICreate;

  const documentAttachment1 = {
    filename: "economic-report.pdf",
    file_type: "application/pdf",
    file_extension: "pdf",
    file_size: 5242880, // 5 MB
    attachable_type: "article" as const,
  } satisfies IDiscussionBoardAttachment.ICreate;

  const documentAttachment2 = {
    filename: "data-summary.txt",
    file_type: "text/plain",
    file_extension: "txt",
    file_size: 524288, // 512 KB
    attachable_type: "article" as const,
  } satisfies IDiscussionBoardAttachment.ICreate;

  // Step 3: Create article with attachments
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 2,
    wordMax: 5,
  });
  const articleContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 8,
  });

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: articleTitle,
        content: articleContent,
        category_code: "economics",
        attachments: [
          imageAttachment1,
          imageAttachment2,
          documentAttachment1,
          documentAttachment2,
        ],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(createdArticle);

  // Step 4: Validate article basic properties
  TestValidator.predicate(
    "article has valid ID",
    createdArticle.id !== null && createdArticle.id.length > 0,
  );
  TestValidator.equals(
    "article title matches",
    createdArticle.title,
    articleTitle,
  );
  TestValidator.equals(
    "article content matches",
    createdArticle.content,
    articleContent,
  );
  TestValidator.predicate(
    "article has published status",
    createdArticle.status === "published",
  );
  TestValidator.predicate(
    "article has zero initial view count",
    createdArticle.view_count === 0,
  );
  TestValidator.predicate(
    "article has zero revision number",
    createdArticle.revision_number === 0,
  );

  // Step 5: Validate article author information
  TestValidator.predicate("article has author", createdArticle.author !== null);
  TestValidator.equals(
    "article author ID matches member",
    createdArticle.author.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "article author email matches",
    createdArticle.author.email,
    memberEmail,
  );

  // Step 6: Validate article category
  TestValidator.predicate(
    "article has category",
    createdArticle.category !== null,
  );
  TestValidator.equals(
    "article category code is economics",
    createdArticle.category.code,
    "economics",
  );

  // Step 7: Validate attachments are present and properly returned
  TestValidator.predicate(
    "article has attachments",
    createdArticle.attachments !== undefined &&
      createdArticle.attachments !== null,
  );
  TestValidator.predicate(
    "article has 4 attachments",
    createdArticle.attachments!.length === 4,
  );

  // Step 8: Validate first image attachment (JPG)
  const jpgAttachment = createdArticle.attachments![0];
  typia.assert(jpgAttachment);
  TestValidator.equals(
    "JPG attachment filename matches",
    jpgAttachment.filename,
    "market-analysis.jpg",
  );
  TestValidator.equals(
    "JPG attachment MIME type matches",
    jpgAttachment.file_type,
    "image/jpeg",
  );
  TestValidator.equals(
    "JPG attachment extension matches",
    jpgAttachment.file_extension,
    "jpg",
  );
  TestValidator.equals(
    "JPG attachment size matches",
    jpgAttachment.file_size,
    2097152,
  );
  TestValidator.predicate(
    "JPG attachment has valid ID",
    jpgAttachment.id !== null,
  );
  TestValidator.predicate(
    "JPG attachment has storage path",
    jpgAttachment.storage_path !== null &&
      jpgAttachment.storage_path.length > 0,
  );
  TestValidator.predicate(
    "JPG attachment has image dimensions",
    jpgAttachment.image_width !== null && jpgAttachment.image_height !== null,
  );
  TestValidator.predicate(
    "JPG attachment has safe security status",
    jpgAttachment.security_status === "safe",
  );
  TestValidator.predicate(
    "JPG attachment has download URL",
    jpgAttachment.download_url !== null &&
      jpgAttachment.download_url !== undefined,
  );

  // Step 9: Validate second image attachment (PNG)
  const pngAttachment = createdArticle.attachments![1];
  typia.assert(pngAttachment);
  TestValidator.equals(
    "PNG attachment filename matches",
    pngAttachment.filename,
    "economic-chart.png",
  );
  TestValidator.equals(
    "PNG attachment MIME type matches",
    pngAttachment.file_type,
    "image/png",
  );
  TestValidator.equals(
    "PNG attachment extension matches",
    pngAttachment.file_extension,
    "png",
  );
  TestValidator.equals(
    "PNG attachment size matches",
    pngAttachment.file_size,
    1048576,
  );
  TestValidator.predicate(
    "PNG attachment has valid ID",
    pngAttachment.id !== null,
  );
  TestValidator.predicate(
    "PNG attachment has image dimensions",
    pngAttachment.image_width !== null && pngAttachment.image_height !== null,
  );

  // Step 10: Validate first document attachment (PDF)
  const pdfAttachment = createdArticle.attachments![2];
  typia.assert(pdfAttachment);
  TestValidator.equals(
    "PDF attachment filename matches",
    pdfAttachment.filename,
    "economic-report.pdf",
  );
  TestValidator.equals(
    "PDF attachment MIME type matches",
    pdfAttachment.file_type,
    "application/pdf",
  );
  TestValidator.equals(
    "PDF attachment extension matches",
    pdfAttachment.file_extension,
    "pdf",
  );
  TestValidator.equals(
    "PDF attachment size matches",
    pdfAttachment.file_size,
    5242880,
  );
  TestValidator.predicate(
    "PDF attachment has valid ID",
    pdfAttachment.id !== null,
  );
  TestValidator.predicate(
    "PDF attachment is document (no image dimensions)",
    pdfAttachment.image_width === null && pdfAttachment.image_height === null,
  );
  TestValidator.predicate(
    "PDF attachment has safe security status",
    pdfAttachment.security_status === "safe",
  );
  TestValidator.predicate(
    "PDF attachment has download URL",
    pdfAttachment.download_url !== null &&
      pdfAttachment.download_url !== undefined,
  );

  // Step 11: Validate second document attachment (TXT)
  const txtAttachment = createdArticle.attachments![3];
  typia.assert(txtAttachment);
  TestValidator.equals(
    "TXT attachment filename matches",
    txtAttachment.filename,
    "data-summary.txt",
  );
  TestValidator.equals(
    "TXT attachment MIME type matches",
    txtAttachment.file_type,
    "text/plain",
  );
  TestValidator.equals(
    "TXT attachment extension matches",
    txtAttachment.file_extension,
    "txt",
  );
  TestValidator.equals(
    "TXT attachment size matches",
    txtAttachment.file_size,
    524288,
  );
  TestValidator.predicate(
    "TXT attachment has valid ID",
    txtAttachment.id !== null,
  );
  TestValidator.predicate(
    "TXT attachment is document (no image dimensions)",
    txtAttachment.image_width === null && txtAttachment.image_height === null,
  );

  // Step 12: Validate attachment member ownership
  TestValidator.equals(
    "attachment 1 uploaded by article author",
    jpgAttachment.discussion_board_member_id,
    memberAuth.id,
  );
  TestValidator.equals(
    "attachment 2 uploaded by article author",
    pngAttachment.discussion_board_member_id,
    memberAuth.id,
  );
  TestValidator.equals(
    "attachment 3 uploaded by article author",
    pdfAttachment.discussion_board_member_id,
    memberAuth.id,
  );
  TestValidator.equals(
    "attachment 4 uploaded by article author",
    txtAttachment.discussion_board_member_id,
    memberAuth.id,
  );

  // Step 13: Validate attachment-article relationships
  TestValidator.equals(
    "JPG attachment belongs to article",
    jpgAttachment.discussion_board_article_id,
    createdArticle.id,
  );
  TestValidator.equals(
    "PNG attachment belongs to article",
    pngAttachment.discussion_board_article_id,
    createdArticle.id,
  );
  TestValidator.equals(
    "PDF attachment belongs to article",
    pdfAttachment.discussion_board_article_id,
    createdArticle.id,
  );
  TestValidator.equals(
    "TXT attachment belongs to article",
    txtAttachment.discussion_board_article_id,
    createdArticle.id,
  );

  // Step 14: Validate attachable type is correct
  TestValidator.equals(
    "JPG attachment type is article",
    jpgAttachment.attachable_type,
    "article",
  );
  TestValidator.equals(
    "PNG attachment type is article",
    pngAttachment.attachable_type,
    "article",
  );
  TestValidator.equals(
    "PDF attachment type is article",
    pdfAttachment.attachable_type,
    "article",
  );
  TestValidator.equals(
    "TXT attachment type is article",
    txtAttachment.attachable_type,
    "article",
  );

  // Step 15: Validate timestamp fields exist
  TestValidator.predicate(
    "article has created_at timestamp",
    createdArticle.created_at !== null,
  );
  TestValidator.predicate(
    "article has updated_at timestamp",
    createdArticle.updated_at !== null,
  );
  TestValidator.predicate(
    "JPG attachment has created_at",
    jpgAttachment.created_at !== null,
  );
  TestValidator.predicate(
    "JPG attachment has updated_at",
    jpgAttachment.updated_at !== null,
  );

  // Step 16: Validate no deleted_at for active content
  TestValidator.predicate(
    "article is not deleted",
    createdArticle.deleted_at === null ||
      createdArticle.deleted_at === undefined,
  );
  TestValidator.predicate(
    "JPG attachment is not deleted",
    jpgAttachment.deleted_at === null || jpgAttachment.deleted_at === undefined,
  );
  TestValidator.predicate(
    "PDF attachment is not deleted",
    pdfAttachment.deleted_at === null || pdfAttachment.deleted_at === undefined,
  );
}
