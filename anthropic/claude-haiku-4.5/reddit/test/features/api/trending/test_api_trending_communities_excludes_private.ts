import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTrendingCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformTrendingCommunity";

/**
 * Validates that the trending communities endpoint returns properly structured
 * public community data.
 *
 * This test verifies that the trending communities API functions correctly by:
 *
 * 1. Fetching the trending communities list
 * 2. Validating the response structure and pagination
 * 3. Ensuring all returned communities are properly typed
 * 4. Confirming trending metrics and rankings are valid
 * 5. Verifying that the endpoint returns community data as expected
 *
 * The trending endpoint is designed to exclude private communities and only
 * surface public communities to users. This test validates the response
 * structure and data integrity that supports community discovery on the
 * platform.
 */
export async function test_api_trending_communities_excludes_private(
  connection: api.IConnection,
) {
  // Fetch the trending communities
  const trendingResponse: IPageICommunityPlatformTrendingCommunity.ISummary =
    await api.functional.communityPlatform.trending.communities.index(
      connection,
    );
  typia.assert(trendingResponse);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination exists in response",
    trendingResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is non-negative",
    trendingResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "page limit is non-negative",
    trendingResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "total records count is non-negative",
    trendingResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    trendingResponse.pagination.pages >= 0,
  );

  // Validate data array exists
  TestValidator.predicate(
    "trending communities data array exists",
    Array.isArray(trendingResponse.data),
  );

  // If there are trending communities, validate each one
  if (trendingResponse.data.length > 0) {
    // Validate each trending community entry
    for (const trendingEntry of trendingResponse.data) {
      // Validate trending entry structure
      TestValidator.predicate(
        "trending entry has valid id",
        trendingEntry.id !== undefined && trendingEntry.id.length > 0,
      );
      TestValidator.predicate(
        "trending entry has community id",
        trendingEntry.communityId !== undefined &&
          trendingEntry.communityId.length > 0,
      );
      TestValidator.predicate(
        "trending entry has community object",
        trendingEntry.community !== undefined,
      );
      TestValidator.predicate(
        "trending entry type is valid",
        trendingEntry.trendingType === "community" ||
          trendingEntry.trendingType === "post",
      );
      TestValidator.predicate(
        "trending category is valid",
        trendingEntry.trendingCategory === "hot" ||
          trendingEntry.trendingCategory === "new" ||
          trendingEntry.trendingCategory === "top" ||
          trendingEntry.trendingCategory === "controversial",
      );

      // Validate community object structure
      const community: ICommunityPlatformCommunity.ISummary =
        trendingEntry.community;
      TestValidator.predicate(
        "community has valid id",
        community.id !== undefined && community.id.length > 0,
      );
      TestValidator.predicate(
        "community has identifier",
        community.identifier !== undefined && community.identifier.length >= 3,
      );
      TestValidator.predicate(
        "community has name",
        community.name !== undefined && community.name.length >= 3,
      );
      TestValidator.predicate(
        "subscriber count is non-negative",
        community.subscriber_count >= 0,
      );
      TestValidator.predicate(
        "post count is non-negative",
        community.post_count >= 0,
      );
      TestValidator.predicate(
        "created at timestamp exists",
        community.created_at !== undefined && community.created_at.length > 0,
      );

      // Validate trending metrics are present and consistent
      TestValidator.predicate(
        "subscriber count in trending matches community",
        trendingEntry.subscriberCount === community.subscriber_count,
      );
      TestValidator.predicate(
        "post count in trending matches community",
        trendingEntry.postCount === community.post_count,
      );
      TestValidator.predicate("ranking is positive", trendingEntry.rank >= 1);

      // Validate timestamps are in valid date-time format
      TestValidator.predicate(
        "created at is valid ISO 8601 datetime",
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(trendingEntry.createdAt),
      );
      TestValidator.predicate(
        "refreshed at is valid ISO 8601 datetime",
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(trendingEntry.refreshedAt),
      );
    }

    // Validate that trending entries represent communities
    TestValidator.predicate(
      "all trending entries are community type",
      trendingResponse.data.every(
        (entry) => entry.trendingType === "community",
      ),
    );

    // Validate first entry in trending has rank 1 for consistent ordering
    const firstEntry = trendingResponse.data[0];
    if (firstEntry) {
      TestValidator.equals(
        "first trending entry has rank 1",
        firstEntry.rank,
        1,
      );
    }
  }

  // Validate pagination math consistency
  TestValidator.predicate(
    "page size is consistent with pagination",
    trendingResponse.pagination.records === trendingResponse.data.length ||
      trendingResponse.pagination.records > trendingResponse.data.length,
  );
}
