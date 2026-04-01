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

export async function test_api_member_profile_search_by_username(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Search with partial username text
  const usernameSearch = await api.functional.redditCommunity.members.index(
    connection,
    {
      body: {
        search: "test",
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityUserProfile.IRequest,
    },
  );
  typia.assert(usernameSearch);
  TestValidator.predicate(
    "pagination valid",
    usernameSearch.pagination.current >= 1,
  );
  TestValidator.predicate("limit valid", usernameSearch.pagination.limit > 0);
  TestValidator.predicate(
    "records non-negative",
    usernameSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages non-negative",
    usernameSearch.pagination.pages >= 0,
  );
  // Validate each profile has required fields
  for (const profile of usernameSearch.data) {
    TestValidator.predicate("id is uuid", /^[0-9a-f-]{36}$/i.test(profile.id));
    TestValidator.predicate("username exists", profile.username.length > 0);
    TestValidator.predicate(
      "display_name exists",
      profile.display_name.length > 0,
    );
    TestValidator.predicate(
      "karma_score is number",
      typeof profile.karma_score === "number",
    );
    TestValidator.predicate(
      "created_at is date",
      profile.created_at.length > 0,
    );
  }
  // Test 2: Search with display name text
  const displayNameSearch = await api.functional.redditCommunity.members.index(
    connection,
    {
      body: {
        search: "user",
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityUserProfile.IRequest,
    },
  );
  typia.assert(displayNameSearch);
  TestValidator.predicate(
    "display search returns valid pagination",
    displayNameSearch.pagination.current >= 1,
  );
  // Test 3: Empty search - should return all active profiles
  const emptySearch = await api.functional.redditCommunity.members.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityUserProfile.IRequest,
    },
  );
  typia.assert(emptySearch);
  TestValidator.predicate(
    "empty search has valid pagination",
    emptySearch.pagination.current >= 1,
  );
  TestValidator.predicate(
    "empty search records >= data length",
    emptySearch.pagination.records >= emptySearch.data.length,
  );
  // Test 4: Search with no results - use unique string
  const noResultsSearch = await api.functional.redditCommunity.members.index(
    connection,
    {
      body: {
        search: typia.random<string & tags.Format<"uuid">>(),
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityUserProfile.IRequest,
    },
  );
  typia.assert(noResultsSearch);
  TestValidator.equals(
    "no results has empty data",
    noResultsSearch.data.length,
    0,
  );
  TestValidator.equals(
    "no results has 0 records",
    noResultsSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "no results has 0 pages",
    noResultsSearch.pagination.pages,
    0,
  );
  // Test 5: Search with karma filter
  const karmaFilteredSearch =
    await api.functional.redditCommunity.members.index(connection, {
      body: {
        karmaMin: 0,
        karmaMax: 1000000,
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityUserProfile.IRequest,
    });
  typia.assert(karmaFilteredSearch);
  for (const profile of karmaFilteredSearch.data) {
    TestValidator.predicate(
      "karma within range",
      profile.karma_score >= 0 && profile.karma_score <= 1000000,
    );
  }
  // Test 6: Search with different sort options
  const sortByKarma = await api.functional.redditCommunity.members.index(
    connection,
    {
      body: {
        sort: "karma_score",
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityUserProfile.IRequest,
    },
  );
  typia.assert(sortByKarma);
  const sortByUsername = await api.functional.redditCommunity.members.index(
    connection,
    {
      body: {
        sort: "username",
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityUserProfile.IRequest,
    },
  );
  typia.assert(sortByUsername);
  const sortByDisplayName = await api.functional.redditCommunity.members.index(
    connection,
    {
      body: {
        sort: "display_name",
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityUserProfile.IRequest,
    },
  );
  typia.assert(sortByDisplayName);
  const sortByCreatedAt = await api.functional.redditCommunity.members.index(
    connection,
    {
      body: {
        sort: "created_at",
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityUserProfile.IRequest,
    },
  );
  typia.assert(sortByCreatedAt);
  // Test 7: Pagination - test page 2
  const page2Search = await api.functional.redditCommunity.members.index(
    connection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IRedditCommunityUserProfile.IRequest,
    },
  );
  typia.assert(page2Search);
  TestValidator.equals("page 2 current", page2Search.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Search.pagination.limit, 10);
  // Test 8: Verify bio field can be null or string
  for (const profile of emptySearch.data) {
    TestValidator.predicate(
      "bio is null or string",
      profile.bio === null ||
        profile.bio === undefined ||
        typeof profile.bio === "string",
    );
  }
}
