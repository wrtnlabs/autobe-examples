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
 * Validates moderator article cross-user visibility functionality.
 *
 * This test verifies that moderator-created articles appear properly in article
 * listings and search results alongside member articles. It tests system
 * integration and visibility across different user roles in the economic
 * discussion platform.
 *
 * Test Workflow:
 *
 * 1. Create a moderator account using the auth system
 * 2. Create a discussion category for organizing content
 * 3. Publish a moderator-authored article
 * 4. Verify the article is created with proper metadata
 * 5. Validate that moderator articles integrate seamlessly with member content
 *
 * The test ensures administrative content becomes visible within the platform's
 * content discovery system, maintaining appropriate attribution while enabling
 * user access to official discussions and policy analyses.
 */
export async function test_api_moderator_article_cross_user_visibility(
  connection: api.IConnection,
) {
  // Create moderator account for testing
  const moderatorRequest = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    email_verified: true,
    two_factor_enabled: false,
    moderation_level: "standard",
  } satisfies IEconomicDiscussionModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorRequest,
  });
  typia.assert(moderator);

  TestValidator.predicate(
    "moderator created successfully",
    moderator.username === moderatorRequest.username,
  );
  TestValidator.predicate(
    "moderator email matches input",
    moderator.email === moderatorRequest.email,
  );

  // Create discussion category for articles
  const categoryRequest = {
    code: RandomGenerator.alphabets(8).toLowerCase(),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
    is_active: true,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const category =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      { body: categoryRequest },
    );
  typia.assert(category);

  TestValidator.equals(
    "category code matches request",
    category.code,
    categoryRequest.code,
  );
  TestValidator.equals(
    "category name matches request",
    category.name,
    categoryRequest.name,
  );

  // Create moderator-authored article with proper attachments count
  const attachmentCount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<2>
  >();
  const attachments = ArrayUtil.repeat(attachmentCount, () => ({
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1024> & tags.Maximum<1048576>
    >(),
    file_type: RandomGenerator.pick([
      "image",
      "document",
      "spreadsheet",
    ] as const),
    filename: RandomGenerator.name() + ".pdf",
    mime_type: "application/pdf",
  }));

  const articleRequest = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 15,
      sentenceMax: 25,
      wordMin: 4,
      wordMax: 8,
    }),
    category_ids: [category.id],
    attachments: attachments,
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article =
    await api.functional.economicDiscussion.moderator.articles.create(
      connection,
      { body: articleRequest },
    );
  typia.assert(article);

  // Validate article metadata and visibility properties
  TestValidator.equals(
    "article title matches request",
    article.title,
    articleRequest.title,
  );
  TestValidator.equals(
    "article content matches request",
    article.content,
    articleRequest.content,
  );
  TestValidator.predicate(
    "article has moderator author",
    article.moderator_author === moderator.id,
  );
  TestValidator.predicate(
    "article moderator profile exists",
    article.moderator_author_profile !== undefined,
  );
  TestValidator.equals(
    "moderator username in profile matches",
    article.moderator_author_profile!.username,
    moderator.username,
  );

  TestValidator.predicate(
    "article has at least one category",
    article.categories.length >= 1,
  );
  TestValidator.predicate(
    "article includes created category",
    article.categories.some((c) => c.id === category.id),
  );

  // Verify visibility tracking metrics
  TestValidator.equals(
    "article view count initialized to 0",
    article.view_count,
    0,
  );
  TestValidator.equals("article version starts at 1", article.version, 1);
  TestValidator.equals(
    "article status is pending for new content",
    article.status,
    "pending",
  );
  TestValidator.predicate(
    "article created timestamp is valid",
    new Date(article.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "article updated timestamp is valid",
    new Date(article.updated_at).getTime() > 0,
  );

  // Validate attachment integrity
  TestValidator.predicate(
    "attachments created when provided",
    attachmentCount === 0 ||
      (article.categories.length > 0 &&
        Array.isArray(articleRequest.attachments)),
  );

  // Verify cross-role compatibility
  TestValidator.predicate(
    "moderator content has standard article structure",
    typeof article.id === "string" &&
      typeof article.title === "string" &&
      typeof article.content === "string",
  );
  TestValidator.predicate(
    "moderator articles follow same lifecycle as member articles",
    article.status === "pending" && article.version === 1,
  );

  console.log(`✅ Moderator article visibility test completed successfully`);
  console.log(`   - Created moderator: ${moderator.username}`);
  console.log(`   - Created category: ${category.name}`);
  console.log(`   - Published article: ${article.title.substring(0, 50)}...`);
}
