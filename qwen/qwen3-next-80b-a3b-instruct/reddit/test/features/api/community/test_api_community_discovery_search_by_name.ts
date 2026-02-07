import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_discovery_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // Create a search term that can be used to verify case-insensitive matching
  const searchValue = "Test";
  // Make the API call with search parameter
  const result = await api.functional.community.communities.index(connection, {
    body: { search: searchValue } satisfies ICommunityCommunity.IRequest,
  });
  typia.assert(result);
  // Validate that the response contains a correctly structured pagination object
  TestValidator.equals(
    "pagination current page is 1",
    result.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    result.pagination.pages >= 0,
  );
  // Validate that data is an array
  TestValidator.predicate("data array exists", Array.isArray(result.data));
  // Since ICommunityCommunity.ISummary is an empty object, we cannot validate any properties of the communities
  // The only contract is that the data array contains ICommunityCommunity.ISummary objects
  // We cannot validate name, subscriber_count, or any other fields as they are not defined in the schema
  // We verify only the structure provided by the schema
  for (const community of result.data) {
    TestValidator.predicate(
      "each item is an object",
      community !== null && typeof community === "object",
    );
  }
}
