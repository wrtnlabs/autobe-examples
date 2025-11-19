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
 * Test category search functionality using description text matching.
 *
 * This test validates that the category search API correctly performs partial
 * matching on category descriptions. The test creates categories with detailed
 * descriptions containing specific keywords, then searches using those keywords
 * to verify that matching categories are returned.
 *
 * Test Flow:
 *
 * 1. Register a moderator account for category creation privileges
 * 2. Create multiple categories with keyword-rich descriptions
 * 3. Perform search using description keywords
 * 4. Validate that categories with matching descriptions are returned
 * 5. Verify partial matching works correctly
 */
export async function test_api_category_search_by_description(
  connection: api.IConnection,
) {
  // Step 1: Register moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create categories with specific keyword-rich descriptions
  const economicsCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Discussion",
          slug: "economic-discussion",
          description:
            "Discussions about fiscal policy, economic markets, and trade agreements",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(economicsCategory);

  const politicsCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Political Discussion",
          slug: "political-discussion",
          description:
            "Debates on governance, elections, and political systems worldwide",
          sort_order: 2,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(politicsCategory);

  const technologyCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Technology Discussion",
          slug: "technology-discussion",
          description:
            "Conversations about innovation, software development, and digital transformation",
          sort_order: 3,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(technologyCategory);

  const generalCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "General Discussion",
          slug: "general-discussion",
          description:
            "Open forum for various topics and community discussions",
          sort_order: 4,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(generalCategory);

  // Step 3: Search using keyword from economics category description
  const fiscalPolicySearch =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        search: "fiscal policy",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticleCategory.IRequest,
    });
  typia.assert(fiscalPolicySearch);

  // Step 4: Validate search results contain economics category
  TestValidator.predicate(
    "search results should contain at least one category",
    fiscalPolicySearch.data.length > 0,
  );

  const foundEconomicsCategory = fiscalPolicySearch.data.find(
    (cat) => cat.id === economicsCategory.id,
  );
  typia.assertGuard(foundEconomicsCategory!);

  TestValidator.equals(
    "found category should match created economics category",
    foundEconomicsCategory.id,
    economicsCategory.id,
  );

  TestValidator.predicate(
    "economics category description should contain search term",
    economicsCategory.description!.includes("fiscal policy"),
  );

  // Step 5: Search using different keyword to test partial matching
  const innovationSearch =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        search: "innovation",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticleCategory.IRequest,
    });
  typia.assert(innovationSearch);

  const foundTechnologyCategory = innovationSearch.data.find(
    (cat) => cat.id === technologyCategory.id,
  );
  typia.assertGuard(foundTechnologyCategory!);

  TestValidator.equals(
    "found category should match created technology category",
    foundTechnologyCategory.id,
    technologyCategory.id,
  );

  // Step 6: Search using keyword that appears in category name
  const politicalSearch = await api.functional.discussionBoard.categories.index(
    connection,
    {
      body: {
        search: "Political",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticleCategory.IRequest,
    },
  );
  typia.assert(politicalSearch);

  const foundPoliticsCategory = politicalSearch.data.find(
    (cat) => cat.id === politicsCategory.id,
  );
  typia.assertGuard(foundPoliticsCategory!);

  TestValidator.equals(
    "search should work on both name and description fields",
    foundPoliticsCategory.id,
    politicsCategory.id,
  );
}
