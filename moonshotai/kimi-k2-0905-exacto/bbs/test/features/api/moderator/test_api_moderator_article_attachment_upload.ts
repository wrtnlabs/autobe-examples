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

export async function test_api_moderator_article_attachment_upload(
  connection: api.IConnection,
) {
  // 1. Create moderator account for administrative privileges
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: moderatorEmail,
      password_hash: "moderator123",
      email_verified: true,
      two_factor_enabled: false,
      moderation_level: "admin",
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Create category for article organization
  const category =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: `${RandomGenerator.alphaNumeric(8)}_cat`,
          name: `${RandomGenerator.name()} Economics`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: 1,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create moderator article with comprehensive content
  const article =
    await api.functional.economicDiscussion.moderator.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 15,
            sentenceMax: 20,
            wordMin: 4,
            wordMax: 8,
          }),
          category_ids: [category.id],
          attachments: [],
        } satisfies IEconomicDiscussionArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.equals("article status", article.status, "pending");

  // 4. Upload attachment to the moderator article
  const attachment =
    await api.functional.economicDiscussion.moderator.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          filename: "test_attachment.png" as IAttachmentFilename,
          file_size: 10245 satisfies IFileSize,
          file_type: RandomGenerator.pick([
            "image",
            "document",
            "spreadsheet",
          ] as const) satisfies IEconomicDiscussionAttachmentFileType,
          mime_type: RandomGenerator.pick([
            "image/png",
            "image/jpeg",
            "image/gif",
          ] as const) satisfies IMimeType,
        } satisfies IEconomicDiscussionAttachments.ICreate,
      },
    );
  typia.assert(attachment);

  // 5. Validate attachment properties and relationships
  TestValidator.equals(
    "attachment linked to article",
    attachment.article.id,
    article.id,
  );
  TestValidator.predicate("valid filename", attachment.filename.length > 0);
  TestValidator.predicate("valid file size", attachment.file_size > 0);
  TestValidator.predicate(
    "proper mime type",
    ["image/png", "image/jpeg", "image/gif"].includes(attachment.mime_type),
  );
  TestValidator.predicate(
    "upload timestamp exists",
    new Date(attachment.uploaded_at).getTime() > 0,
  );
  TestValidator.predicate(
    "scan status tracked",
    typeof attachment.is_scanned === "boolean",
  );
}
