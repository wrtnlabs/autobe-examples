import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_communities_search_no_results(
  connection: api.IConnection,
): Promise<void> {
  // Use base connection as no authentication is required for community browsing
  // Search with a query that won't match any existing community names
  const searchQuery = `nonexistentxyz123`;
  const response = await api.functional.redditPlatform.communities.index(
    connection,
    {
      body: {
        searchQuery,
      } satisfies IRedditPlatformCommunity.IRequest,
    },
  );
  typia.assert(response);
  // Validate empty data array
  TestValidator.equals("data array should be empty", response.data.length, 0);
  // Validate pagination metadata for no results
  TestValidator.equals(
    "pagination records should be 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    response.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination limit should be default 20",
    response.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination current should be 1",
    response.pagination.current,
    1,
  );
}
