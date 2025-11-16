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
 * Test complete workflow where a moderator creates a new economic discussion
 * article with proper categorization. This scenario validates the full article
 * creation process from authentication through content publication with
 * category assignments. The test creates a moderator account, establishes a
 * category, then creates an article with comprehensive economic analysis
 * content and proper title, assigning it to the created category. Validates
 * that moderators can publish content undergoing appropriate moderation
 * workflow including version tracking and status management.
 */
export async function test_api_moderator_article_creation_with_categories(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for article creation privileges
  const moderator_data = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    moderation_level: "standard",
    email_verified: true,
    two_factor_enabled: false,
  } satisfies IEconomicDiscussionModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderator_data,
  });
  typia.assert(moderator);

  // Step 2: Create a discussion category for content organization
  const category_data = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
    is_active: true,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const category =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: category_data,
      },
    );
  typia.assert(category);

  // Step 3: Create economic discussion article with proper categorization
  const article_data = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    content: RandomGenerator.content({
      paragraphs: 5,
      sentenceMin: 15,
      sentenceMax: 25,
      wordMin: 4,
      wordMax: 8,
    }),
    category_ids: [category.id],
    attachments: ArrayUtil.repeat(
      typia.random<number & tags.Type<"uint32"> & tags.Maximum<3>>(),
      () => {
        return {
          filename: RandomGenerator.paragraph({ sentences: 2 }),
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1024> &
              tags.Maximum<5242880>
          >(),
          file_type: RandomGenerator.pick([
            "image",
            "document",
            "spreadsheet",
          ] as const),
          mime_type: "application/pdf",
        } satisfies IEconomicDiscussionAttachments.ICreate;
      },
    ),
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article =
    await api.functional.economicDiscussion.moderator.articles.create(
      connection,
      {
        body: article_data,
      },
    );
  typia.assert(article);

  // Step 4: Validate article creation with correct categorization
  TestValidator.equals(
    "article has correct category count",
    article.categories.length,
    1,
  );
  TestValidator.equals(
    "article category ID matches",
    article.categories[0].id,
    category.id,
  );
  TestValidator.predicate(
    "article has pending status",
    article.status === "pending",
  );
  TestValidator.predicate("article version is 1", article.version === 1);
  TestValidator.predicate(
    "view count initialized to zero",
    article.view_count === 0,
  );

  // Additional validation for comprehensive testing
  TestValidator.predicate(
    "article title matches",
    article.title === article_data.title,
  );
  TestValidator.predicate(
    "article content matches",
    article.content === article_data.content,
  );
  TestValidator.predicate(
    "article has author profile",
    article.moderator_author_profile !== undefined,
  );
  TestValidator.predicate(
    "moderator author ID matches",
    article.moderator_author_profile?.id === moderator.id,
  );
}
