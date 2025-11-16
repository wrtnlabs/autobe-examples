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
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";
import type { IFileSize } from "@ORGANIZATION/PROJECT-api/lib/structures/IFileSize";
import type { IFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IFileType";
import type { IMimeType } from "@ORGANIZATION/PROJECT-api/lib/structures/IMimeType";

/**
 * Test moderator attachment retrieval functionality.
 *
 * This test validates the complete workflow for moderators to retrieve
 * attachment metadata from economic discussion articles. The process involves:
 *
 * 1. Creating a new moderator account for administrative access
 * 2. Establishing a discussion category for content organization
 * 3. Publishing an economic discussion article
 * 4. Uploading a file attachment with proper metadata
 * 5. Retrieving the attachment metadata and verifying completeness
 *
 * The test ensures that attachment metadata retrieval provides accurate
 * information including filename, file size, MIME type, upload timestamp,
 * security scanning status, and article association. This validates the
 * moderator's ability to audit and manage article attachments effectively
 * within the discussion platform.
 */
export async function test_api_moderator_attachment_retrieval(
  connection: api.IConnection,
) {
  // 1. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorCreateBody = {
    username: RandomGenerator.alphabets(10),
    email: moderatorEmail,
    password_hash: RandomGenerator.alphaNumeric(20),
    moderation_level: "senior",
  } satisfies IEconomicDiscussionModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorCreateBody,
  });
  typia.assert(moderator);

  // 2. Create discussion category
  const categoryBody = {
    code: RandomGenerator.alphabets(8),
    name: "Economic Policy Analysis",
    description:
      "Discussions about current economic policies and their impacts",
    display_order: 1,
    is_active: true,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const category =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // 3. Create economic discussion article
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 8,
    }),
    category_ids: [category.id],
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article =
    await api.functional.economicDiscussion.moderator.articles.create(
      connection,
      { body: articleBody },
    );
  typia.assert(article);

  // 4. Upload file attachment
  const fileTypes: IEconomicDiscussionAttachmentFileType[] = [
    "image",
    "document",
    "spreadsheet",
  ];
  const mimeTypes: IMimeType[] = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
    "application/msword",
  ];

  const attachmentBody = {
    filename: "economic_report_2024.pdf" as IAttachmentFilename,
    file_size: 5242880 as IFileSize, // 5MB
    file_type: RandomGenerator.pick(fileTypes),
    mime_type: RandomGenerator.pick(mimeTypes),
  } satisfies IEconomicDiscussionAttachments.ICreate;

  const attachment =
    await api.functional.economicDiscussion.moderator.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentBody,
      },
    );
  typia.assert(attachment);

  // 5. Retrieve attachment metadata
  const retrievedAttachment =
    await api.functional.economicDiscussion.moderator.articles.attachments.at(
      connection,
      {
        articleId: article.id,
        attachmentId: attachment.id,
      },
    );
  typia.assert(retrievedAttachment);

  // 6. Validate attachment metadata completeness
  TestValidator.equals(
    "attachment id matches",
    retrievedAttachment.id,
    attachment.id,
  );
  TestValidator.equals(
    "filename matches original",
    retrievedAttachment.filename,
    attachmentBody.filename,
  );
  TestValidator.equals(
    "file size matches original",
    retrievedAttachment.file_size,
    attachmentBody.file_size,
  );
  TestValidator.equals(
    "file type matches original",
    retrievedAttachment.file_type,
    attachmentBody.file_type,
  );
  TestValidator.equals(
    "MIME type matches original",
    retrievedAttachment.mime_type,
    attachmentBody.mime_type,
  );
  TestValidator.equals(
    "associated article matches",
    retrievedAttachment.article.id,
    article.id,
  );
  TestValidator.predicate(
    "upload timestamp is valid",
    new Date(retrievedAttachment.uploaded_at).getTime() > 0,
  );
  TestValidator.predicate(
    "security scanning status is available",
    typeof retrievedAttachment.is_scanned === "boolean",
  );
}
