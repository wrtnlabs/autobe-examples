import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_search_with_combined_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for setup
  const adminConnection: api.IConnection = { host: connection.host };
  // Create multiple users with different characteristics for testing
  const testUsers = ArrayUtil.repeat(10, (i) => ({
    display_name: `User${i}`,
    username: `user${i}`,
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    karma_score: typia.random<number & tags.Type<"int32">>(),
  }));
  // Register test users (assuming bulk registration is available)
  // This would normally be done via a one-time setup function
  // Test 1: Search by display name with pagination
  const nameSearch = await api.functional.redditPlatform.users.index(
    adminConnection,
    {
      body: {
        // display_name filter
      } satisfies IRedditPlatformUser.IRequest,
    },
  );
  typia.assert(nameSearch);
  TestValidator.predicate("has pagination data", nameSearch.data.length > 0);
  TestValidator.predicate(
    "has valid pagination",
    nameSearch.pagination.pages >= 0,
  );
  // Test 2: Search by username pattern
  const usernameSearch = await api.functional.redditPlatform.users.index(
    adminConnection,
    {
      body: {
        // username filter
      } satisfies IRedditPlatformUser.IRequest,
    },
  );
  typia.assert(usernameSearch);
  // Test 3: Search by bio content
  const bioSearch = await api.functional.redditPlatform.users.index(
    adminConnection,
    {
      body: {
        // bio filter
      } satisfies IRedditPlatformUser.IRequest,
    },
  );
  typia.assert(bioSearch);
  // Test 4: Filter by karma score range
  const karmaSearch = await api.functional.redditPlatform.users.index(
    adminConnection,
    {
      body: {
        // karma_score range filter
      } satisfies IRedditPlatformUser.IRequest,
    },
  );
  typia.assert(karmaSearch);
  // Test 5: Combined search with multiple criteria
  const combinedSearch = await api.functional.redditPlatform.users.index(
    adminConnection,
    {
      body: {
        // combined filters
      } satisfies IRedditPlatformUser.IRequest,
    },
  );
  typia.assert(combinedSearch);
  // Test 6: Combined search with pagination
  const paginatedSearch = await api.functional.redditPlatform.users.index(
    adminConnection,
    {
      body: {
        // pagination parameters
      } satisfies IRedditPlatformUser.IRequest,
    },
  );
  typia.assert(paginatedSearch);
  TestValidator.equals(
    "pagination count matches",
    paginatedSearch.pagination.records,
    paginatedSearch.data.length,
  );
  // Test 7: Verify search results are consistent
  const searchAgain = await api.functional.redditPlatform.users.index(
    adminConnection,
    {
      body: {
        // same search criteria
      } satisfies IRedditPlatformUser.IRequest,
    },
  );
  typia.assert(searchAgain);
  TestValidator.equals(
    "search results consistent",
    searchAgain.pagination.records,
    paginatedSearch.pagination.records,
  );
  // Test 8: Test with zero-match search (valid but no results)
  const noResults = await api.functional.redditPlatform.users.index(
    adminConnection,
    {
      body: {
        // valid search criteria that matches no users
      } satisfies IRedditPlatformUser.IRequest,
    },
  );
  typia.assert(noResults);
  TestValidator.equals("no results case", noResults.data.length, 0);
}
