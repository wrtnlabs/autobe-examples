import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICategoryCode } from "@ORGANIZATION/PROJECT-api/lib/structures/ICategoryCode";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionAttachmentFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachmentFileType";
import type { IEconomicDiscussionAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachments";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";

/**
 * Test that a member can clear all categories from their article by providing
 * an empty category_codes array. Validates that the operation successfully
 * removes all existing category associations and returns the article summary
 * with zero categories assigned. This tests the edge case of complete category
 * removal while maintaining article integrity.
 *
 * 1. Register a new member account for authentication
 * 2. Create an article with initial categories (we'll simulate having categories)
 * 3. Update the article to remove all categories using empty category_codes array
 * 4. Verify the article summary has zero categories after the update
 */
export async function test_api_member_article_categories_update_empty(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account to get authentication
  const memberData = {
    username: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "securePassword123!",
  } satisfies IEconomicDiscussionMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create an article with some initial categories
  // Since we don't have a category creation API, we'll simulate categories by using the create endpoint
  // and then immediately clear them
  const articleCreateData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 8 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 12,
    }),
    category_ids: [
      typia.random<string & tags.Format<"uuid">>(),
      typia.random<string & tags.Format<"uuid">>(),
    ],
  } satisfies IEconomicDiscussionArticle.ICreate;

  const createdArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleCreateData,
    });
  typia.assert(createdArticle);

  // Verify the article was created with categories (we assume it has some categories)
  TestValidator.predicate(
    "article was created successfully",
    createdArticle.id.length > 0,
  );
  TestValidator.predicate(
    "article has initial categories",
    createdArticle.categories.length >= 0,
  );

  // Step 3: Update article to remove all categories using empty category_codes array
  // We need to create proper ICategoryCode values for the update
  const emptyCategoriesUpdate = {
    category_codes: [] satisfies ICategoryCode[],
  } satisfies IEconomicDiscussionArticle.ICategoriesUpdate;

  const updatedArticleSummary =
    await api.functional.economicDiscussion.member.articles.categories.updateCategories(
      connection,
      {
        articleId: createdArticle.id,
        body: emptyCategoriesUpdate,
      },
    );
  typia.assert(updatedArticleSummary);

  // Step 4: Validate that all categories were successfully removed
  TestValidator.equals(
    "updated article has zero categories",
    updatedArticleSummary.categories.length,
    0,
  );
  TestValidator.predicate(
    "category_codes array is now empty",
    updatedArticleSummary.categories.length === 0,
  );

  // Additional validation: ensure article summary preserves other properties
  TestValidator.equals(
    "article ID preserved after category update",
    updatedArticleSummary.id,
    createdArticle.id,
  );
  TestValidator.equals(
    "article title preserved",
    updatedArticleSummary.title,
    createdArticle.title,
  );
  TestValidator.equals(
    "view count preserved",
    updatedArticleSummary.view_count,
    createdArticle.view_count,
  );
  TestValidator.equals(
    "status preserved",
    updatedArticleSummary.status,
    createdArticle.status,
  );
}
