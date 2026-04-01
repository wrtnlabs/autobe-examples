import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityUserProfile";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_profile_search_karma_filter(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Basic search functionality with partial matching
  const searchTerm = "Test";
  const searchResult = await api.functional.redditCommunity.profiles.index(
    connection,
    {
      body: {
        search: searchTerm,
        limit: 20,
        page: 1,
      } satisfies IRedditCommunityUserProfile.IRequest,
    },
  );
  typia.assert(searchResult);
  TestValidator.predicate(
    "pagination metadata valid",
    searchResult.pagination.current >= 1 &&
      searchResult.pagination.limit > 0 &&
      searchResult.pagination.records >= 0 &&
      searchResult.pagination.pages >= 0,
  );
  // Validate all returned profiles contain search term in display_name
  for (const profile of searchResult.data) {
    TestValidator.predicate(
      `profile ${profile.id} display_name contains search term`,
      profile.display_name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }
  // Test 2: Karma minimum filter only
  const karmaMinValue = 100;
  const karmaMinResult = await api.functional.redditCommunity.profiles.index(
    connection,
    {
      body: {
        karmaMin: karmaMinValue,
        limit: 50,
        page: 1,
        sort: "karma_score",
      } satisfies IRedditCommunityUserProfile.IRequest,
    },
  );
  typia.assert(karmaMinResult);
  // Validate all profiles have karma >= karmaMinValue
  for (const profile of karmaMinResult.data) {
    TestValidator.predicate(
      `profile ${profile.id} karma >= ${karmaMinValue}`,
      profile.karma_score >= karmaMinValue,
    );
  }
  // Test 3: Karma maximum filter only
  const karmaMaxValue = 500;
  const karmaMaxResult = await api.functional.redditCommunity.profiles.index(
    connection,
    {
      body: {
        karmaMax: karmaMaxValue,
        limit: 50,
        page: 1,
        sort: "karma_score",
      } satisfies IRedditCommunityUserProfile.IRequest,
    },
  );
  typia.assert(karmaMaxResult);
  // Validate all profiles have karma <= karmaMaxValue
  for (const profile of karmaMaxResult.data) {
    TestValidator.predicate(
      `profile ${profile.id} karma <= ${karmaMaxValue}`,
      profile.karma_score <= karmaMaxValue,
    );
  }
  // Test 4: Combined karma range filter (karmaMin + karmaMax)
  const rangeMin = 50;
  const rangeMax = 1000;
  const rangeResult = await api.functional.redditCommunity.profiles.index(
    connection,
    {
      body: {
        karmaMin: rangeMin,
        karmaMax: rangeMax,
        limit: 50,
        page: 1,
        sort: "karma_score",
      } satisfies IRedditCommunityUserProfile.IRequest,
    },
  );
  typia.assert(rangeResult);
  // Validate all profiles are within karma range
  for (const profile of rangeResult.data) {
    TestValidator.predicate(
      `profile ${profile.id} karma in range [${rangeMin}, ${rangeMax}]`,
      profile.karma_score >= rangeMin && profile.karma_score <= rangeMax,
    );
  }
  // Test 5: Combined search and karma filter
  const combinedSearchTerm = "User";
  const combinedKarmaMin = 10;
  const combinedResult = await api.functional.redditCommunity.profiles.index(
    connection,
    {
      body: {
        search: combinedSearchTerm,
        karmaMin: combinedKarmaMin,
        limit: 50,
        page: 1,
      } satisfies IRedditCommunityUserProfile.IRequest,
    },
  );
  typia.assert(combinedResult);
  // Validate all profiles match both search and karma criteria
  for (const profile of combinedResult.data) {
    TestValidator.predicate(
      `profile ${profile.id} display_name contains "${combinedSearchTerm}"`,
      profile.display_name
        .toLowerCase()
        .includes(combinedSearchTerm.toLowerCase()),
    );
    TestValidator.predicate(
      `profile ${profile.id} karma >= ${combinedKarmaMin}`,
      profile.karma_score >= combinedKarmaMin,
    );
  }
  // Test 6: Sorting by karma_score (descending by default)
  const sortedByKarma = await api.functional.redditCommunity.profiles.index(
    connection,
    {
      body: {
        sort: "karma_score",
        limit: 20,
        page: 1,
      } satisfies IRedditCommunityUserProfile.IRequest,
    },
  );
  typia.assert(sortedByKarma);
  // Validate karma_score is in descending order
  if (sortedByKarma.data.length > 1) {
    for (let i = 1; i < sortedByKarma.data.length; i++) {
      TestValidator.predicate(
        `karma_score descending order at index ${i}`,
        sortedByKarma.data[i - 1].karma_score >=
          sortedByKarma.data[i].karma_score,
      );
    }
  }
  // Test 7: Sorting by username (ascending)
  const sortedByUsername = await api.functional.redditCommunity.profiles.index(
    connection,
    {
      body: {
        sort: "username",
        limit: 20,
        page: 1,
      } satisfies IRedditCommunityUserProfile.IRequest,
    },
  );
  typia.assert(sortedByUsername);
  // Validate username is in ascending order
  if (sortedByUsername.data.length > 1) {
    for (let i = 1; i < sortedByUsername.data.length; i++) {
      TestValidator.predicate(
        `username ascending order at index ${i}`,
        sortedByUsername.data[i - 1].username.localeCompare(
          sortedByUsername.data[i].username,
        ) <= 0,
      );
    }
  }
  // Test 8: Pagination test - get page 2
  const page2Result = await api.functional.redditCommunity.profiles.index(
    connection,
    {
      body: {
        limit: 10,
        page: 2,
      } satisfies IRedditCommunityUserProfile.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 10);
  // Test 9: Empty search result (search term that likely doesn't exist)
  const uniqueSearchTerm = "XYZ_NONEXISTENT_123456789";
  const emptyResult = await api.functional.redditCommunity.profiles.index(
    connection,
    {
      body: {
        search: uniqueSearchTerm,
        limit: 20,
        page: 1,
      } satisfies IRedditCommunityUserProfile.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty search returns empty data",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty search pages is 0",
    emptyResult.pagination.pages,
    0,
  );
  // Test 10: Validate basic response structure
  const basicResult = await api.functional.redditCommunity.profiles.index(
    connection,
    {
      body: {
        limit: 5,
        page: 1,
      } satisfies IRedditCommunityUserProfile.IRequest,
    },
  );
  typia.assert(basicResult);
  // typia.assert() already validates all type constraints including:
  // - UUID format for id
  // - Non-empty strings for username and display_name
  // - int32 for karma_score
  // - date-time format for created_at
  // No redundant manual validation needed
}
