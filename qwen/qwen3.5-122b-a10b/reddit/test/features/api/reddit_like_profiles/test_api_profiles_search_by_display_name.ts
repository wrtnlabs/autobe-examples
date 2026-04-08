import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeUserProfile";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_profiles_search_by_display_name(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test searching user profiles by display name with partial matching.
   *
   * Validates the profile search functionality using GIN trigram search for partial display name matching. Tests various search scenarios including exact matches, partial matches, and edge cases with pagination and sorting.
   *
   * 1. Search with partial display name term
   * 2. Verify returned profiles contain the search term in display_name
   * 3. Validate pagination metadata structure
   * 4. Test sorting by display_name
   * 5. Test filtering with karma score range
   * 6. Validate profile summary data completeness
   */
  // 1. Search with partial display name
  const searchTerm = RandomGenerator.alphabets(3);
  const searchResult = await api.functional.redditLike.profiles.index(
    connection,
    {
      body: {
        search: searchTerm,
        limit: 20,
        page: 1,
      } satisfies IRedditLikeUserProfile.IRequest,
    },
  );
  typia.assert(searchResult);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    searchResult.pagination.pages >= 0,
  );
  // Validate that all returned profiles contain search term (if any results)
  if (searchResult.data.length > 0) {
    TestValidator.predicate(
      "all results contain search term",
      searchResult.data.every((profile) =>
        profile.display_name.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    );
  }
  // 2. Test search with no results
  const noMatchResult = await api.functional.redditLike.profiles.index(
    connection,
    {
      body: {
        search: "zzzzzzzzzz_nonexistent_user_xyz",
        limit: 20,
      } satisfies IRedditLikeUserProfile.IRequest,
    },
  );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "no match returns empty data",
    noMatchResult.data.length,
    0,
  );
  TestValidator.predicate(
    "no match has zero records",
    noMatchResult.pagination.records === 0,
  );
  // 3. Test sorting by display_name ascending
  const sortedAscResult = await api.functional.redditLike.profiles.index(
    connection,
    {
      body: {
        sort: "display_name",
        sort_direction: "asc",
        limit: 50,
      } satisfies IRedditLikeUserProfile.IRequest,
    },
  );
  typia.assert(sortedAscResult);
  if (sortedAscResult.data.length > 1) {
    TestValidator.predicate(
      "sorted ascending by display_name",
      sortedAscResult.data.every((profile, index) => {
        if (index === 0) return true;
        return (
          profile.display_name >= sortedAscResult.data[index - 1].display_name
        );
      }),
    );
  }
  // 4. Test sorting by display_name descending
  const sortedDescResult = await api.functional.redditLike.profiles.index(
    connection,
    {
      body: {
        sort: "display_name",
        sort_direction: "desc",
        limit: 50,
      } satisfies IRedditLikeUserProfile.IRequest,
    },
  );
  typia.assert(sortedDescResult);
  if (sortedDescResult.data.length > 1) {
    TestValidator.predicate(
      "sorted descending by display_name",
      sortedDescResult.data.every((profile, index) => {
        if (index === 0) return true;
        return (
          profile.display_name <= sortedDescResult.data[index - 1].display_name
        );
      }),
    );
  }
  // 5. Test karma score filtering
  const karmaMin = typia.random<number>();
  const karmaFilteredResult = await api.functional.redditLike.profiles.index(
    connection,
    {
      body: {
        karma_score_min: karmaMin,
        limit: 20,
      } satisfies IRedditLikeUserProfile.IRequest,
    },
  );
  typia.assert(karmaFilteredResult);
  if (karmaFilteredResult.data.length > 0) {
    TestValidator.predicate(
      "all results meet minimum karma",
      karmaFilteredResult.data.every(
        (profile) => profile.karma_score >= karmaMin,
      ),
    );
  }
  // 6. Test pagination with offset
  const firstPage = await api.functional.redditLike.profiles.index(connection, {
    body: {
      limit: 10,
      offset: 0,
    } satisfies IRedditLikeUserProfile.IRequest,
  });
  typia.assert(firstPage);
  const secondPage = await api.functional.redditLike.profiles.index(
    connection,
    {
      body: {
        limit: 10,
        offset: 10,
      } satisfies IRedditLikeUserProfile.IRequest,
    },
  );
  typia.assert(secondPage);
  // Verify pages are different (if there are enough records)
  if (firstPage.data.length > 0 && secondPage.data.length > 0) {
    TestValidator.notEquals(
      "second page has different data",
      firstPage.data[0].id,
      secondPage.data[0].id,
    );
  }
  // 7. Validate profile summary structure
  if (searchResult.data.length > 0) {
    const profile = searchResult.data[0];
    typia.assert(profile);
    TestValidator.predicate("profile has valid id", profile.id.length > 0);
    TestValidator.predicate(
      "profile has display_name",
      profile.display_name.length > 0,
    );
    TestValidator.predicate(
      "profile has karma_score",
      typeof profile.karma_score === "number",
    );
    TestValidator.predicate(
      "profile member has id",
      profile.member.id.length > 0,
    );
    TestValidator.predicate(
      "profile member has username",
      profile.member.username.length > 0,
    );
  }
  // 8. Test combined filters
  const combinedResult = await api.functional.redditLike.profiles.index(
    connection,
    {
      body: {
        search: RandomGenerator.alphabets(2),
        karma_score_min: 0,
        sort: "karma_score",
        sort_direction: "desc",
        limit: 20,
      } satisfies IRedditLikeUserProfile.IRequest,
    },
  );
  typia.assert(combinedResult);
  if (combinedResult.data.length > 0) {
    TestValidator.predicate(
      "combined filters work correctly",
      combinedResult.data.every((profile) => profile.karma_score >= 0),
    );
  }
}
