import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleCategory";

/**
 * Test alphabetical sorting of discussion board categories by name field.
 *
 * Validates that the category listing API correctly sorts categories by name in
 * both ascending and descending alphabetical order. This ensures users can
 * browse categories in a predictable, alphabetically organized manner.
 *
 * Process:
 *
 * 1. Create moderator account for category management permissions
 * 2. Create multiple categories with distinct alphabetically-ordered names
 * 3. Retrieve categories sorted by name ascending - validate alphabetical order
 * 4. Retrieve categories sorted by name descending - validate reverse order
 */
export async function test_api_category_sorting_by_name_alphabetically(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "securePassword123",
        username: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create categories with names designed for alphabetical sorting
  const categoryNames = ["Zebra Topic", "Apple Topic", "Mango Topic"];
  const createdCategories: IDiscussionBoardArticleCategory[] = [];

  for (let i = 0; i < categoryNames.length; i++) {
    const categoryName = categoryNames[i];
    const category: IDiscussionBoardArticleCategory =
      await api.functional.discussionBoard.moderator.categories.create(
        connection,
        {
          body: {
            name: categoryName,
            slug: categoryName.toLowerCase().replace(/\s+/g, "-"),
            description: `Category for ${categoryName} discussions`,
            sort_order: i,
          } satisfies IDiscussionBoardArticleCategory.ICreate,
        },
      );
    typia.assert(category);
    createdCategories.push(category);
  }

  // Step 3: Retrieve categories sorted by name in ascending order
  const ascendingResult: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        sort_by: "name",
        order: "asc",
      } satisfies IDiscussionBoardArticleCategory.IRequest,
    });
  typia.assert(ascendingResult);

  // Validate ascending alphabetical order: Apple, Mango, Zebra
  const expectedAscending = ["Apple Topic", "Mango Topic", "Zebra Topic"];

  // Filter to only our created categories using Set for type-safe lookup
  const categoryNameSet = new Set(categoryNames);
  const ourAscendingCategories = ascendingResult.data.filter((cat) =>
    categoryNameSet.has(cat.name),
  );

  TestValidator.equals(
    "ascending order should be Apple, Mango, Zebra",
    ourAscendingCategories.map((c) => c.name),
    expectedAscending,
  );

  // Step 4: Retrieve categories sorted by name in descending order
  const descendingResult: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        sort_by: "name",
        order: "desc",
      } satisfies IDiscussionBoardArticleCategory.IRequest,
    });
  typia.assert(descendingResult);

  // Validate descending alphabetical order: Zebra, Mango, Apple
  const expectedDescending = ["Zebra Topic", "Mango Topic", "Apple Topic"];

  // Filter to only our created categories
  const ourDescendingCategories = descendingResult.data.filter((cat) =>
    categoryNameSet.has(cat.name),
  );

  TestValidator.equals(
    "descending order should be Zebra, Mango, Apple",
    ourDescendingCategories.map((c) => c.name),
    expectedDescending,
  );
}
