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
 * Test creating a file attachment with valid image file metadata.
 *
 * This test validates the complete workflow for attaching image files to
 * economic discussion articles. The test creates a member account for
 * authentication, creates an article to attach files to, then uploads an image
 * attachment with proper validation including file size within limits, correct
 * MIME type, and proper file type classification. Verifies successful
 * attachment creation with automatic security scanning initiation and proper
 * response format containing complete attachment metadata including article
 * relationship, file details, and scan status.
 */
export async function test_api_attachment_create_with_valid_image(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new member account for authentication
  const memberRegistration = {
    username: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
  } satisfies IEconomicDiscussionMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberRegistration,
  });
  typia.assert(member);

  // 2. Create article to attach files to
  const categoryIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    category_ids: categoryIds,
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // 3. Create image attachment with valid metadata
  const validImageFile = {
    filename: "economic-chart.jpg" as IAttachmentFilename,
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<5242880>
    >(), // Between 1KB and 5MB
    file_type: "image" as IEconomicDiscussionAttachmentFileType,
    mime_type: "image/jpeg" as IMimeType,
  } satisfies IEconomicDiscussionAttachments.ICreate;

  const attachment =
    await api.functional.economicDiscussion.member.articles.attachmentFiles.create(
      connection,
      {
        articleId: article.id,
        body: validImageFile,
      },
    );

  // 4. Validate attachment response structure
  typia.assert(attachment);

  // 5. Verify attachment metadata accuracy
  TestValidator.equals(
    "attachment filename matches request",
    attachment.filename,
    validImageFile.filename,
  );
  TestValidator.equals(
    "attachment file_size matches request",
    attachment.file_size,
    validImageFile.file_size,
  );
  TestValidator.equals(
    "attachment file_type matches request",
    attachment.file_type,
    validImageFile.file_type,
  );
  TestValidator.equals(
    "attachment mime_type matches request",
    attachment.mime_type,
    validImageFile.mime_type,
  );

  // 6. Verify article relationship
  TestValidator.equals(
    "attachment article ID matches original article",
    attachment.article.id,
    article.id,
  );
  TestValidator.equals(
    "attachment article title matches original",
    attachment.article.title,
    article.title,
  );
  TestValidator.predicate(
    "attachment has upload timestamp",
    attachment.uploaded_at !== null,
  );
  TestValidator.predicate(
    "attachment scan status is boolean",
    typeof attachment.is_scanned === "boolean",
  );

  // 7. Test different image MIME types
  const mimeTypes = ["image/jpeg", "image/png", "image/gif"] as const;
  const fileExtensions = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
  };

  await ArrayUtil.asyncForEach(mimeTypes, async (mimeType, index) => {
    const imageAttachment = {
      filename:
        `test-image-${index}${fileExtensions[mimeType]}` as IAttachmentFilename,
      file_size: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<2000> & tags.Maximum<2097152>
      >(), // Between 2KB and 2MB
      file_type: "image" as IEconomicDiscussionAttachmentFileType,
      mime_type: mimeType as IMimeType,
    } satisfies IEconomicDiscussionAttachments.ICreate;

    const result =
      await api.functional.economicDiscussion.member.articles.attachmentFiles.create(
        connection,
        {
          articleId: article.id,
          body: imageAttachment,
        },
      );

    typia.assert(result);
    TestValidator.equals(
      `attachment ${index} filename matches`,
      result.filename,
      imageAttachment.filename,
    );
    TestValidator.equals(
      `attachment ${index} size matches`,
      result.file_size,
      imageAttachment.file_size,
    );
    TestValidator.equals(
      `attachment ${index} type matches`,
      result.file_type,
      imageAttachment.file_type,
    );
    TestValidator.equals(
      `attachment ${index} mime matches`,
      result.mime_type,
      imageAttachment.mime_type,
    );
  });
}
