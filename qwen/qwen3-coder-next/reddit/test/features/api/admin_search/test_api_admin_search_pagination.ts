import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeAdmin";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_admin_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection for testing
  const adminConnection: api.IConnection = { host: connection.host };
  // Test 1: Basic search with partial username
  const partialUsername = RandomGenerator.alphabets(3);
  const response1 = await api.functional.redditLike.admins.index(
    adminConnection,
    {
      body: {
        search: partialUsername,
      } satisfies IRedditLikeAdmin.IRequest,
    },
  );
  typia.assert(response1);
  // Test 2: Search with display name
  const searchByName = RandomGenerator.name();
  const response2 = await api.functional.redditLike.admins.index(
    adminConnection,
    {
      body: {
        search: searchByName,
      } satisfies IRedditLikeAdmin.IRequest,
    },
  );
  typia.assert(response2);
  // Test 3: Status filtering with valid status
  const validStatuses = ["active", "suspended", "deleted"];
  const randomStatus = RandomGenerator.pick(validStatuses);
  const response3 = await api.functional.redditLike.admins.index(
    adminConnection,
    {
      body: {
        status: randomStatus,
      } satisfies IRedditLikeAdmin.IRequest,
    },
  );
  typia.assert(response3);
  // Test 4: Pagination - first page
  const page1Response = await api.functional.redditLike.admins.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IRedditLikeAdmin.IRequest,
    },
  );
  typia.assert(page1Response);
  TestValidator.equals(
    "pagination page 1",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit 10",
    page1Response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    page1Response.pagination.records >= 0,
  );
  // Test 5: Pagination - second page
  const page2Response = await api.functional.redditLike.admins.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IRedditLikeAdmin.IRequest,
    },
  );
  typia.assert(page2Response);
  // Test 6: Sorting by created_at ascending
  const sortedAscResponse = await api.functional.redditLike.admins.index(
    adminConnection,
    {
      body: {
        sort: "created_at",
      } satisfies IRedditLikeAdmin.IRequest,
    },
  );
  typia.assert(sortedAscResponse);
  // Test 7: Sorting by created_at descending
  const sortedDescResponse = await api.functional.redditLike.admins.index(
    adminConnection,
    {
      body: {
        sort: "created_at_desc",
      } satisfies IRedditLikeAdmin.IRequest,
    },
  );
  typia.assert(sortedDescResponse);
  // Test 8: Date range filtering
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateFilterResponse = await api.functional.redditLike.admins.index(
    adminConnection,
    {
      body: {
        createdAfter: oneMonthAgo.toISOString(),
        createdBefore: now.toISOString(),
      } satisfies IRedditLikeAdmin.IRequest,
    },
  );
  typia.assert(dateFilterResponse);
  // Test 9: Combined filters - search + status + pagination + date range
  const combinedResponse = await api.functional.redditLike.admins.index(
    adminConnection,
    {
      body: {
        search: RandomGenerator.name(2),
        status: RandomGenerator.pick(validStatuses),
        page: 1,
        limit: 20,
        createdAfter: oneMonthAgo.toISOString(),
      } satisfies IRedditLikeAdmin.IRequest,
    },
  );
  typia.assert(combinedResponse);
  TestValidator.equals(
    "combined limit 20",
    combinedResponse.pagination.limit,
    20,
  );
  // Test 10: Maximum limit (100)
  const maxLimitResponse = await api.functional.redditLike.admins.index(
    adminConnection,
    {
      body: {
        limit: 100,
      } satisfies IRedditLikeAdmin.IRequest,
    },
  );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit validation",
    maxLimitResponse.pagination.limit,
    100,
  );
  // Test 11: No search results case
  const noResultsResponse = await api.functional.redditLike.admins.index(
    adminConnection,
    {
      body: {
        search: RandomGenerator.alphaNumeric(20), // Unique random string unlikely to match
      } satisfies IRedditLikeAdmin.IRequest,
    },
  );
  typia.assert(noResultsResponse);
  // Test 12: Empty search (should return all)
  const emptySearchResponse = await api.functional.redditLike.admins.index(
    adminConnection,
    {
      body: {
        search: "",
      } satisfies IRedditLikeAdmin.IRequest,
    },
  );
  typia.assert(emptySearchResponse);
  // Test 13: Pagination calculation verification
  const totalPages = Math.ceil(
    emptySearchResponse.pagination.records /
      emptySearchResponse.pagination.limit,
  );
  TestValidator.predicate("pages calculation valid", totalPages >= 0);
}
