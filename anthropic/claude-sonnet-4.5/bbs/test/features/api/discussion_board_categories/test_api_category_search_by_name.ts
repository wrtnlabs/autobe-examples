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
 * Test category search functionality using text search.
 *
 * This test validates the category search API by creating multiple categories
 * with distinct names and then searching for them using partial name matches.
 * It verifies that:
 *
 * 1. Only matching categories are returned in search results
 * 2. Case-insensitive search behavior works correctly
 * 3. Pagination structure is maintained in search results
 *
 * Test workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create multiple categories with distinct searchable names
 * 3. Search for categories using partial name matches
 * 4. Validate that only matching categories are returned
 * 5. Test case-insensitive search behavior
 */
export async function test_api_category_search_by_name(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePassword123!",
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create multiple categories with distinct names
  const economicCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Discussion",
          slug: "economic-discussion",
          description:
            "Discussions about economic policies, markets, and fiscal topics",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(economicCategory);

  const politicalCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Political Discussion",
          slug: "political-discussion",
          description:
            "Discussions about governance, elections, and political systems",
          sort_order: 2,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(politicalCategory);

  const generalCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "General Discussion",
          slug: "general-discussion",
          description: "General discussions on various topics",
          sort_order: 3,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(generalCategory);

  // Step 3: Search for categories using partial name match "Economic"
  const economicSearchResult: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        search: "Economic",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticleCategory.IRequest,
    });
  typia.assert(economicSearchResult);

  // Step 4: Validate that only matching category is returned
  TestValidator.predicate(
    "economic search should return at least one result",
    economicSearchResult.data.length >= 1,
  );

  const foundEconomicCategory = economicSearchResult.data.find(
    (cat) => cat.id === economicCategory.id,
  );
  typia.assertGuard(foundEconomicCategory!);

  TestValidator.equals(
    "found category name matches created category",
    foundEconomicCategory.name,
    economicCategory.name,
  );

  // Step 5: Test case-insensitive search with lowercase
  const lowercaseSearchResult: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        search: "economic",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticleCategory.IRequest,
    });
  typia.assert(lowercaseSearchResult);

  TestValidator.predicate(
    "lowercase search should return results",
    lowercaseSearchResult.data.length >= 1,
  );

  const foundLowercaseCategory = lowercaseSearchResult.data.find(
    (cat) => cat.id === economicCategory.id,
  );
  typia.assertGuard(foundLowercaseCategory!);

  TestValidator.equals(
    "case-insensitive search returns same category",
    foundLowercaseCategory.id,
    economicCategory.id,
  );

  // Step 6: Search with "Discussion" to get multiple results
  const discussionSearchResult: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        search: "Discussion",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticleCategory.IRequest,
    });
  typia.assert(discussionSearchResult);

  TestValidator.predicate(
    "discussion search should return multiple results",
    discussionSearchResult.data.length >= 3,
  );

  // Verify all three created categories are in the results
  const createdCategoryIds = [
    economicCategory.id,
    politicalCategory.id,
    generalCategory.id,
  ];
  const foundCategoryIds = discussionSearchResult.data.map((cat) => cat.id);

  for (const categoryId of createdCategoryIds) {
    TestValidator.predicate(
      "search results should include created category",
      foundCategoryIds.includes(categoryId),
    );
  }

  // Step 7: Validate pagination structure
  TestValidator.predicate(
    "pagination current page should be 1",
    discussionSearchResult.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit should be set",
    discussionSearchResult.pagination.limit === 20,
  );

  TestValidator.predicate(
    "pagination records should match data length",
    discussionSearchResult.pagination.records >=
      discussionSearchResult.data.length,
  );
}
