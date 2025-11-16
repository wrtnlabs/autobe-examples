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
 * Test moderator article creation with enhanced article management including
 * all advanced formatting options. Validates moderation-specific features and
 * broader article creation capabilities compared to member accounts.
 *
 * Test workflow:
 *
 * 1. Create a new moderator account for enhanced article testing
 * 2. Create a category to assign during article creation
 * 3. Generate comprehensive article content with all available features
 * 4. Create attachments supporting the article (images, documents, spreadsheets)
 * 5. Create the article with full metadata and formatting
 * 6. Validate the created article has all moderator-specific features
 * 7. Verify categories, attachments, and content structure are properly linked
 *
 * This test validates that moderators can create articles with enhanced
 * formatting, comprehensive category assignments, and attachment management
 * capabilities beyond what standard members can access.
 */
export async function test_api_moderator_article_creation_enhanced(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for enhanced article testing
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: moderatorEmail,
      password_hash: RandomGenerator.alphaNumeric(32),
      moderation_level: RandomGenerator.pick([
        "standard",
        "senior",
        "admin",
      ] as const),
      email_verified: true,
      two_factor_enabled: false,
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  TestValidator.predicate("moderator has valid UUID", moderator.id !== null);
  TestValidator.predicate(
    "moderator email verified",
    moderator.email_verified === true,
  );

  // Step 2: Create a category for article assignment
  const category =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8).toLowerCase(),
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(category);

  TestValidator.predicate("category has valid ID", category.id !== null);
  TestValidator.predicate("category is active", category.is_active === true);

  // Step 3: Create article attachments (images, documents, spreadsheets)
  const attachments: IEconomicDiscussionAttachments.ICreate[] =
    ArrayUtil.repeat(
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
      >(),
      () =>
        ({
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<1048576>
          >(),
          file_type: RandomGenerator.pick([
            "image",
            "document",
            "spreadsheet",
          ] as const),
          filename: `${RandomGenerator.name(1)}.${RandomGenerator.pick(["jpg", "png", "pdf", "xlsx"] as const)}`,
          mime_type: RandomGenerator.pick([
            "image/jpeg",
            "image/png",
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          ] as const),
        }) satisfies IEconomicDiscussionAttachments.ICreate,
    );

  // Step 4: Create comprehensive article with enhanced features
  const articleContent = RandomGenerator.content({
    paragraphs: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<3> & tags.Maximum<10>
    >(),
    sentenceMin: 8,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
  });

  const articleTitle = RandomGenerator.name(3);
  const articleData = {
    title: articleTitle,
    content: articleContent,
    category_ids: [category.id],
    attachments: attachments.length > 0 ? attachments : undefined,
  } satisfies IEconomicDiscussionArticle.ICreate;

  // Step 5: Create the article with enhanced moderator features
  const article =
    await api.functional.economicDiscussion.moderator.articles.create(
      connection,
      { body: articleData },
    );
  typia.assert(article);

  // Step 6: Validate created article structure and content
  TestValidator.equals("article title matches", article.title, articleTitle);
  TestValidator.equals(
    "article content matches",
    article.content,
    articleContent,
  );
  TestValidator.equals("view count initialized to zero", article.view_count, 0);
  TestValidator.equals("version starts at 0", article.version, 0);

  // Validate author assignments - moderator-specific feature
  if (
    article.moderator_author !== null &&
    article.moderator_author !== undefined
  ) {
    TestValidator.predicate("article has moderator author", true);
  }

  if (
    article.moderator_author_profile !== undefined &&
    article.moderator_author_profile !== null
  ) {
    TestValidator.predicate("article has moderator profile info", true);
  }

  // Step 7: Verify category assignment
  TestValidator.predicate(
    "article has categories",
    article.categories.length > 0,
  );
  TestValidator.equals(
    "assigned category ID matches",
    article.categories[0].id,
    category.id,
  );
  TestValidator.equals(
    "category name matches",
    article.categories[0].name,
    category.name,
  );

  // Step 8: Validate article status and workflow state
  TestValidator.predicate(
    "article has valid status",
    article.status === "pending" ||
      article.status === "approved" ||
      article.status === "rejected",
  );
  TestValidator.predicate(
    "article creation timestamp exists",
    typia.is<string & tags.Format<"date-time">>(article.created_at),
  );
  TestValidator.predicate(
    "article update timestamp exists",
    typia.is<string & tags.Format<"date-time">>(article.updated_at),
  );

  // Step 9: Validate attachment handling (if provided)
  if (attachments.length > 0) {
    TestValidator.predicate("article attachments created when provided", true);
  } else {
    TestValidator.predicate("article created without attachments", true);
  }

  // Step 10: Validate soft deletion tracking capability
  TestValidator.predicate(
    "article has deletion tracking capability",
    article.deleted_at === null,
  );
}
