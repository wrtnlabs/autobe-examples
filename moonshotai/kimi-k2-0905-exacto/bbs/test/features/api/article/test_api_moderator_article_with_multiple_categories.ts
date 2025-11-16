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
 * Test moderator creates article assigned to multiple categories
 * simultaneously.
 *
 * This comprehensive test validates the multi-category article functionality
 * where economic discussion articles can be organized under multiple categories
 * for enhanced discoverability and cross-topic visibility. The test establishes
 * proper many-to-many relationships between articles and categories.
 *
 * Testing workflow:
 *
 * 1. Create moderator account with appropriate administrative privileges
 * 2. Create first discussion category for economics content
 * 3. Create second discussion category for political analysis
 * 4. Publish article assigned to both categories simultaneously
 * 5. Validate proper category association and cross-category indexing
 * 6. Verify article metadata includes multiple category references
 *
 * @param connection API connection context for test execution
 */
export async function test_api_moderator_article_with_multiple_categories(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator account for administrative access
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorRequest = {
    username: RandomGenerator.name(),
    email: moderatorEmail,
    password_hash: RandomGenerator.alphaNumeric(32),
    moderation_level: RandomGenerator.pick([
      "standard",
      "senior",
      "admin",
    ] as const),
    email_verified: true,
    two_factor_enabled: false,
  } satisfies IEconomicDiscussionModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorRequest,
  });
  typia.assert(moderator);

  // Step 2: Create first category for economic policy discussions
  const firstCategoryData = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: 1,
    is_active: true,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const firstCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: firstCategoryData,
      },
    );
  typia.assert(firstCategory);

  // Step 3: Create second category for political analysis discussions
  const secondCategoryData = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: 2,
    is_active: true,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const secondCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: secondCategoryData,
      },
    );
  typia.assert(secondCategory);

  // Step 4: Create article with multiple category assignments
  const articleTitle = RandomGenerator.name(3);
  const articleContent = RandomGenerator.content({
    paragraphs: 4,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });

  const articleData = {
    title: articleTitle,
    content: articleContent,
    category_ids: [firstCategory.id, secondCategory.id],
    attachments: ArrayUtil.repeat(
      typia.random<number & tags.Type<"uint32"> & tags.Maximum<3>>(),
      () => ({
        filename: `${RandomGenerator.name(1)}.${RandomGenerator.pick(["pdf", "docx", "xlsx"])}`,
        file_size: typia.random<
          number &
            tags.Type<"int32"> &
            tags.Minimum<1000000> &
            tags.Maximum<9000000>
        >(),
        file_type: RandomGenerator.pick<IEconomicDiscussionAttachmentFileType>([
          "document",
          "spreadsheet",
        ] as const),
        mime_type: RandomGenerator.pick([
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ] as const),
      }),
    ),
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article =
    await api.functional.economicDiscussion.moderator.articles.create(
      connection,
      {
        body: articleData,
      },
    );
  typia.assert(article);

  // Step 5: Validate proper multi-category association
  TestValidator.equals(
    "article has correct title",
    article.title,
    articleTitle,
  );
  TestValidator.equals(
    "article has correct content",
    article.content,
    articleContent,
  );
  TestValidator.equals(
    "article has both categories assigned",
    article.categories.length,
    2,
  );

  // Step 6: Verify category details and relationships
  const categoryIds = article.categories.map((cat) => cat.id);
  TestValidator.predicate(
    "first category properly associated",
    ArrayUtil.has(categoryIds, (id) => id === firstCategory.id),
  );
  TestValidator.predicate(
    "second category properly associated",
    ArrayUtil.has(categoryIds, (id) => id === secondCategory.id),
  );

  // Step 7: Validate cross-category functionality
  TestValidator.equals("article version initialized", article.version, 1);
  TestValidator.equals("article view count initialized", article.view_count, 0);
  TestValidator.equals("article status is pending", article.status, "pending");
  TestValidator.predicate(
    "article has moderator author",
    article.moderator_author !== null,
  );
  TestValidator.equals(
    "article moderator author matches",
    article.moderator_author,
    moderator.id,
  );

  // Step 8: Verify category metadata for discoverability
  article.categories.forEach((category) => {
    TestValidator.predicate(
      "category has valid ID",
      typia.is<string & tags.Format<"uuid">>(category.id),
    );
    TestValidator.predicate(
      "category has valid code",
      category.code.length > 0,
    );
    TestValidator.predicate(
      "category has valid name",
      category.name.length > 0,
    );
    TestValidator.predicate(
      "category has display order",
      category.display_order >= 0,
    );
    TestValidator.predicate(
      "category has article count",
      category.article_count >= 0,
    );
  });
}
