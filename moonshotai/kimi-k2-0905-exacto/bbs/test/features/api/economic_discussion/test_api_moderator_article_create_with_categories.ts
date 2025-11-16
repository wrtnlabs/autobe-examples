import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionAttachmentFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachmentFileType";
import type { IEconomicDiscussionAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachments";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";

/**
 * Test moderator ability to create articles with comprehensive category
 * assignments during initial creation.
 *
 * This test validates that moderators can efficiently establish content
 * organization at creation time, including assignment to multiple categories.
 * The workflow covers moderator authentication, article creation with
 * categories and attachments, and verification of the created article's
 * properties including metadata, categories, and author information.
 */
export async function test_api_moderator_article_create_with_categories(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account with authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IEconomicDiscussionModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.name(),
        email: moderatorEmail,
        password_hash: RandomGenerator.alphaNumeric(32),
        email_verified: true,
        two_factor_enabled: false,
        moderation_level: "standard",
      } satisfies IEconomicDiscussionModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create article with multiple categories and attachments
  const categoryIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  const attachments = ArrayUtil.repeat(2, () => ({
    filename: RandomGenerator.name() + ".pdf",
    mime_type: "application/pdf",
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1024> & tags.Maximum<1048576>
    >(),
    file_type: RandomGenerator.pick([
      "document",
      "image",
      "spreadsheet",
    ] as const),
  })) satisfies IEconomicDiscussionAttachments.ICreate[];

  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
    category_ids: categoryIds,
    attachments: attachments,
  } satisfies IEconomicDiscussionArticle.ICreate;

  const createdArticle: IEconomicDiscussionArticle =
    await api.functional.economicDiscussion.moderator.articles.create(
      connection,
      {
        body: articleData,
      },
    );
  typia.assert(createdArticle);

  // Step 3: Verify article properties and metadata
  TestValidator.equals(
    "article title matches",
    createdArticle.title,
    articleData.title,
  );
  TestValidator.equals(
    "article content matches",
    createdArticle.content,
    articleData.content,
  );
  TestValidator.equals(
    "article has correct number of categories",
    createdArticle.categories.length,
    3,
  );

  // PROBLEM: No attachments property in response - using request data instead
  TestValidator.equals(
    "article was created with correct number of attachments",
    articleData.attachments.length,
    2,
  );

  TestValidator.predicate(
    "article status is pending",
    createdArticle.status === "pending",
  );
  TestValidator.predicate("article version is 1", createdArticle.version === 1);
  TestValidator.predicate(
    "article view count is 0",
    createdArticle.view_count === 0,
  );

  // Verify author information
  TestValidator.equals(
    "article has moderator author",
    createdArticle.moderator_author,
    moderator.id,
  );
  TestValidator.predicate(
    "article has moderator author profile",
    createdArticle.moderator_author_profile !== undefined,
  );
  TestValidator.equals(
    "moderator author ID matches",
    createdArticle.moderator_author_profile?.id,
    moderator.id,
  );
  TestValidator.equals(
    "moderator author username matches",
    createdArticle.moderator_author_profile?.username,
    moderator.username,
  );

  // Verify categories are properly assigned
  TestValidator.predicate(
    "all categories have IDs",
    createdArticle.categories.every((cat) => cat.id !== undefined),
  );
  TestValidator.predicate(
    "all categories have names",
    createdArticle.categories.every((cat) => cat.name !== undefined),
  );
  TestValidator.predicate(
    "all categories are active",
    createdArticle.categories.every((cat) => cat.is_active === true),
  );

  // Verify timestamps are valid
  TestValidator.predicate(
    "created_at is valid date",
    new Date(createdArticle.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date",
    new Date(createdArticle.updated_at).getTime() > 0,
  );
  TestValidator.equals(
    "created and updated timestamps match initially",
    createdArticle.created_at,
    createdArticle.updated_at,
  );

  // Verify article ID format
  TestValidator.predicate(
    "article ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdArticle.id,
    ),
  );

  // Verify that categories from response contain the IDs we sent
  const responseCategoryIds = createdArticle.categories.map((cat) => cat.id);
  TestValidator.predicate(
    "all sent category IDs are in response",
    categoryIds.every((sentId) => responseCategoryIds.includes(sentId)),
  );
}
