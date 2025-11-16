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
 * Test successful article creation by authenticated moderator.
 *
 * This comprehensive test validates the complete moderator article creation
 * workflow, ensuring moderators can create economic discussion articles with
 * proper categorization and optional attachments. The test follows business
 * logic: moderator registration, category creation (prerequisite), and article
 * creation with realistic economic/political discussion content. Verifies that
 * moderators bypass member restrictions and can publish directly with proper
 * attribution.
 */
export async function test_api_moderator_article_creation(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authentication
  const moderatorData = {
    username: RandomGenerator.alphabets(10),
    email:
      RandomGenerator.name(1).toLowerCase() +
      "@" +
      RandomGenerator.name(1).toLowerCase() +
      ".com",
    password_hash: RandomGenerator.alphaNumeric(32),
    two_factor_enabled: false,
    email_verified: true,
    moderation_level: RandomGenerator.pick([
      "standard",
      "senior",
      "admin",
    ] as const),
  } satisfies IEconomicDiscussionModerator.ICreate;

  const moderatorAccount = await api.functional.auth.moderator.join(
    connection,
    {
      body: moderatorData,
    },
  );
  typia.assert(moderatorAccount);

  // Validate moderator authentication was successful
  TestValidator.predicate(
    "moderator account created successfully",
    moderatorAccount.email === moderatorData.email &&
      moderatorAccount.username === moderatorData.username,
  );

  // Step 2: Create required category for article organization
  const categoryCode = RandomGenerator.alphabets(6).toLowerCase();
  const categoryData = {
    code: categoryCode,
    name: "Economic Policy Discussion",
    description:
      "In-depth analysis and discussion of economic policy issues, market trends, and fiscal decisions",
    display_order: 1,
    is_active: true,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const category =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Verify category was created with correct data
  TestValidator.equals("category code matches", category.code, categoryCode);
  TestValidator.equals(
    "category name matches",
    category.name,
    categoryData.name,
  );
  TestValidator.predicate("category is active", category.is_active === true);

  // Step 3: Create article with comprehensive content and attachments
  const articleContent = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 8,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 10,
  });

  // Generate realistic article title
  const articleTitle =
    "Analysis of Current Monetary Policy Impact on Economic Growth";

  // Generate optional file attachments
  const attachments = ArrayUtil.repeat(
    typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
    >(),
    (i) => {
      const fileTypes = ["document", "image", "spreadsheet"] as const;
      const fileType = fileTypes[i % fileTypes.length];
      const extensions = { document: "pdf", image: "jpg", spreadsheet: "xlsx" };
      const mimeTypes = {
        document: "application/pdf",
        image: "image/jpeg",
        spreadsheet:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };

      const attachment = {
        file_size: typia.random<
          number &
            tags.Type<"int32"> &
            tags.Minimum<2000> &
            tags.Maximum<200000>
        >(),
        file_type: fileType,
        filename:
          "economics_data_" +
          RandomGenerator.alphaNumeric(8) +
          "." +
          extensions[fileType],
        mime_type: mimeTypes[fileType],
      } satisfies IEconomicDiscussionAttachments.ICreate;

      return attachment;
    },
  );

  const articleData = {
    title: articleTitle,
    content: articleContent,
    category_ids: [category.id],
    attachments: attachments.length > 0 ? attachments : undefined,
  } satisfies IEconomicDiscussionArticle.ICreate;

  // Create the article
  const createdArticle =
    await api.functional.economicDiscussion.moderator.articles.create(
      connection,
      {
        body: articleData,
      },
    );
  typia.assert(createdArticle);

  // Step 4: Validate article creation results
  TestValidator.equals(
    "article title matches",
    createdArticle.title,
    articleTitle,
  );
  TestValidator.equals(
    "article content matches",
    createdArticle.content,
    articleContent,
  );
  TestValidator.predicate(
    "article has one category",
    createdArticle.categories.length === 1,
  );
  TestValidator.equals(
    "article assigned to correct category",
    createdArticle.categories[0].id,
    category.id,
  );
  TestValidator.equals("article version is 1", createdArticle.version, 1);
  TestValidator.equals(
    "article initial view count is 0",
    createdArticle.view_count,
    0,
  );
  TestValidator.equals(
    "article status is pending",
    createdArticle.status,
    "pending",
  );

  // Validate moderator author attribution
  TestValidator.predicate(
    "article has moderator author ID",
    createdArticle.moderator_author === moderatorAccount.id,
  );
  TestValidator.predicate(
    "article has moderator author profile",
    createdArticle.moderator_author_profile !== undefined &&
      createdArticle.moderator_author_profile.id === moderatorAccount.id,
  );
  TestValidator.equals(
    "article author username matches",
    createdArticle.moderator_author_profile!.username,
    moderatorData.username,
  );

  // Validate timestamps are set correctly
  TestValidator.predicate(
    "article has created_at timestamp",
    createdArticle.created_at !== null && createdArticle.created_at.length > 0,
  );
  TestValidator.predicate(
    "article has updated_at timestamp",
    createdArticle.updated_at !== null && createdArticle.updated_at.length > 0,
  );
  TestValidator.equals(
    "article created and updated timestamps should match initially",
    createdArticle.created_at,
    createdArticle.updated_at,
  );

  // Validate that member_author is null for moderator-created articles
  TestValidator.equals(
    "member_author should be null for moderator articles",
    createdArticle.member_author,
    null,
  );

  TestValidator.equals(
    "member_author_profile should be undefined for moderator articles",
    createdArticle.member_author_profile,
    undefined,
  );
}
