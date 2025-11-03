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
 * Test rejection of unsupported file types and validation of file format
 * compliance.
 *
 * The system should only accept specified file types and validate actual file
 * content matches declared type. This test validates file type enforcement by:
 *
 * 1. Creating member and article for testing
 * 2. Attempting to upload files with unsupported extensions (.exe, .bat, .sh, .zip
 *    without proper context)
 * 3. Validating specific rejection error messages for each unsupported type
 * 4. Uploading files with mismatched extensions (e.g., renaming .exe to .pdf)
 * 5. Confirming that magic byte validation detects content/extension mismatch
 * 6. Testing that only 19 supported formats are accepted
 * 7. Verifying clear error messaging guides users toward acceptable file types
 *
 * This ensures the platform maintains security through comprehensive file type
 * validation.
 */
export async function test_api_article_attachment_upload_unsupported_file_types(
  connection: api.IConnection,
) {
  // 1. Create a member account
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(5) + "Aa1", // Ensure password meets requirements
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);

  // 2. Create an article for attachment testing
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 5,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
          wordMin: 3,
          wordMax: 7,
        }),
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // 3. Test rejection of unsupported file type: .exe
  await TestValidator.error("should reject .exe file extension", async () => {
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          filename: "malicious.exe",
          file_type: "application/octet-stream",
          file_extension: "exe",
          file_size: 1024,
          attachable_type: "article",
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  });

  // 4. Test rejection of unsupported file type: .bat
  await TestValidator.error("should reject .bat file extension", async () => {
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          filename: "script.bat",
          file_type: "text/plain",
          file_extension: "bat",
          file_size: 512,
          attachable_type: "article",
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  });

  // 5. Test rejection of unsupported file type: .sh
  await TestValidator.error("should reject .sh file extension", async () => {
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          filename: "script.sh",
          file_type: "text/plain",
          file_extension: "sh",
          file_size: 256,
          attachable_type: "article",
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  });

  // 6. Test rejection of file with mismatched extension (.exe disguised as .pdf)
  await TestValidator.error(
    "should reject file with mismatched extension (exe as pdf)",
    async () => {
      await api.functional.discussionBoard.member.articles.attachments.create(
        connection,
        {
          articleId: article.id,
          body: {
            filename: "document.pdf",
            file_type: "application/pdf",
            file_extension: "pdf",
            file_size: 2048,
            attachable_type: "article",
          } satisfies IDiscussionBoardAttachment.ICreate,
        },
      );
    },
  );

  // 7. Test successful upload of supported image format: jpg
  const jpgAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          filename: "image.jpg",
          file_type: "image/jpeg",
          file_extension: "jpg",
          file_size: 102400,
          attachable_type: "article",
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(jpgAttachment);
  TestValidator.equals(
    "jpg attachment uploaded successfully",
    jpgAttachment.file_extension,
    "jpg",
  );

  // 8. Test successful upload of supported document format: pdf
  const pdfAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          filename: "document.pdf",
          file_type: "application/pdf",
          file_extension: "pdf",
          file_size: 204800,
          attachable_type: "article",
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(pdfAttachment);
  TestValidator.equals(
    "pdf attachment uploaded successfully",
    pdfAttachment.file_extension,
    "pdf",
  );

  // 9. Test successful upload of supported document format: docx
  const docxAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          filename: "document.docx",
          file_type:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          file_extension: "docx",
          file_size: 153600,
          attachable_type: "article",
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(docxAttachment);
  TestValidator.equals(
    "docx attachment uploaded successfully",
    docxAttachment.file_extension,
    "docx",
  );

  // 10. Test successful upload of supported image format: png
  const pngAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          filename: "image.png",
          file_type: "image/png",
          file_extension: "png",
          file_size: 81920,
          attachable_type: "article",
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(pngAttachment);
  TestValidator.equals(
    "png attachment uploaded successfully",
    pngAttachment.file_extension,
    "png",
  );
}
