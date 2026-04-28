import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityModerator";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test moderator search with filters that yield zero results for a non-existent community.
 *
 * Validates that the public moderator search endpoint gracefully handles filter criteria that match no records, returning an empty data array and proper pagination metadata with 0 total records and 0 pages. This ensures the endpoint does not error when querying for moderators in a community that does not exist.
 *
 * Special attention is given to verifying that the pagination structure remains valid even when no results are found, including that pages correctly computes to 0 when records is 0.
 *
 * 1. Generate a random UUID that represents a non-existent community.
 * 2. Query the moderator search endpoint with the non-existent community_id filter.
 * 3. Validate the paginated response structure with typia.assert().
 * 4. Verify the data array is empty with zero elements.
 * 5. Confirm pagination metadata shows 0 total records and 0 pages.
 */
export async function test_api_moderator_search_empty_results_on_nonexistent_community(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for search
  const searchConnection: api.IConnection = { host: connection.host };
  // Generate a random UUID to represent a non-existent community
  const nonExistentCommunityId = typia.random<string & tags.Format<"uuid">>();
  // Query moderator search with non-existent community_id
  const response = await api.functional.redditLikeCommunity.moderators.index(
    searchConnection,
    {
      body: {
        community_id: nonExistentCommunityId,
      } satisfies IRedditLikeCommunityModerator.IRequest,
    },
  );
  typia.assert(response);
  // Validate empty result set
  TestValidator.predicate("data array is empty", response.data.length === 0);
  // Validate pagination metadata shows 0 records
  TestValidator.equals("total records is zero", response.pagination.records, 0);
  // Validate pagination metadata shows 0 pages
  TestValidator.equals("total pages is zero", response.pagination.pages, 0);
}
