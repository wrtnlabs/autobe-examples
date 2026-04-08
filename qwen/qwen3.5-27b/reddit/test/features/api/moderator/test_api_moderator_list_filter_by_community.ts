import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityModerator";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test filtering moderator assignments by specific community using the moderators list endpoint.
 *
 * Validates that the community_id filter parameter correctly restricts moderator assignment results to only those belonging to the specified community. Tests various filtering scenarios including valid community filters, different communities, and non-existent communities.
 *
 * Special attention is given to verifying that all returned moderator assignments have their community.id field matching the filter parameter, and that pagination metadata accurately reflects the filtered result set.
 *
 * 1. Fetch all moderators without filter to get available community IDs.
 * 2. Select first community from results and filter by its ID.
 * 3. Verify all returned assignments belong to the filtered community.
 * 4. Verify pagination metadata is consistent with data array.
 * 5. Test filtering by second community if available.
 * 6. Test filtering by non-existent community ID expecting empty results.
 */
export async function test_api_moderator_list_filter_by_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Fetch all moderators to get available community IDs
  const allModerators = await api.functional.redditClone.moderators.index(
    connection,
    {
      body: {
        limit: 100,
      } satisfies IRedditCloneCommunityModerator.IRequest,
    },
  );
  typia.assert(allModerators);
  // Extract unique community IDs from results
  const communityIds = Array.from(
    new Set(allModerators.data.map((mod) => mod.community.id)),
  );
  // 2. Test filtering by first community if available
  if (communityIds.length > 0) {
    const targetCommunityId = communityIds[0];
    const filteredByCommunity =
      await api.functional.redditClone.moderators.index(connection, {
        body: {
          community_id: targetCommunityId,
          limit: 100,
        } satisfies IRedditCloneCommunityModerator.IRequest,
      });
    typia.assert(filteredByCommunity);
    // 3. Verify all returned assignments belong to the filtered community
    TestValidator.predicate(
      "all assignments belong to filtered community",
      filteredByCommunity.data.every(
        (mod) => mod.community.id === targetCommunityId,
      ),
    );
    // 4. Verify pagination metadata consistency
    TestValidator.equals(
      "pagination records matches data length",
      filteredByCommunity.pagination.records,
      filteredByCommunity.data.length,
    );
    // 5. Test filtering by second community if available
    if (communityIds.length > 1) {
      const secondCommunityId = communityIds[1];
      const filteredBySecondCommunity =
        await api.functional.redditClone.moderators.index(connection, {
          body: {
            community_id: secondCommunityId,
            limit: 100,
          } satisfies IRedditCloneCommunityModerator.IRequest,
        });
      typia.assert(filteredBySecondCommunity);
      // Verify all belong to second community
      TestValidator.predicate(
        "all assignments belong to second community",
        filteredBySecondCommunity.data.every(
          (mod) => mod.community.id === secondCommunityId,
        ),
      );
      // Verify different communities return different results
      TestValidator.notEquals(
        "different communities have different moderator counts",
        filteredByCommunity.data.length,
        filteredBySecondCommunity.data.length,
      );
    }
  }
  // 6. Test filtering by non-existent community ID
  const nonExistentCommunityId = typia.random<string & tags.Format<"uuid">>();
  const filteredNonExistent = await api.functional.redditClone.moderators.index(
    connection,
    {
      body: {
        community_id: nonExistentCommunityId,
        limit: 100,
      } satisfies IRedditCloneCommunityModerator.IRequest,
    },
  );
  typia.assert(filteredNonExistent);
  // Verify empty results for non-existent community
  TestValidator.equals(
    "non-existent community returns empty data",
    filteredNonExistent.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent community has zero records",
    filteredNonExistent.pagination.records,
    0,
  );
}
