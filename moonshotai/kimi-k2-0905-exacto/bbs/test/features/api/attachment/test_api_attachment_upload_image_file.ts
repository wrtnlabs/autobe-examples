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
 * Test uploading image file attachments to economic discussion articles
 * including proper type validation and size constraints.
 *
 * This comprehensive test validates image upload functionality for formats like
 * JPG, PNG, and GIF within the 5MB size limit. The test verifies successful
 * file uploads, security scanning initiation, metadata generation, and proper
 * article-attachment relationship establishment.
 *
 * Test Flow:
 *
 * 1. Authenticate as an economic discussion member
 * 2. Create a new economic discussion article to attach files to
 * 3. Upload image attachments in different formats (JPEG, PNG, GIF)
 * 4. Verify file metadata, size constraints, and scanning status
 * 5. Validate article-attachment relationships and inheritance
 */
export async function test_api_attachment_upload_image_file(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as economic discussion member
  const registerMemberBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IEconomicDiscussionMember.ICreate;

  const memberAuth = await api.functional.auth.member.join(connection, {
    body: registerMemberBody,
  });
  typia.assert(memberAuth);

  // Step 2: Create an economic discussion article
  const articleContent = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });

  const createArticleBody = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    content: articleContent,
    category_ids: [typia.random<string & tags.Format<"uuid">>()],
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: createArticleBody,
    });
  typia.assert(article);

  TestValidator.equals("article created successfully", article.id, article.id);
  TestValidator.equals(
    "article title matches",
    article.title,
    createArticleBody.title,
  );
  TestValidator.equals(
    "article content matches",
    article.content,
    createArticleBody.content,
  );

  // Step 3: Upload JPEG image attachment
  const jpegAttachmentBody = {
    filename: "test-image.jpg",
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<5242880>
    >(),
    file_type: "image" as IEconomicDiscussionAttachmentFileType,
    mime_type: "image/jpeg" as IMimeType,
  } satisfies IEconomicDiscussionAttachment.ICreate;

  const jpegAttachment =
    await api.functional.economicDiscussion.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: jpegAttachmentBody,
      },
    );
  typia.assert(jpegAttachment);

  TestValidator.equals(
    "JPEG attachment filename matches",
    jpegAttachment.filename,
    "test-image.jpg",
  );
  TestValidator.equals(
    "JPEG attachment file_type is image",
    jpegAttachment.file_type,
    "image",
  );
  TestValidator.equals(
    "JPEG attachment mime_type is image/jpeg",
    jpegAttachment.mime_type,
    "image/jpeg",
  );
  TestValidator.predicate(
    "JPEG attachment is unscanned initially",
    jpegAttachment.is_scanned === false,
  );

  // Step 4: Upload PNG image attachment
  const pngAttachmentBody = {
    filename: "chart-data.png",
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<5242880>
    >(),
    file_type: "image" as IEconomicDiscussionAttachmentFileType,
    mime_type: "image/png" as IMimeType,
  } satisfies IEconomicDiscussionAttachment.ICreate;

  const pngAttachment =
    await api.functional.economicDiscussion.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: pngAttachmentBody,
      },
    );
  typia.assert(pngAttachment);

  TestValidator.equals(
    "PNG attachment filename matches",
    pngAttachment.filename,
    "chart-data.png",
  );
  TestValidator.equals(
    "PNG attachment file_type is image",
    pngAttachment.file_type,
    "image",
  );
  TestValidator.equals(
    "PNG attachment mime_type is image/png",
    pngAttachment.mime_type,
    "image/png",
  );

  // Step 5: Upload GIF image attachment
  const gifAttachmentBody = {
    filename: "animated-chart.gif",
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<5242880>
    >(),
    file_type: "image" as IEconomicDiscussionAttachmentFileType,
    mime_type: "image/gif" as IMimeType,
  } satisfies IEconomicDiscussionAttachment.ICreate;

  const gifAttachment =
    await api.functional.economicDiscussion.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: gifAttachmentBody,
      },
    );
  typia.assert(gifAttachment);

  TestValidator.equals(
    "GIF attachment filename matches",
    gifAttachment.filename,
    "animated-chart.gif",
  );
  TestValidator.equals(
    "GIF attachment file_type is image",
    gifAttachment.file_type,
    "image",
  );
  TestValidator.equals(
    "GIF attachment mime_type is image/gif",
    gifAttachment.mime_type,
    "image/gif",
  );

  // Step 6: Validate article-attachment relationships
  TestValidator.equals(
    "JPEG article relationship",
    jpegAttachment.article.id,
    article.id,
  );
  TestValidator.equals(
    "PNG article relationship",
    pngAttachment.article.id,
    article.id,
  );
  TestValidator.equals(
    "GIF article relationship",
    gifAttachment.article.id,
    article.id,
  );

  // Verify attachment metadata and properties
  TestValidator.predicate(
    "all attachments have UUID IDs",
    jpegAttachment.id !== undefined &&
      pngAttachment.id !== undefined &&
      gifAttachment.id !== undefined,
  );

  TestValidator.predicate(
    "file sizes are within constraints",
    jpegAttachment.file_size >= 1000 &&
      jpegAttachment.file_size <= 5242880 &&
      pngAttachment.file_size >= 1000 &&
      pngAttachment.file_size <= 5242880 &&
      gifAttachment.file_size >= 1000 &&
      gifAttachment.file_size <= 5242880,
  );

  TestValidator.predicate(
    "all attachments have ISO format upload timestamps",
    jpegAttachment.uploaded_at.match(
      "/^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?(Z|[\\+\-]([01][0-9]|2[0-3]):[0-5][0-9])$/i",
    ) !== null &&
      pngAttachment.uploaded_at.match(
        "/^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?(Z|[\\+\-]([01][0-9]|2[0-3]):[0-5][0-9])$/i",
      ) !== null &&
      gifAttachment.uploaded_at.match(
        "/^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?(Z|[\\+\-]([01][0-9]|2[0-3]):[0-5][0-9])$/i",
      ) !== null,
  );

  TestValidator.equals(
    "article summary matches parent",
    jpegAttachment.article.title,
    article.title,
  );
  TestValidator.equals(
    "article summary matches parent",
    pngAttachment.article.title,
    article.title,
  );
  TestValidator.equals(
    "article summary matches parent",
    gifAttachment.article.title,
    article.title,
  );
}
