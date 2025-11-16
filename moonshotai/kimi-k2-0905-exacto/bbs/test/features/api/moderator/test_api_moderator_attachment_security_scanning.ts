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
 * Test moderator attachment security scanning functionality.
 *
 * This test validates that even when a moderator uploads attachments to
 * economic discussion articles, the files still undergo mandatory security
 * scanning protocols. The test ensures that:
 *
 * 1. Moderator can successfully create article and upload attachments
 * 2. Uploaded files immediately enter pending security scan state (is_scanned:
 *    false)
 * 3. Security protocols are enforced regardless of moderator privileges
 * 4. File metadata is properly tracked including size, type, and MIME type
 *
 * The test follows the complete workflow: moderator authentication → category
 * creation → article creation → file attachment upload → security scan status
 * validation
 */
export async function test_api_moderator_attachment_security_scanning(
  connection: api.IConnection,
) {
  // 1. Authenticate moderator user
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: moderatorEmail,
      password_hash: RandomGenerator.alphaNumeric(32),
      moderation_level: "standard",
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Create a category for article classification
  const category =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphabets(8),
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
          display_order: 1,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create an economic discussion article
  const article =
    await api.functional.economicDiscussion.moderator.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.name(5),
          content: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 10,
            sentenceMax: 15,
            wordMin: 4,
            wordMax: 8,
          }),
          category_ids: [category.id],
          attachments: [],
        } satisfies IEconomicDiscussionArticle.ICreate,
      },
    );
  typia.assert(article);

  // 4. Upload a file attachment to test security scanning
  const fileTypes = ["image", "document", "spreadsheet"] as const;
  const selectedFileType = RandomGenerator.pick(fileTypes);
  const mimeTypes: Record<IEconomicDiscussionAttachmentFileType, IMimeType> = {
    image: "image/jpeg",
    document: "application/pdf",
    spreadsheet:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };

  const attachment =
    await api.functional.economicDiscussion.moderator.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          filename:
            `${RandomGenerator.alphabets(8)}.${selectedFileType === "image" ? "jpg" : selectedFileType === "document" ? "pdf" : "xlsx"}` satisfies IAttachmentFilename,
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<10485760>
          >(),
          file_type: selectedFileType,
          mime_type: mimeTypes[selectedFileType],
        } satisfies IEconomicDiscussionAttachments.ICreate,
      },
    );
  typia.assert(attachment);

  // 5. Validate security scanning behavior regardless of moderator privileges
  TestValidator.predicate(
    "attachment has valid ID",
    typeof attachment.id === "string" && attachment.id.length > 0,
  );
  TestValidator.predicate(
    "attachment has valid article association",
    attachment.article.id === article.id,
  );
  TestValidator.predicate(
    "attachment has correct filename",
    attachment.filename.length > 0,
  );
  TestValidator.predicate(
    "attachment has positive file size",
    attachment.file_size > 0,
  );
  TestValidator.predicate(
    "attachment is properly typed",
    fileTypes.includes(
      attachment.file_type as IEconomicDiscussionAttachmentFileType,
    ),
  );
  TestValidator.predicate(
    "attachment has valid MIME type",
    Object.values(mimeTypes).includes(attachment.mime_type as IMimeType),
  );
  TestValidator.predicate(
    "attachment has uploaded timestamp",
    attachment.uploaded_at.length > 0,
  );
  TestValidator.equals(
    "attachment is security scanned",
    attachment.is_scanned,
    false,
  );

  // 6. Verify security protocols are applied consistently
  TestValidator.predicate(
    "attachment respects file size limits",
    attachment.file_size <= 10485760,
  );
  TestValidator.predicate(
    "attachment filename follows security patterns",
    /^[^\s\/\?&#<>\|]{1,240}(?:\.([a-zA-Z]{1,10}))?$/.test(attachment.filename),
  );
}
