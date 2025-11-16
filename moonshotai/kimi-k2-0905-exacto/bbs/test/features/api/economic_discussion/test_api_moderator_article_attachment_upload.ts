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
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";
import type { IFileSize } from "@ORGANIZATION/PROJECT-api/lib/structures/IFileSize";
import type { IFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IFileType";
import type { IMimeType } from "@ORGANIZATION/PROJECT-api/lib/structures/IMimeType";

export async function test_api_moderator_article_attachment_upload(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account with elevated permissions
  const moderatorPassword = RandomGenerator.alphabets(12);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: moderatorPassword,
      moderation_level: "standard",
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create member account for article creation
  const memberPassword = RandomGenerator.alphabets(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Create required category for article creation
  const category =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphabets(6),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: 1,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Member creates an article
  const memberArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        category_ids: [category.id],
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(memberArticle);

  // Step 5: Switch to moderator account for attachment upload
  await api.functional.auth.moderator.login(connection, {
    body: {
      username: moderator.username,
      password: moderatorPassword,
      href: "https://test.example.com/login",
      referrer: "https://test.example.com/",
    } satisfies IEconomicDiscussionModerator.ILogin,
  });

  // Step 6: Moderator uploads attachment to member's article (demonstrating elevated permissions)
  const attachment =
    await api.functional.economicDiscussion.moderator.articles.attachments.create(
      connection,
      {
        articleId: memberArticle.id,
        body: {
          filename:
            `${RandomGenerator.alphabets(8)}.pdf` as IAttachmentFilename,
          file_size: 1024000 satisfies IFileSize, // 1MB file
          file_type: "document" as IFileType,
          mime_type: "application/pdf" as IMimeType,
        } satisfies IEconomicDiscussionAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // Step 7: Validate attachment metadata and article relationship
  TestValidator.equals(
    "attachment article ID matches target article",
    attachment.article.id,
    memberArticle.id,
  );
  TestValidator.equals(
    "attachment filename has correct extension",
    attachment.filename.endsWith(".pdf"),
    true,
  );
  TestValidator.equals(
    "attachment file type is document",
    attachment.file_type,
    "document",
  );
  TestValidator.equals(
    "attachment MIME type is correct",
    attachment.mime_type,
    "application/pdf",
  );
  TestValidator.equals(
    "attachment file size matches",
    attachment.file_size,
    1024000,
  );
  TestValidator.predicate(
    "attachment has upload timestamp",
    attachment.uploaded_at !== null && attachment.uploaded_at !== undefined,
  );
  TestValidator.predicate(
    "attachment has scan status",
    typeof attachment.is_scanned === "boolean",
  );

  // Step 8: Validate moderator authorization worked (article owner is member, not moderator)
  TestValidator.notEquals(
    "article author is not moderator",
    memberArticle.moderator_author,
    moderator.id,
  );
  TestValidator.equals(
    "article has member author",
    memberArticle.member_author,
    member.member.id,
  );
}
