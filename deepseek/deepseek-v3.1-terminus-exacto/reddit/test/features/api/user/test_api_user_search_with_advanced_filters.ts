import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_search_with_advanced_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for user management
  const adminConnection: api.IConnection = { host: connection.host };
  // Since we cannot create users through the API in this test (no user creation endpoint available),
  // we'll test the search functionality with the existing user data in the system
  // and validate that the filtering logic works correctly
  // Test 1: Karma score range filtering
  const karmaRangeSearch = await api.functional.communityPlatform.users.index(
    adminConnection,
    {
      body: {
        karma_min: 10,
        karma_max: 100,
        limit: 50,
      } satisfies ICommunityPlatformUser.IRequest,
    },
  );
  typia.assert(karmaRangeSearch);
  // Validate karma range if we have results
  if (karmaRangeSearch.data.length > 0) {
    for (const user of karmaRangeSearch.data) {
      TestValidator.predicate(
        "karma within range",
        user.karma >= 10 && user.karma <= 100,
      );
    }
  }
  // Test 2: Email verification status filtering
  const verifiedSearch = await api.functional.communityPlatform.users.index(
    adminConnection,
    {
      body: {
        email_verified: true,
        limit: 50,
      } satisfies ICommunityPlatformUser.IRequest,
    },
  );
  typia.assert(verifiedSearch);
  const unverifiedSearch = await api.functional.communityPlatform.users.index(
    adminConnection,
    {
      body: {
        email_verified: false,
        limit: 50,
      } satisfies ICommunityPlatformUser.IRequest,
    },
  );
  typia.assert(unverifiedSearch);
  // Test 3: Partial username matching
  const usernameSearch = await api.functional.communityPlatform.users.index(
    adminConnection,
    {
      body: {
        username: "a", // Common character that might exist in usernames
        limit: 50,
      } satisfies ICommunityPlatformUser.IRequest,
    },
  );
  typia.assert(usernameSearch);
  // Test 4: Partial display name matching
  const displayNameSearch = await api.functional.communityPlatform.users.index(
    adminConnection,
    {
      body: {
        display_name: "user", // Common term that might exist in display names
        limit: 50,
      } satisfies ICommunityPlatformUser.IRequest,
    },
  );
  typia.assert(displayNameSearch);
  // Test 5: Date range filtering
  const oneMonthAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const oneWeekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateRangeSearch = await api.functional.communityPlatform.users.index(
    adminConnection,
    {
      body: {
        created_after: oneMonthAgo,
        created_before: oneWeekAgo,
        limit: 50,
      } satisfies ICommunityPlatformUser.IRequest,
    },
  );
  typia.assert(dateRangeSearch);
  // Validate date range if we have results
  if (dateRangeSearch.data.length > 0) {
    for (const user of dateRangeSearch.data) {
      const userCreated = new Date(user.created_at);
      const afterDate = new Date(oneMonthAgo);
      const beforeDate = new Date(oneWeekAgo);
      TestValidator.predicate(
        "created within date range",
        userCreated >= afterDate && userCreated <= beforeDate,
      );
    }
  }
  // Test 6: Combined filters
  const combinedSearch = await api.functional.communityPlatform.users.index(
    adminConnection,
    {
      body: {
        karma_min: 1,
        karma_max: 1000,
        email_verified: true,
        username: "a",
        limit: 25,
      } satisfies ICommunityPlatformUser.IRequest,
    },
  );
  typia.assert(combinedSearch);
  // Test 7: Pagination functionality
  const page1Search = await api.functional.communityPlatform.users.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformUser.IRequest,
    },
  );
  typia.assert(page1Search);
  const page2Search = await api.functional.communityPlatform.users.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies ICommunityPlatformUser.IRequest,
    },
  );
  typia.assert(page2Search);
  // Validate pagination metadata
  TestValidator.equals(
    "page 1 current page",
    page1Search.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 2 current page",
    page2Search.pagination.current,
    2,
  );
  TestValidator.equals("consistent limit", page1Search.pagination.limit, 10);
  TestValidator.equals(
    "consistent limit page 2",
    page2Search.pagination.limit,
    10,
  );
  // Test 8: Empty search (no filters)
  const emptySearch = await api.functional.communityPlatform.users.index(
    adminConnection,
    {
      body: {
        limit: 20,
      } satisfies ICommunityPlatformUser.IRequest,
    },
  );
  typia.assert(emptySearch);
  // Test 9: Bio partial matching
  const bioSearch = await api.functional.communityPlatform.users.index(
    adminConnection,
    {
      body: {
        bio: "test", // Common term that might exist in bios
        limit: 50,
      } satisfies ICommunityPlatformUser.IRequest,
    },
  );
  typia.assert(bioSearch);
  // Test 10: Avatar URL partial matching
  const avatarSearch = await api.functional.communityPlatform.users.index(
    adminConnection,
    {
      body: {
        avatar_url: "avatar", // Common term that might exist in avatar URLs
        limit: 50,
      } satisfies ICommunityPlatformUser.IRequest,
    },
  );
  typia.assert(avatarSearch);
}
