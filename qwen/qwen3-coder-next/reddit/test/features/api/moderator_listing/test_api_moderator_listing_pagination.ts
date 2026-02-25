import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityModerator";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test moderator listing pagination functionality.
 *
 * This test validates the pagination functionality for listing moderators
 * in a community. Since the API only provides the listing endpoint without
 * creation functions, we test the pagination metadata and response structure
 * using the API's index function.
 */
export async function test_api_moderator_listing_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Generate community ID for testing
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Default pagination (should return all moderators)
  const page1: IPageIRedditCloneCommunityModerator =
    await api.functional.redditClone.communities.moderators.index(connection, {
      communityId: communityId,
    });
  typia.assert(page1);
  // Validate pagination structure
  TestValidator.equals(
    "default limit returns data array",
    Array.isArray(page1.data),
    true,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    () => page1.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination pages matches records and limit",
    page1.pagination.pages,
    Math.ceil(page1.pagination.records / page1.pagination.limit),
  );
  // Test 2: Verify data structure for each moderator
  for (const moderator of page1.data) {
    typia.assert(moderator);
    typia.assert(moderator.community);
    typia.assert(moderator.moderator);
    typia.assert(moderator.appointer);
    TestValidator.equals(
      "community_id matches community id",
      moderator.community_id,
      moderator.community.id,
    );
    TestValidator.equals(
      "moderator_id matches moderator id",
      moderator.moderator_id,
      moderator.moderator.id,
    );
    TestValidator.equals(
      "appointer_id matches appointer id",
      moderator.appointer_id,
      moderator.appointer.id,
    );
  }
  // Test 3: Pagination with limit of 5 (if supported by API)
  // Note: The API schema doesn't show support for limit parameter
  // This test is for structure validation only
  const page2: IPageIRedditCloneCommunityModerator =
    await api.functional.redditClone.communities.moderators.index(connection, {
      communityId: communityId,
    });
  typia.assert(page2);
  // Validate pagination metadata consistency
  TestValidator.equals(
    "pagination current is positive",
    page2.pagination.current > 0,
    true,
  );
  TestValidator.equals(
    "pagination limit is positive",
    page2.pagination.limit > 0,
    true,
  );
  // Test 4: Verify required fields in response
  if (page2.data.length > 0) {
    const sampleModerator = page2.data[0];
    TestValidator.predicate(
      "has community information",
      () =>
        sampleModerator.community !== null &&
        sampleModerator.community !== undefined,
    );
    TestValidator.predicate(
      "has moderator information",
      () =>
        sampleModerator.moderator !== null &&
        sampleModerator.moderator !== undefined,
    );
    TestValidator.predicate(
      "has appointer information",
      () =>
        sampleModerator.appointer !== null &&
        sampleModerator.appointer !== undefined,
    );
  }
}
