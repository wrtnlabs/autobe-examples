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
 * Test adding attachments to articles authored by other moderators. Validates
 * inter-moderator collaboration and content enhancement capabilities within the
 * moderation team.
 */
export async function test_api_moderator_attachment_moderator_article(
  connection: api.IConnection,
) {
  // Step 1: Create first moderator account
  const firstModeratorUsername = RandomGenerator.alphabets(10);
  const firstModeratorEmail = `${RandomGenerator.alphabets(8)}@economicdiscussion.com`;

  const firstModerator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: firstModeratorUsername,
      email: firstModeratorEmail,
      password_hash: RandomGenerator.alphaNumeric(16),
      moderation_level: "standard",
      email_verified: true,
      two_factor_enabled: false,
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(firstModerator);

  // Step 2: Create a category as first moderator
  const categoryBody = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    is_active: true,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const category =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // Step 3: Create an article as first moderator
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    content: RandomGenerator.content({
      paragraphs: 5,
      sentenceMin: 15,
      sentenceMax: 25,
    }),
    category_ids: [category.id],
    attachments: [],
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article =
    await api.functional.economicDiscussion.moderator.articles.create(
      connection,
      {
        body: articleBody,
      },
    );
  typia.assert(article);

  // Step 4: Create second moderator account
  const secondModeratorUsername = RandomGenerator.alphabets(10);
  const secondModeratorEmail = `${RandomGenerator.alphabets(8)}@economicdiscussion.com`;

  const secondModerator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: secondModeratorUsername,
      email: secondModeratorEmail,
      password_hash: RandomGenerator.alphaNumeric(16),
      moderation_level: "senior",
      email_verified: true,
      two_factor_enabled: false,
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(secondModerator);

  // Step 5: Second moderator adds attachment to first moderator's article
  const attachmentBody = {
    filename:
      `economic_analysis_${RandomGenerator.alphabets(5)}.pdf` satisfies IAttachmentFilename,
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10485760>
    >(),
    file_type: "document" as IEconomicDiscussionAttachmentFileType,
    mime_type: "application/pdf" as IMimeType,
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

  // Validate the attachment was created successfully
  TestValidator.equals(
    "attachment article ID matches",
    attachment.article.id,
    article.id,
  );
  TestValidator.equals(
    "attachment filename matches",
    attachment.filename,
    attachmentBody.filename,
  );
  TestValidator.equals(
    "attachment file type matches",
    attachment.file_type,
    attachmentBody.file_type,
  );
  TestValidator.equals(
    "attachment MIME type matches",
    attachment.mime_type,
    attachmentBody.mime_type,
  );
  TestValidator.predicate(
    "attachment file size matches",
    attachment.file_size === attachmentBody.file_size,
  );
  TestValidator.predicate(
    "attachment is not yet scanned",
    attachment.is_scanned === false,
  );

  // Add a second attachment to demonstrate multiple file support
  const secondAttachmentBody = {
    filename:
      `chart_${RandomGenerator.alphabets(5)}.png` satisfies IAttachmentFilename,
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10485760>
    >(),
    file_type: "image" as IEconomicDiscussionAttachmentFileType,
    mime_type: "image/png" as IMimeType,
  } satisfies IEconomicDiscussionAttachments.ICreate;

  const secondAttachment =
    await api.functional.economicDiscussion.moderator.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: secondAttachmentBody,
      },
    );
  typia.assert(secondAttachment);

  // Validate second attachment
  TestValidator.equals(
    "second attachment article ID matches",
    secondAttachment.article.id,
    article.id,
  );
  TestValidator.equals(
    "second attachment filename matches",
    secondAttachment.filename,
    secondAttachmentBody.filename,
  );
  TestValidator.equals(
    "second attachment file type matches",
    secondAttachment.file_type,
    secondAttachmentBody.file_type,
  );

  // Test with attachment limit boundary (system allows up to 5 attachments)
  const makeAdditionalAttachments = ArrayUtil.repeat(3, (index) => ({
    filename:
      `supporting_doc_${index}_${RandomGenerator.alphabets(3)}.pdf` satisfies IAttachmentFilename,
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1024> & tags.Maximum<512000>
    >(), // Between 1KB and 500KB
    file_type: "document" as IEconomicDiscussionAttachmentFileType,
    mime_type: "application/pdf" as IMimeType,
  }));

  // Create remaining attachments to reach close to the 5-attachment limit
  for (const extraAttachmentData of makeAdditionalAttachments) {
    const extraAttachment =
      await api.functional.economicDiscussion.moderator.articles.attachments.create(
        connection,
        {
          articleId: article.id,
          body: extraAttachmentData satisfies IEconomicDiscussionAttachments.ICreate,
        },
      );
    typia.assert(extraAttachment);
    TestValidator.equals(
      "extra attachment properly linked",
      extraAttachment.article.id,
      article.id,
    );
  }
}
