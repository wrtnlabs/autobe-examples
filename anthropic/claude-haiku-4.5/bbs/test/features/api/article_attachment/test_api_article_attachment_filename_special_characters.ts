import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test attachment with filename containing special characters, unicode
 * characters, spaces, and other edge cases.
 *
 * This test validates that a contributor can create an article and attach files
 * with complex original filenames including various special characters. The
 * system should safely handle and preserve these filenames without corruption
 * or injection risks, ensuring that special characters are safely handled and
 * preserved for user reference.
 *
 * Test flow:
 *
 * 1. Register a new contributor account
 * 2. Create an article in draft status
 * 3. Attach files with special character filenames including:
 *
 *    - Spaces and multiple spaces
 *    - Special characters: ! @ # $ % & * + = [ ] { } ( ) - _ . , ; :
 *    - Unicode characters from various languages
 *    - Mixed case letters and numbers
 * 4. Verify that filenames are stored correctly and preserved
 * 5. Confirm that attachment metadata accurately reflects original filenames
 */
export async function test_api_article_attachment_filename_special_characters(
  connection: api.IConnection,
) {
  // 1. Register a new contributor
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: RandomGenerator.alphabets(10),
        password: "TestPassword123!@#",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.predicate(
    "contributor should be active",
    contributor.account_status === "active",
  );

  // 2. Create an article in draft status
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: "Test Article with Special Characters",
          content: RandomGenerator.content({ paragraphs: 2 }),
          categoryId: categoryId,
          href: "https://example.com/article/create",
          referrer: "https://example.com",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.equals(
    "article status should be draft",
    article.status,
    "draft",
  );

  // 3. Test attachments with special character filenames
  const specialCharacterFilenames = [
    "document (2024) [final].pdf",
    "file@version#2.docx",
    "résumé_français_2024.pdf",
    "中文文件名测试.docx",
    "Ñoño_España_Ácido.txt",
    "price_list $99.99 - 20% off.xlsx",
    "file&name+special=chars.pdf",
    "multiple   spaces   between.txt",
    "UPPERCASE_and_lowercase_MixeD.pdf",
    "file.name.with.dots.docx",
    "hyphen-separated-filename-test.txt",
    "underscore_separated_filename.pdf",
  ];

  const attachments: IDiscussionBoardArticleAttachment[] = [];

  for (const filename of specialCharacterFilenames) {
    // Determine file extension
    const extension = filename.split(".").pop() || "txt";
    const fileType = extension;

    // Determine MIME type based on extension
    let mimeType: string;
    switch (extension.toLowerCase()) {
      case "pdf":
        mimeType = "application/pdf";
        break;
      case "docx":
        mimeType =
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        break;
      case "xlsx":
        mimeType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        break;
      case "txt":
        mimeType = "text/plain";
        break;
      default:
        mimeType = "application/octet-stream";
    }

    // Determine file size based on type (within limits: 5MB for documents, 25MB max)
    const fileSize =
      fileType.toLowerCase() === "pdf"
        ? RandomGenerator.pick([1024, 5120, 10240, 25600, 51200])
        : RandomGenerator.pick([1024, 5120, 10240, 25600]);

    // Create attachment with special character filename
    const attachment: IDiscussionBoardArticleAttachment =
      await api.functional.discussionBoard.contributor.articles.attachments.attach(
        connection,
        {
          articleId: article.id,
          body: {
            original_filename: filename,
            file_type: fileType,
            file_size: fileSize,
            mime_type: mimeType,
            display_url: `https://example.com/files/${encodeURIComponent(filename)}`,
          } satisfies IDiscussionBoardArticleAttachment.ICreate,
        },
      );
    typia.assert(attachment);
    attachments.push(attachment);

    // Verify filename is preserved correctly
    TestValidator.equals(
      `filename should be preserved for: ${filename}`,
      attachment.original_filename,
      filename,
    );

    // Verify file type matches
    TestValidator.equals(
      `file type should match for: ${filename}`,
      attachment.file_type,
      fileType,
    );

    // Verify MIME type matches
    TestValidator.equals(
      `MIME type should match for: ${filename}`,
      attachment.mime_type,
      mimeType,
    );

    // Verify file size is stored
    TestValidator.equals(
      `file size should match for: ${filename}`,
      attachment.file_size,
      fileSize,
    );

    // Verify attachment is linked to correct article
    TestValidator.equals(
      `attachment should belong to correct article for: ${filename}`,
      attachment.discussion_board_article_id,
      article.id,
    );

    // Verify contributor information
    typia.assert(attachment.uploaded_by_contributor);
    TestValidator.equals(
      `contributor should match for: ${filename}`,
      attachment.uploaded_by_contributor.id,
      contributor.id,
    );
  }

  // 4. Verify all attachments were created successfully
  TestValidator.predicate(
    "all attachments should be created",
    attachments.length === specialCharacterFilenames.length,
  );

  // 5. Verify no special characters caused injection or corruption
  for (let i = 0; i < specialCharacterFilenames.length; i++) {
    TestValidator.equals(
      `special characters should not be corrupted for: ${specialCharacterFilenames[i]}`,
      attachments[i].original_filename,
      specialCharacterFilenames[i],
    );
  }
}
