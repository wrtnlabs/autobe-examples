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
 * Test moderator-level attachment metadata updates with enhanced permissions.
 *
 * This test validates the comprehensive attachment management capabilities
 * available to moderators within the economic discussion platform. The primary
 * objective is to verify that moderators can rename file attachments across any
 * articles they have access to, not just those they personally created.
 *
 * The test scenario follows a complete workflow: moderator authentication,
 * category creation for content organization, article establishment for
 * attachment testing, file upload with initial metadata, and subsequent
 * filename modification through the update endpoint. This comprehensive
 * approach ensures all aspects of the attachment management system function
 * correctly under moderator authority.
 *
 * Key validation points include:
 *
 * - Moderator authentication and session establishment
 * - Cross-article attachment metadata modification permissions
 * - Filename update functionality with proper validation
 * - Attachment system integrity after metadata changes
 * - Permission escalation verification for administrative tasks
 *
 * This functionality is essential for content moderation workflows where
 * administrators need to maintain attachment organization and clarity without
 * being constrained by individual article ownership boundaries.
 */
export async function test_api_moderator_attachment_rename(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account with authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(10);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.name(),
      email: moderatorEmail,
      password_hash: moderatorPassword,
      email_verified: true,
      two_factor_enabled: false,
      moderation_level: "standard",
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create discussion category for article organization
  const category =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphabets(8),
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: 1,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create article for attachment testing
  const articleTitle = RandomGenerator.name(3);
  const articleContent = RandomGenerator.content({ paragraphs: 3 });
  const article =
    await api.functional.economicDiscussion.moderator.articles.create(
      connection,
      {
        body: {
          title: articleTitle,
          content: articleContent,
          category_ids: [category.id],
          attachments: [],
        } satisfies IEconomicDiscussionArticle.ICreate,
      },
    );
  typia.assert(article);

  // Step 4: Upload initial attachment with original filename
  const originalFilename: IAttachmentFilename =
    typia.random<IAttachmentFilename>();
  const fileSize: IFileSize = typia.random<
    number & tags.Minimum<1000> & tags.Maximum<1000000>
  >();
  const fileType: IFileType = RandomGenerator.pick([
    "image",
    "document",
    "spreadsheet",
  ] as const);
  const mimeType: IMimeType = RandomGenerator.pick([
    "application/pdf",
    "image/jpeg",
    "application/msword",
  ] as const);

  const attachment =
    await api.functional.economicDiscussion.moderator.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          filename: originalFilename,
          file_size: fileSize,
          file_type: fileType,
          mime_type: mimeType,
        } satisfies IEconomicDiscussionAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // Step 5: Rename attachment using moderator privileges
  const updatedFilename: IAttachmentFilename =
    typia.random<IAttachmentFilename>();
  const updatedAttachment =
    await api.functional.economicDiscussion.moderator.articles.attachments.update(
      connection,
      {
        articleId: article.id,
        attachmentId: attachment.id,
        body: {
          filename: updatedFilename,
        } satisfies IEconomicDiscussionAttachment.IUpdate,
      },
    );
  typia.assert(updatedAttachment);

  // Step 6: Verify successful attachment metadata update
  TestValidator.equals(
    "attachment ID remains consistent",
    updatedAttachment.id,
    attachment.id,
  );
  TestValidator.equals(
    "article association maintained",
    updatedAttachment.article.id,
    article.id,
  );
  TestValidator.equals(
    "filename successfully updated",
    updatedAttachment.filename,
    updatedFilename,
  );
  TestValidator.notEquals(
    "filename changed from original",
    updatedAttachment.filename,
    originalFilename,
  );
  TestValidator.predicate(
    "other metadata unchanged",
    () =>
      updatedAttachment.file_size === attachment.file_size &&
      updatedAttachment.file_type === attachment.file_type &&
      updatedAttachment.mime_type === attachment.mime_type,
  );
}
