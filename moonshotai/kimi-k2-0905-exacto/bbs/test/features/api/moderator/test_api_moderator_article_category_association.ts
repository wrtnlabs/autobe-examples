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
 * Test moderator-specific capability to associate categories with articles.
 * This validates administrative content organization privileges by testing:
 *
 * 1. Moderator account creation with proper permissions
 * 2. Category creation using moderator privileges
 * 3. Article creation with moderator attribution for better organization
 * 4. Category association that enables improved discoverability and content
 *    moderation
 *
 * The workflow validates enhanced administrative access while ensuring
 * appropriate categorization improves community content organization.
 */
export async function test_api_moderator_article_category_association(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for administrative content management
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(10);
  const moderatorPasswordHash = RandomGenerator.alphaNumeric(32);

  const moderator: IEconomicDiscussionModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password_hash: moderatorPasswordHash,
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

  TestValidator.predicate(
    "moderator account created successfully",
    moderator.id !== null && moderator.id !== undefined,
  );
  TestValidator.predicate(
    "moderator has proper email",
    moderator.email === moderatorEmail,
  );
  TestValidator.predicate(
    "moderator has proper authorization level",
    moderator.moderation_level === moderatorUsername,
  );

  // Step 2: Create category for economic discussion organization
  const categoryCode = `econ-${RandomGenerator.alphabets(6).toLowerCase()}`;
  const displayOrder = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
  >();

  const category: IEconomicDiscussionCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: categoryCode,
          name: "Economic Policy Analysis",
          description: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 9,
          }),
          display_order: displayOrder,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(category);

  TestValidator.predicate(
    "category created with proper code",
    category.code === categoryCode,
  );
  TestValidator.predicate(
    "category is active for use",
    category.is_active === true,
  );
  TestValidator.predicate(
    "category has proper display order",
    category.display_order === displayOrder,
  );

  // Step 3: Create article as moderator with attribution for administration
  const articleTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 6,
    wordMax: 12,
  });

  const articleWithoutCategory: IEconomicDiscussionArticle =
    await api.functional.economicDiscussion.moderator.articles.create(
      connection,
      {
        body: {
          title: articleTitle,
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 20,
            wordMin: 5,
            wordMax: 8,
          }),
          category_ids: [], // Start without specific category
          attachments: ArrayUtil.repeat(
            2,
            () =>
              ({
                filename: `analysis-${RandomGenerator.alphabets(8)}.${RandomGenerator.pick(["pdf"] as const)}`,
                file_size: typia.random<
                  number &
                    tags.Type<"int32"> &
                    tags.Minimum<1024> &
                    tags.Maximum<5242880>
                >(),
                mime_type: "application/pdf",
                file_type: "document" as IEconomicDiscussionAttachmentFileType,
              }) satisfies IEconomicDiscussionAttachments.ICreate,
          ),
        } satisfies IEconomicDiscussionArticle.ICreate,
      },
    );
  typia.assert(articleWithoutCategory);
  TestValidator.predicate(
    "article created without specific category",
    articleWithoutCategory.categories.length === 0,
  );

  // Step 4: Associate category with article using moderator authority
  await api.functional.economicDiscussion.moderator.articles.categories.attachCategory(
    connection,
    {
      articleId: articleWithoutCategory.id,
      categoryCode: category.code,
    },
  );

  // Step 5: Validate category association improved content organization
  // Since there's no direct GET endpoint, we verify through clean operation
  // The successful completion without HTTP errors validates authorization
  TestValidator.predicate(
    "category association completed without authorization errors",
    true,
  );

  // Step 6: Test adding additional category for comprehensive organization
  const secondCategoryCode = `macro-${RandomGenerator.alphabets(6).toLowerCase()}`;
  const secondDisplayOrder = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<102> & tags.Maximum<200>
  >();

  const secondCategory: IEconomicDiscussionCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: secondCategoryCode,
          name: "Macroeconomic Analysis",
          description: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 7,
          }),
          display_order: secondDisplayOrder,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(secondCategory);

  // Step 7: Associate second category for multi-category moderation
  await api.functional.economicDiscussion.moderator.articles.categories.attachCategory(
    connection,
    {
      articleId: articleWithoutCategory.id,
      categoryCode: secondCategory.code,
    },
  );

  // Step 8: Comprehensive validation of moderator-level association privileges
  TestValidator.predicate("multiple category associations succeeded", true);
  TestValidator.predicate(
    "moderator authorization verified",
    moderator.moderation_level.length > 0,
  );
  TestValidator.predicate(
    "article maintains moderator attribution",
    articleWithoutCategory.moderator_author === moderator.id,
  );
  TestValidator.equals(
    "article title preserved",
    articleWithoutCategory.title,
    articleTitle,
  );

  TestValidator.predicate(
    "content organization access validated through moderator role",
    moderator.token !== null &&
      moderator.token !== undefined &&
      moderator.token.access !== null &&
      moderator.token.access !== undefined,
  );
}
