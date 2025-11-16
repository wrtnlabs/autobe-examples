import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICategoryCode } from "@ORGANIZATION/PROJECT-api/lib/structures/ICategoryCode";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";

/**
 * Test maximum category assignment to article (10 categories limit).
 *
 * This test validates that a member can successfully assign the maximum allowed
 * number of categories (10) to an economic discussion article. The operation
 * manages many-to-many relationships through the junction table, replacing all
 * existing categories with the new set. This ensures the system handles bulk
 * category assignments correctly while respecting the 10-category maximum
 * constraint.
 *
 * Test workflow:
 *
 * 1. Register as a new member to get authentication
 * 2. Generate exactly 10 unique category codes
 * 3. Update an article with the maximum 10 categories
 * 4. Verify the response contains all assigned categories
 * 5. Validate the article summary shows correct category count
 */
export async function test_api_member_article_categories_update_maximum(
  connection: api.IConnection,
) {
  // Step 1: Register as a new member to establish authentication
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(memberAuth);

  // Step 2: Generate exactly 10 unique category codes for maximum assignment
  const maxCategories = ArrayUtil.repeat(
    10,
    (index) =>
      `CAT_${RandomGenerator.alphaNumeric(8)}_${index}` as ICategoryCode,
  );

  // Step 3: Create article category update request with maximum 10 categories
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const updatedArticle =
    await api.functional.economicDiscussion.member.articles.categories.updateCategories(
      connection,
      {
        articleId,
        body: {
          category_codes: maxCategories,
        } satisfies IEconomicDiscussionArticle.ICategoriesUpdate,
      },
    );
  typia.assert(updatedArticle);

  // Step 4: Verify response contains exactly 10 categories
  TestValidator.equals(
    "article has 10 categories",
    updatedArticle.categories.length,
    10,
  );

  // Step 5: Validate all assigned categories are present in response
  const responseCategoryCodes = updatedArticle.categories.map(
    (cat) => cat.code,
  );
  TestValidator.equals(
    "all category codes match",
    responseCategoryCodes.sort(),
    maxCategories.sort(),
  );

  // Step 6: Verify article metadata is correctly updated
  TestValidator.predicate(
    "article has valid ID",
    updatedArticle.id === articleId,
  );
  TestValidator.predicate(
    "article has creation timestamp",
    !!updatedArticle.created_at,
  );
  TestValidator.predicate(
    "article has update timestamp",
    !!updatedArticle.updated_at,
  );
}
