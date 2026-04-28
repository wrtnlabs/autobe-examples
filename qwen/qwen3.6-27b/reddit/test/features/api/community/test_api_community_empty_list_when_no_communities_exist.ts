import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityCommunity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test empty community list when no communities exist or search matches nothing.
 *
 * Validates that when the platform has no communities or a search keyword matches no communities, the API returns a valid paginated response with an empty data array and correct pagination metadata (records=0, pages=0). Ensures no placeholder or default communities are shown and the response is a proper 200 OK JSON structure, not an error.
 *
 * This is a public endpoint that requires no authentication.
 *
 * 1. Call the communities index endpoint with a unique search keyword that won't match anything
 * 2. Validate the response is a valid paginated structure
 * 3. Verify data array is empty
 * 4. Verify pagination shows records=0 and pages=0
 */
export async function test_api_community_empty_list_when_no_communities_exist(
  connection: api.IConnection,
) {
  // 1. Create connection for public access
  const communityConnection: api.IConnection = { host: connection.host };
  // 2. Search with a unique keyword that won't match any existing communities
  const uniqueSearchKeyword = "xyz_nonexistent_community_search_12345";
  const response = await api.functional.redditLikeCommunity.communities.index(
    communityConnection,
    {
      body: {
        search: uniqueSearchKeyword,
      } satisfies IREdditLikeCommunityCommunity.IRequest,
    },
  );
  // 3. Validate response type is correct paginated structure
  typia.assert(response);
  // 4. Validate data array is empty
  TestValidator.equals("data array is empty", response.data.length, 0);
  // 5. Validate pagination metadata shows zero records and zero pages
  TestValidator.equals(
    "pagination records is zero",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is zero",
    response.pagination.pages,
    0,
  );
}
