import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_discovery_empty_search_results(
  connection: api.IConnection,
): Promise<void> {
  // Use a long random search term that is highly unlikely to match any existing community
  const searchTerm = RandomGenerator.alphaNumeric(50);
  const response = await api.functional.redditLike.communities.index(
    connection,
    {
      body: {
        search: searchTerm,
        page: 1,
        limit: 20,
        sort: "name",
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  // Complete validation of response structure including pagination and data
  typia.assert(response);
  // Verify pagination shows empty results correctly
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.equals(
    "pagination records count is 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages count is 0",
    response.pagination.pages,
    0,
  );
  // Verify data array is empty
  TestValidator.equals("data array length is 0", response.data.length, 0);
  TestValidator.predicate(
    "data array is empty",
    () => response.data.length === 0,
  );
}
