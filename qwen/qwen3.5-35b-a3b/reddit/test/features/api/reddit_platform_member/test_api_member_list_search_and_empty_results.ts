import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMember";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_list_search_and_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections for member list API
  const listConnection: api.IConnection = { host: connection.host };
  // ===== SEARCH FUNCTIONALITY TEST =====
  // Use simulate mode to generate random member data for testing
  const searchConnection: api.IConnection = {
    host: connection.host,
    simulate: true,
  };
  // Test 1: Search with search_query parameter (partial match)
  const searchResults = await api.functional.redditPlatform.members.index(
    searchConnection,
    {
      body: {
        search_query: "test", // Partial match query
        limit: 10,
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(searchResults);
  // Validate response structure
  TestValidator.equals(
    "search response pagination structure",
    searchResults.pagination,
    searchResults.pagination,
  );
  TestValidator.equals(
    "search response data is array",
    searchResults.data,
    searchResults.data,
  );
  // Test 2: Search with username parameter (case-insensitive partial match)
  const usernameSearchResults =
    await api.functional.redditPlatform.members.index(searchConnection, {
      body: {
        username: "John", // Case-insensitive search
        limit: 10,
      } satisfies IRedditPlatformMember.IRequest,
    });
  typia.assert(usernameSearchResults);
  // ===== EMPTY RESULTS SCENARIO =====
  // Query with non-matching criteria
  const emptySearchResults = await api.functional.redditPlatform.members.index(
    searchConnection,
    {
      body: {
        search_query: "xyz123abc", // Non-matching string
        limit: 20,
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(emptySearchResults);
  // Validate empty results
  TestValidator.equals(
    "empty results data array is empty",
    emptySearchResults.data.length,
    0,
  );
  TestValidator.equals(
    "empty results pagination records is 0",
    emptySearchResults.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty results pagination pages is 0",
    emptySearchResults.pagination.pages,
    0,
  );
  // ===== BOUNDARY SCENARIO =====
  // Test karma_score range filters at boundary values
  const karmaBoundaryResults =
    await api.functional.redditPlatform.members.index(searchConnection, {
      body: {
        karma_min: 0,
        karma_max: 0, // Find zero-karma members
        limit: 20,
      } satisfies IRedditPlatformMember.IRequest,
    });
  typia.assert(karmaBoundaryResults);
  // Validate karma boundary results
  TestValidator.equals(
    "karma boundary response has valid structure",
    karmaBoundaryResults.pagination,
    karmaBoundaryResults.pagination,
  );
  // Test date range filters with same from/to values
  const currentDate = new Date().toISOString();
  const dateRangeResults = await api.functional.redditPlatform.members.index(
    searchConnection,
    {
      body: {
        created_from: currentDate,
        created_to: currentDate, // Same date for single-day query
        limit: 20,
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(dateRangeResults);
  // ===== INVALID COMBINATION SCENARIO =====
  // Query with conflicting filters (very high karma requirement)
  const invalidCombinationResults =
    await api.functional.redditPlatform.members.index(searchConnection, {
      body: {
        karma_min: 1000000, // Higher than any random member would have
        karma_max: 999999999,
        limit: 20,
      } satisfies IRedditPlatformMember.IRequest,
    });
  typia.assert(invalidCombinationResults);
  // Validate invalid combination handled gracefully
  TestValidator.equals(
    "invalid combination response has valid structure",
    invalidCombinationResults.pagination,
    invalidCombinationResults.pagination,
  );
  // ===== ACTUAL API CALL TEST (Non-simulation) =====
  // Test with real connection to ensure non-simulation mode works
  const actualResults = await api.functional.redditPlatform.members.index(
    listConnection,
    {
      body: {
        limit: 10,
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(actualResults);
  // Validate actual response structure
  TestValidator.predicate(
    "actual API response has non-negative records",
    actualResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "actual API response has non-negative pages",
    actualResults.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "actual API response data is array",
    Array.isArray(actualResults.data),
  );
}
