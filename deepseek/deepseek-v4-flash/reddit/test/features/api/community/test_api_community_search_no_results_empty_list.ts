import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_search_no_results_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // Generate a search query that will not match any community name
  const searchQuery: string =
    "nonexistent_community_name_" + RandomGenerator.alphaNumeric(8);
  // Call the community search endpoint with the non-matching query
  const result = await api.functional.communityPlatform.communities.index(
    connection,
    {
      body: {
        search: searchQuery,
        page: 1,
        limit: 20,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(result);
  // Verify the response is a valid paginated result
  TestValidator.equals("data array is empty", result.data, []);
  TestValidator.equals("records count is 0", result.pagination.records, 0);
  TestValidator.equals("pages count is 0", result.pagination.pages, 0);
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  TestValidator.equals("limit is 20", result.pagination.limit, 20);
}