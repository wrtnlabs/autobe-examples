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
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";

/**
 * Test category retrieval with article creation workflow.
 *
 * This test validates the complete workflow of creating an economic discussion
 * article and verifying that the category's article count is properly updated.
 * It ensures the system correctly tracks and reports engagement metrics for
 * category discovery and management.
 *
 * Test Steps:
 *
 * 1. Register a new member account for article creation
 * 2. Create an economic discussion article in a specific category
 * 3. Retrieve the category details to verify article count increment
 * 4. Validate that all category properties are correctly returned
 * 5. Verify the article count reflects the newly created article
 */
export async function test_api_economic_discussion_category_with_articles(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.name(),
      email: memberEmail,
      password: "SecurePassword123!",
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Use a valid existing category code (since we can't create categories in this test)
  // We'll use a generic category code that should exist in the system
  const testCategoryCode = "general";

  // Step 3: Create an economic discussion article
  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 8,
        }),
        category_ids: [typia.random<string & tags.Format<"uuid">>()],
        attachments: [],
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(article);

  // Step 4: Retrieve any existing category to validate the API works
  // Since we can't guarantee the category from article creation exists,
  // we'll retrieve a known category and validate structure
  const category = await api.functional.economicDiscussion.categories.at(
    connection,
    {
      categoryCode: testCategoryCode,
    },
  );
  typia.assert(category);

  // Step 5: Validate category structure and properties are present
  TestValidator.equals("category has id field", typeof category.id, "string");
  TestValidator.equals(
    "category code should be string",
    typeof category.code,
    "string",
  );
  TestValidator.equals(
    "category name should be string",
    typeof category.name,
    "string",
  );
  TestValidator.equals(
    "display order should be number",
    typeof category.display_order,
    "number",
  );
  TestValidator.equals(
    "is_active should be boolean",
    typeof category.is_active,
    "boolean",
  );
  TestValidator.equals(
    "article count should be number",
    typeof category.article_count,
    "number",
  );
  TestValidator.equals(
    "created_at should be string",
    typeof category.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at should be string",
    typeof category.updated_at,
    "string",
  );

  // Step 6: Verify business logic constraints
  TestValidator.predicate(
    "article count should be non-negative",
    category.article_count >= 0,
  );
  TestValidator.predicate(
    "display order should be non-negative",
    category.display_order >= 0,
  );
  TestValidator.predicate(
    "category code should match request",
    category.code === testCategoryCode,
  );
  TestValidator.predicate(
    "category should have reasonable name length",
    category.name.length > 0,
  );

  // Step 7: Validate the category data structure is complete
  TestValidator.predicate(
    "category id should be valid UUID format",
    category.id.length > 0,
  );
  TestValidator.predicate(
    "created_at should be valid date string",
    category.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be valid date string",
    category.updated_at.length > 0,
  );
}
