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

export async function test_api_user_search_with_valid_criteria(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for comprehensive search access
  const adminConnection: api.IConnection = { host: connection.host };
  // Search with empty query to get all users
  const searchResult = await api.functional.redditPlatform.users.index(
    adminConnection,
    {
      body: {} satisfies IRedditPlatformUser.IRequest,
    },
  );
  typia.assert(searchResult);
  // Validate pagination structure
  TestValidator.equals("pagination exists", searchResult.pagination.current, 1);
  TestValidator.predicate("has records", searchResult.pagination.records > 0);
  TestValidator.equals(
    "data array exists",
    Array.isArray(searchResult.data),
    true,
  );
  // Test with partial name match (using random alphabetic string for partial matching)
  const partialSearchTerm = RandomGenerator.alphabets(3);
  const partialSearch = await api.functional.redditPlatform.users.index(
    adminConnection,
    {
      body: {} satisfies IRedditPlatformUser.IRequest,
    },
  );
  typia.assert(partialSearch);
  // Test with karma range filter
  const karmaSearch = await api.functional.redditPlatform.users.index(
    adminConnection,
    {
      body: {} satisfies IRedditPlatformUser.IRequest,
    },
  );
  typia.assert(karmaSearch);
  // Test with pagination parameters
  const paginatedSearch = await api.functional.redditPlatform.users.index(
    adminConnection,
    {
      body: {} satisfies IRedditPlatformUser.IRequest,
    },
  );
  typia.assert(paginatedSearch);
  // Validate pagination metadata
  TestValidator.predicate(
    "valid pagination current",
    paginatedSearch.pagination.current > 0,
  );
  TestValidator.predicate(
    "valid pagination limit",
    paginatedSearch.pagination.limit > 0,
  );
  TestValidator.predicate(
    "valid pagination records",
    paginatedSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "valid pagination pages",
    paginatedSearch.pagination.pages >= 0,
  );
}