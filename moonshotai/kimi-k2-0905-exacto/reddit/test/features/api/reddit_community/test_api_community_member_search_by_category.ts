import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test community discovery where a member searches for communities within a
 * specific category. Verify that category-based filtering correctly limits
 * results to communities assigned to the specified category. Validate that
 * search text matching works across both community names and titles within the
 * category constraint.
 *
 * This test demonstrates the complete workflow of:
 *
 * 1. Member registration and authentication
 * 2. Community creation in different categories
 * 3. Category-based filtering during community search
 * 4. Text search within specific categories
 * 5. Validation that results are correctly filtered by category
 */
export async function test_api_community_member_search_by_category(
  connection: api.IConnection,
) {
  // Step 1: Register as a member to get authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: memberEmail,
      password: "SecurePassword123!" satisfies string &
        tags.Format<"password"> &
        tags.MinLength<8>,
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create test communities in different categories
  const techCommunityName = `tech_${RandomGenerator.alphaNumeric(6)}`;
  const techCommunityTitle = "JavaScript Programming Community";
  const techCommunity1 =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: techCommunityName,
        title: techCommunityTitle,
        description:
          "A community for JavaScript developers to share knowledge and ask questions",
        category_name: "Technology",
        type: "public",
        allow_crosspost: true,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(techCommunity1);

  const pythonCommunityName = `python_${RandomGenerator.alphaNumeric(6)}`;
  const pythonCommunityTitle = "Python Development Hub";
  const techCommunity2 =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: pythonCommunityName,
        title: pythonCommunityTitle,
        description: "Advanced Python programming discussions and tutorials",
        category_name: "Technology",
        type: "public",
        allow_crosspost: false,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(techCommunity2);

  const sportsCommunityName = `sports_${RandomGenerator.alphaNumeric(6)}`;
  const sportsCommunityTitle = "Basketball Fan Zone";
  const sportsCommunity =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: sportsCommunityName,
        title: sportsCommunityTitle,
        description:
          "Everything about basketball - NBA, college, and international",
        category_name: "Sports",
        type: "public",
        allow_crosspost: true,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(sportsCommunity);

  const entertainmentCommunityName = `entertainment_${RandomGenerator.alphaNumeric(6)}`;
  const entertainmentCommunityTitle = "Movie Lovers United";
  const entertainmentCommunity =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: entertainmentCommunityName,
        title: entertainmentCommunityTitle,
        description: "Discuss movies, reviews, and cinema culture",
        category_name: "Entertainment",
        type: "public",
        allow_crosspost: false,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(entertainmentCommunity);

  // Step 3: Search for communities in Technology category
  const techCategoryResults =
    await api.functional.redditCommunity.member.communities.index(connection, {
      body: {
        category_name: "Technology",
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(techCategoryResults);

  // Validate all results are from Technology category
  TestValidator.predicate(
    "All results should be from Technology category",
    techCategoryResults.data.every(
      (community) => community.category?.name === "Technology",
    ),
  );

  TestValidator.predicate(
    "Technology communities should be found in category filter",
    techCategoryResults.data.some(
      (community) => community.id === techCommunity1.id,
    ) &&
      techCategoryResults.data.some(
        (community) => community.id === techCommunity2.id,
      ),
  );

  // Step 4: Search for "JavaScript" within Technology category
  const javascriptResults =
    await api.functional.redditCommunity.member.communities.index(connection, {
      body: {
        category_name: "Technology",
        search: "JavaScript",
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(javascriptResults);

  TestValidator.predicate(
    "JavaScript search should find at least one Technology community",
    javascriptResults.data.length >= 1 &&
      javascriptResults.data.some((community) =>
        community.title.toLowerCase().includes("javascript"),
      ),
  );

  // Step 5: Search for "Python" within Technology category
  const pythonResults =
    await api.functional.redditCommunity.member.communities.index(connection, {
      body: {
        category_name: "Technology",
        search: "Python",
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(pythonResults);

  TestValidator.predicate(
    "Python search should find Technology community with Python",
    pythonResults.data.length >= 1 &&
      pythonResults.data.some((community) =>
        community.title.toLowerCase().includes("python"),
      ),
  );

  // Step 6: Verify Sports communities are NOT in Technology results
  const sportsResultsInTech =
    await api.functional.redditCommunity.member.communities.index(connection, {
      body: {
        category_name: "Technology",
        search: "Basketball",
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(sportsResultsInTech);

  TestValidator.equals(
    "Basketball search in Technology should return no results",
    sportsResultsInTech.data.length,
    0,
  );

  // Step 7: Test full search without category filter
  const allCommunitiesResults =
    await api.functional.redditCommunity.member.communities.index(connection, {
      body: {
        search: "Community",
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(allCommunitiesResults);

  TestValidator.predicate(
    "Search without category should find communities across categories",
    allCommunitiesResults.data.length > 0 &&
      allCommunitiesResults.data.some(
        (community) => community.category?.name === "Technology",
      ),
  );

  // Step 8: Test pagination with category filtering
  const paginatedResults =
    await api.functional.redditCommunity.member.communities.index(connection, {
      body: {
        category_name: "Technology",
        page: 0,
        limit: 1,
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(paginatedResults);

  TestValidator.predicate(
    "Paginated results should have Technology communities",
    paginatedResults.data.length <= 1 &&
      paginatedResults.data.every(
        (community) => community.category?.name === "Technology",
      ),
  );

  TestValidator.predicate(
    "Pagination info should be valid",
    paginatedResults.pagination.limit === 1 &&
      paginatedResults.pagination.current === 0,
  );

  // Step 9: Test with non-existent category
  const nonExistentResults =
    await api.functional.redditCommunity.member.communities.index(connection, {
      body: {
        category_name: "NonExistentCategory123",
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(nonExistentResults);

  TestValidator.equals(
    "Non-existent category search should return no results",
    nonExistentResults.data.length,
    0,
  );
}
