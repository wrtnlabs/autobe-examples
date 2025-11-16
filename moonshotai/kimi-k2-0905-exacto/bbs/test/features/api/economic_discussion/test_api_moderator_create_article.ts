import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionAttachmentFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachmentFileType";
import type { IEconomicDiscussionAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachments";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";

/**
 * Test moderator article creation workflow for economic discussion platform.
 *
 * This test validates the complete moderator workflow for creating economic and
 * political discussion articles with administrative privileges. It establishes
 * proper authentication, creates discussion categories for content
 * organization, and tests comprehensive article creation with markdown support
 * and file attachments.
 *
 * The test verifies moderator can:
 *
 * 1. Create moderator account with proper authentication credentials
 * 2. Establish discussion categories for content taxonomy
 * 3. Publish articles with economic analysis and political insights
 * 4. Organize content through proper categorization
 * 5. Handle file attachments with specified constraints
 * 6. Ensure moderation workflow initialization and version control
 *
 * Articles automatically receive version 1.0 and pending status for moderation
 * review, supporting community content standards enforcement.
 */
export async function test_api_moderator_create_article(
  connection: api.IConnection,
) {
  // 1. Register moderator account for administrative access
  const moderatorCreateBody = {
    username: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    email_verified: true,
    two_factor_enabled: false,
    moderation_level: "standard",
  } satisfies IEconomicDiscussionModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorCreateBody,
  });
  typia.assert(moderator);

  TestValidator.equals(
    "moderator authentication response includes tokens",
    typeof moderator.token.access,
    "string",
  );
  TestValidator.equals(
    "moderator has standard moderation level",
    moderator.moderation_level,
    "standard",
  );

  // 2. Create discussion category for content organization
  const categoryCode = RandomGenerator.alphabets(8);
  const categoryCreateBody = {
    code: categoryCode,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: 1,
    is_active: true,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const category =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  TestValidator.equals(
    "category code matches creation input",
    category.code,
    categoryCode,
  );
  TestValidator.equals(
    "category is active upon creation",
    category.is_active,
    true,
  );

  // 3. Create economic discussion article with file attachments
  const articleContent = RandomGenerator.content({
    paragraphs: 4,
    sentenceMin: 10,
    sentenceMax: 15,
  });
  const articleTitle = RandomGenerator.paragraph({ sentences: 2 });

  const attachmentTypes: IEconomicDiscussionAttachmentFileType[] = [
    "image",
    "document",
    "spreadsheet",
  ];
  const attachments = ArrayUtil.repeat(
    typia.random<number & tags.Type<"uint32"> & tags.Maximum<2>>(),
    () => ({
      filename: RandomGenerator.name(1) + "-report.pdf",
      mime_type: "application/pdf",
      file_size: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1024> & tags.Maximum<1048576>
      >(),
      file_type: RandomGenerator.pick(attachmentTypes),
    }),
  );

  const articleCreateBody = {
    title: articleTitle,
    content: articleContent,
    category_ids: [category.id],
    attachments: attachments,
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article =
    await api.functional.economicDiscussion.moderator.articles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(article);

  // 4. Validate article creation response
  TestValidator.equals(
    "article title matches creation input",
    article.title,
    articleTitle,
  );
  TestValidator.equals(
    "article content matches creation input",
    article.content,
    articleContent,
  );
  TestValidator.equals(
    "article status is pending for moderation",
    article.status,
    "pending",
  );
  TestValidator.equals("article version starts at 1.0", article.version, 1);
  TestValidator.equals("view count initializes to zero", article.view_count, 0);

  // 5. Validate article associations and metadata
  TestValidator.equals(
    "article belongs to created category",
    article.categories.length,
    1,
  );
  TestValidator.equals(
    "category details match creation",
    article.categories[0].id,
    category.id,
  );
  TestValidator.equals(
    "moderator author linked through UUID",
    article.moderator_author,
    moderator.id,
  );

  // 6. Validate timestamps are properly set
  TestValidator.predicate(
    "created_at timestamp is valid ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(article.created_at),
  );
  TestValidator.predicate(
    "updated_at timestamp is after or equal to created_at",
    new Date(article.updated_at).getTime() >=
      new Date(article.created_at).getTime(),
  );
}
