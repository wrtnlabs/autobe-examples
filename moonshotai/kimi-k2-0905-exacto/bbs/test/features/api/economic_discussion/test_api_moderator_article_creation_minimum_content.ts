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

export async function test_api_moderator_article_creation_minimum_content(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphabets(5),
      email: moderatorEmail,
      password_hash: RandomGenerator.alphaNumeric(32),
      email_verified: true,
      two_factor_enabled: false,
      moderation_level: "standard",
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a category for article assignment
  const category =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphabets(8),
          name: RandomGenerator.name(2),
          description: "Test category for minimum content validation",
          display_order: 1,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create article with minimum content (1 char title, 10 char content)
  const minimalTitle = "A"; // Minimum 1 character title
  const minimalContent = RandomGenerator.alphabets(10); // Exactly 10 characters for minimum content

  const article =
    await api.functional.economicDiscussion.moderator.articles.create(
      connection,
      {
        body: {
          title: minimalTitle,
          content: minimalContent,
          category_ids: [category.id],
          attachments: undefined, // No attachments for minimum content test
        } satisfies IEconomicDiscussionArticle.ICreate,
      },
    );
  typia.assert(article);

  // Step 4: Validate the created article meets minimum requirements
  TestValidator.equals(
    "article title matches minimum length",
    article.title,
    minimalTitle,
  );
  TestValidator.equals(
    "article content meets minimum length",
    article.content,
    minimalContent,
  );
  TestValidator.predicate(
    "article has at least one category",
    article.categories.length >= 1,
  );
  TestValidator.equals("article version starts at 1", article.version, 1);
  TestValidator.equals("article status is pending", article.status, "pending");
  TestValidator.equals("article view count starts at 0", article.view_count, 0);
  TestValidator.predicate(
    "article has moderator author",
    article.moderator_author === moderator.id,
  );

  // Validate category assignment - safe check for first category
  if (article.categories.length > 0) {
    TestValidator.equals(
      "first article category ID matches",
      article.categories[0].id,
      category.id,
    );
  }
}
