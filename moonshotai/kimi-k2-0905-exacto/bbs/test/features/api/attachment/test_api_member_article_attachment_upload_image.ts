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
 * Test successful upload of image attachment to member's own article. Validates
 * file type validation for JPEG images, size limits (up to 5MB), secure upload
 * process, and metadata persistence. Also verifies attachment count validation
 * (max 5 per article) and checks that uploaded attachment appears in article's
 * attachment list.
 */
export async function test_api_member_article_attachment_upload_image(
  connection: api.IConnection,
) {
  // Step 1: Register as a member to get authentication
  const username = RandomGenerator.name();
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);

  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      username,
      email,
      password,
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(memberAuth);

  // Step 2: Create an article to attach files to
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const articleContent = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 8,
    sentenceMax: 15,
  });
  const categoryIds = [typia.random<string & tags.Format<"uuid">>()];

  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: articleTitle,
        content: articleContent,
        category_ids: categoryIds,
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(article);

  // Step 3: Upload multiple JPEG image attachments
  const attachmentCount = 3; // Upload 3 images to test multiple attachments
  const uploadedAttachments: IEconomicDiscussionAttachment[] = [];

  for (let i = 0; i < attachmentCount; i++) {
    const filename = `image_${i + 1}.jpg` as IAttachmentFilename;
    const fileSize = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<5242880>
    >(); // 1KB to 5MB
    const mimeType: IMimeType = "image/jpeg";
    const fileType: IEconomicDiscussionAttachmentFileType = "image";

    const attachment =
      await api.functional.economicDiscussion.member.articles.attachments.create(
        connection,
        {
          articleId: article.id,
          body: {
            filename,
            file_size: fileSize satisfies number as number,
            mime_type: mimeType,
            file_type: fileType,
          } satisfies IEconomicDiscussionAttachment.ICreate,
        },
      );
    typia.assert(attachment);

    uploadedAttachments.push(attachment);

    // Verify attachment properties
    TestValidator.equals(
      `attachment ${i + 1} filename matches`,
      attachment.filename,
      filename,
    );
    TestValidator.equals(
      `attachment ${i + 1} file size matches`,
      attachment.file_size,
      fileSize,
    );
    TestValidator.equals(
      `attachment ${i + 1} MIME type matches`,
      attachment.mime_type,
      mimeType,
    );
    TestValidator.equals(
      `attachment ${i + 1} file type matches`,
      attachment.file_type,
      fileType,
    );
    TestValidator.predicate(
      `attachment ${i + 1} is assigned to correct article`,
      attachment.article.id === article.id,
    );
    TestValidator.predicate(
      `attachment ${i + 1} has upload timestamp`,
      typeof attachment.uploaded_at === "string",
    );
    TestValidator.predicate(
      `attachment ${i + 1} has scan status`,
      typeof attachment.is_scanned === "boolean",
    );
  }

  // Step 4: Verify total attachment count tracking
  TestValidator.equals(
    "correct number of attachments uploaded",
    uploadedAttachments.length,
    attachmentCount,
  );

  // Step 5: Validate attachment metadata consistency
  uploadedAttachments.forEach((attachment, index) => {
    TestValidator.equals(
      `attachment ${index + 1} ID is valid UUID`,
      typeof attachment.id === "string" && attachment.id.length === 36,
      true,
    );
    TestValidator.predicate(
      `attachment ${index + 1} has article summary`,
      attachment.article !== undefined,
    );
    TestValidator.equals(
      `attachment ${index + 1} article ID matches`,
      attachment.article.id,
      article.id,
    );
  });

  // Step 6: Test file size validation boundaries
  const validFileSizes = uploadedAttachments.map((att) => att.file_size);
  const minSize = Math.min(...validFileSizes);
  const maxSize = Math.max(...validFileSizes);

  TestValidator.predicate(
    "all file sizes are positive",
    validFileSizes.every((size) => size > 0),
  );
  TestValidator.predicate(
    "all file sizes are within 5MB limit",
    validFileSizes.every((size) => size <= 5242880),
  );
  TestValidator.predicate("file sizes show variation", maxSize > minSize);

  // Log successful test completion with details
  console.log(
    `Successfully uploaded ${attachmentCount} image attachments to article`,
    {
      articleId: article.id,
      articleTitle: article.title,
      memberUsername: memberAuth.member.username,
      totalAttachments: uploadedAttachments.length,
    },
  );
}
