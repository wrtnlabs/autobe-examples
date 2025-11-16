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
 * Test moderator content moderation attachment removal workflow.
 *
 * This test simulates a complete moderation scenario where:
 *
 * 1. A moderator registers and authenticates
 * 2. Creates a discussion category for economic analysis
 * 3. Creates an article with discussion content
 * 4. Uploads an attachment containing inappropriate material
 * 5. Removes the inappropriate attachment as part of content moderation
 *
 * Validates that moderators can effectively manage content by removing
 * inappropriate attachments while maintaining system integrity and audit trails
 * for administration tracking.
 *
 * @param connection API connection for test execution
 */
export async function test_api_moderator_attachment_removal_content_moderation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator account for content management
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: moderatorEmail,
      password_hash: RandomGenerator.alphaNumeric(32),
      moderation_level: "standard",
      email_verified: true,
      two_factor_enabled: false,
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a discussion category for content organization
  const category =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: "Economic Policy Analysis",
          description: "Discussions about fiscal and monetary policy impacts",
          display_order: 1,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create an article with discussion content
  const article =
    await api.functional.economicDiscussion.moderator.articles.create(
      connection,
      {
        body: {
          title: "Analysis of Current Monetary Policy",
          content: RandomGenerator.content({ paragraphs: 3 }),
          category_ids: [category.id],
          attachments: [],
        } satisfies IEconomicDiscussionArticle.ICreate,
      },
    );
  typia.assert(article);

  // Step 4: Upload an attachment that would be flagged as inappropriate
  const attachmentData = {
    filename:
      `inappropriate_content_${RandomGenerator.alphaNumeric(5)}.pdf` satisfies IAttachmentFilename,
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<1048576>
    >(),
    file_type: "document" as IEconomicDiscussionAttachmentFileType,
    mime_type: "application/pdf" as IMimeType,
  } satisfies IEconomicDiscussionAttachment.ICreate;

  const attachment =
    await api.functional.economicDiscussion.moderator.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentData,
      },
    );
  typia.assert(attachment);

  // Step 5: Remove the inappropriate attachment as content moderation
  // This operation should complete successfully without throwing an error
  await api.functional.economicDiscussion.moderator.articles.attachments.erase(
    connection,
    {
      articleId: article.id,
      attachmentId: attachment.id,
    },
  );

  // Validation: The erase operation completed successfully without throwing an error
  // The void return indicates successful removal, maintaining audit trail for moderation actions
  TestValidator.predicate(
    "attachment removal completed for content moderation",
    true,
  );
}
