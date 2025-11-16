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
 * Test category update validation by attempting to assign duplicate category
 * codes. Verify that the operation handles duplicate entries appropriately and
 * maintains data integrity in the category-article relationship table,
 * preventing duplicate associations in the junction table.
 *
 * This test ensures that the category update mechanism properly deduplicates
 * category codes and maintains referential integrity while preventing duplicate
 * category-article associations.
 */
export async function test_api_member_article_categories_update_validation(
  connection: api.IConnection,
) {
  // 1. Register a new member for authentication
  const memberData = {
    username: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
  } satisfies IEconomicDiscussionMember.ICreate;

  const member: IEconomicDiscussionMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(member);

  // 2. Test updating categories with duplicate codes
  const categoryCodes: ICategoryCode[] = [
    "ECONOMICS",
    "POLITICS",
    "ECONOMICS", // Duplicate
    "FINANCE",
    "POLITICS", // Duplicate
    "MARKETS",
  ];

  const duplicatedCategories = {
    category_codes: categoryCodes,
  } satisfies IEconomicDiscussionArticle.ICategoriesUpdate;

  // Test the category update API (this will validate the duplicate handling)
  const articleSummary: IEconomicDiscussionArticle.ISummary =
    await api.functional.economicDiscussion.member.articles.categories.updateCategories(
      connection,
      {
        articleId: typia.random<string & tags.Format<"uuid">>(),
        body: duplicatedCategories,
      },
    );

  typia.assert(articleSummary);

  // 3. Verify deduplication logic
  const uniqueCodes = [...new Set(categoryCodes)];
  TestValidator.predicate(
    "categories should be deduplicated when duplicates are provided",
    articleSummary.categories.length <= uniqueCodes.length,
  );

  // 4. Test with entirely unique categories
  const uniqueCategoryCodes: ICategoryCode[] = [
    "ECONOMICS",
    "POLITICS",
    "FINANCE",
    "MARKETS",
    "TECHNOLOGY",
  ];

  const uniqueCategories = {
    category_codes: uniqueCategoryCodes,
  } satisfies IEconomicDiscussionArticle.ICategoriesUpdate;

  const articleWithUnique: IEconomicDiscussionArticle.ISummary =
    await api.functional.economicDiscussion.member.articles.categories.updateCategories(
      connection,
      {
        articleId: typia.random<string & tags.Format<"uuid">>(),
        body: uniqueCategories,
      },
    );

  typia.assert(articleWithUnique);

  // Verify unique categories are preserved
  TestValidator.equals(
    "unique categories should all be preserved",
    articleWithUnique.categories.length,
    uniqueCategoryCodes.length,
  );

  // 5. Test edge case with completely empty categories
  const emptyCategories = {
    category_codes: [],
  } satisfies IEconomicDiscussionArticle.ICategoriesUpdate;

  const articleEmpty: IEconomicDiscussionArticle.ISummary =
    await api.functional.economicDiscussion.member.articles.categories.updateCategories(
      connection,
      {
        articleId: typia.random<string & tags.Format<"uuid">>(),
        body: emptyCategories,
      },
    );

  typia.assert(articleEmpty);

  TestValidator.equals(
    "empty categories should clear all associations",
    articleEmpty.categories.length,
    0,
  );

  // 6. Test boundary condition - maximum allowed categories (10)
  const maxAllowedCategories: ICategoryCode[] = ArrayUtil.repeat(
    10,
    (i) => `CAT${i}` as ICategoryCode,
  );

  const maxCategoriesBody = {
    category_codes: maxAllowedCategories,
  } satisfies IEconomicDiscussionArticle.ICategoriesUpdate;

  const articleMaxCategories: IEconomicDiscussionArticle.ISummary =
    await api.functional.economicDiscussion.member.articles.categories.updateCategories(
      connection,
      {
        articleId: typia.random<string & tags.Format<"uuid">>(),
        body: maxCategoriesBody,
      },
    );

  typia.assert(articleMaxCategories);

  TestValidator.equals(
    "maximum categories should be accepted",
    articleMaxCategories.categories.length,
    10,
  );

  // 7. Verify that duplicate handling preserves category order and structure
  const orderedDuplicates: ICategoryCode[] = [
    "FINANCE", // First mention
    "ECONOMICS", // First mention
    "FINANCE", // Duplicate - should be ignored
    "POLITICS", // First mention
    "ECONOMICS", // Duplicate - should be ignored
    "MARKETS", // First mention
    "FINANCE", // Duplicate - should be ignored
  ];

  const orderedCategories = {
    category_codes: orderedDuplicates,
  } satisfies IEconomicDiscussionArticle.ICategoriesUpdate;

  const articleOrdered: IEconomicDiscussionArticle.ISummary =
    await api.functional.economicDiscussion.member.articles.categories.updateCategories(
      connection,
      {
        articleId: typia.random<string & tags.Format<"uuid">>(),
        body: orderedCategories,
      },
    );

  typia.assert(articleOrdered);

  // Verify order is maintained for first occurrences
  const expectedUniqueOrder = ["FINANCE", "ECONOMICS", "POLITICS", "MARKETS"];
  const actualCategoryCodes = articleOrdered.categories.map((cat) => cat.code);

  TestValidator.equals(
    "category order should be preserved for first occurrences",
    actualCategoryCodes,
    expectedUniqueOrder,
  );
}
