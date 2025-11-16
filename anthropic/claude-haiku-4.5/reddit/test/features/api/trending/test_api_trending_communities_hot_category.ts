import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTrendingCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformTrendingCommunity";

export async function test_api_trending_communities_hot_category(
  connection: api.IConnection,
) {
  // Step 1: Fetch trending communities in hot category
  const hotTrendingResponse =
    await api.functional.communityPlatform.trending.communities.index(
      connection,
    );
  typia.assert(hotTrendingResponse);

  // Step 2: Validate response structure
  TestValidator.predicate(
    "response has pagination metadata",
    hotTrendingResponse.pagination !== null &&
      hotTrendingResponse.pagination !== undefined,
  );

  TestValidator.predicate(
    "response has data array",
    Array.isArray(hotTrendingResponse.data),
  );

  // Step 3: Validate pagination properties
  TestValidator.predicate(
    "current page is valid",
    hotTrendingResponse.pagination.current >= 0,
  );

  TestValidator.predicate(
    "limit is positive",
    hotTrendingResponse.pagination.limit > 0,
  );

  TestValidator.predicate(
    "total records count is valid",
    hotTrendingResponse.pagination.records >= 0,
  );

  TestValidator.predicate(
    "total pages count is valid",
    hotTrendingResponse.pagination.pages >= 0,
  );

  // Step 4: If data exists, validate trending communities
  if (hotTrendingResponse.data.length > 0) {
    // Validate trending community structure
    const firstCommunity = hotTrendingResponse.data[0];
    typia.assert(firstCommunity);

    TestValidator.predicate(
      "trending community has valid ID",
      typeof firstCommunity.id === "string" && firstCommunity.id.length > 0,
    );

    TestValidator.predicate(
      "trending community has community ID reference",
      typeof firstCommunity.communityId === "string" &&
        firstCommunity.communityId.length > 0,
    );

    TestValidator.predicate(
      "trending community has community object",
      firstCommunity.community !== null &&
        firstCommunity.community !== undefined,
    );

    TestValidator.predicate(
      "trending type is community",
      firstCommunity.trendingType === "community",
    );

    TestValidator.predicate(
      "trending category is hot",
      firstCommunity.trendingCategory === "hot",
    );

    TestValidator.predicate(
      "subscriber count is non-negative",
      firstCommunity.subscriberCount >= 0,
    );

    TestValidator.predicate(
      "post count is non-negative",
      firstCommunity.postCount >= 0,
    );

    TestValidator.predicate(
      "comment count is non-negative",
      firstCommunity.commentCount >= 0,
    );

    TestValidator.predicate(
      "rank is positive integer",
      firstCommunity.rank >= 1,
    );

    // Validate community summary object
    const community = firstCommunity.community;
    TestValidator.predicate(
      "community ID is valid UUID",
      typeof community.id === "string" && community.id.length > 0,
    );

    TestValidator.predicate(
      "community identifier is valid",
      typeof community.identifier === "string" &&
        community.identifier.length >= 3 &&
        community.identifier.length <= 32,
    );

    TestValidator.predicate(
      "community name is valid",
      typeof community.name === "string" &&
        community.name.length >= 3 &&
        community.name.length <= 100,
    );

    TestValidator.predicate(
      "community subscriber count is non-negative",
      community.subscriber_count >= 0,
    );

    TestValidator.predicate(
      "community post count is non-negative",
      community.post_count >= 0,
    );

    // Step 5: Validate hot score metrics and ranking
    if (hotTrendingResponse.data.length > 1) {
      const communities = hotTrendingResponse.data;

      // Verify ranking is sequential
      for (let i = 0; i < communities.length - 1; i++) {
        TestValidator.predicate(
          `community ${i} rank is less than community ${i + 1}`,
          communities[i].rank < communities[i + 1].rank,
        );
      }

      // Validate hot scores exist and are ordered (higher scores trend hotter)
      for (const comm of communities) {
        if (comm.hotScore !== null && comm.hotScore !== undefined) {
          TestValidator.predicate(
            `community ${comm.id} has valid hot score`,
            typeof comm.hotScore === "number" && comm.hotScore >= 0,
          );
        }
      }

      // Validate velocity metrics show rate of change
      for (const comm of communities) {
        if (comm.trendVelocity !== null && comm.trendVelocity !== undefined) {
          TestValidator.predicate(
            `community ${comm.id} has valid trend velocity`,
            typeof comm.trendVelocity === "number",
          );
        }
      }
    }

    // Step 6: Validate timestamp fields
    TestValidator.predicate(
      "created at is valid ISO date",
      typeof firstCommunity.createdAt === "string" &&
        firstCommunity.createdAt.length > 0,
    );

    TestValidator.predicate(
      "refreshed at is valid ISO date",
      typeof firstCommunity.refreshedAt === "string" &&
        firstCommunity.refreshedAt.length > 0,
    );
  }
}
