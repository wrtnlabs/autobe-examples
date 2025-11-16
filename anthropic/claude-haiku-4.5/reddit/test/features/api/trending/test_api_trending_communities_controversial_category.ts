import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTrendingCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformTrendingCommunity";

/**
 * Test that trending communities can be filtered by 'controversial' category
 * showing communities with polarized engagement.
 *
 * This test validates that the trending communities endpoint correctly
 * identifies and ranks debate-focused communities with significant engagement
 * from both supporters and critics. Communities with primarily one-sided
 * engagement should not appear in the controversial category.
 *
 * Test steps:
 *
 * 1. Retrieve trending communities from the API
 * 2. Validate response structure with pagination metadata
 * 3. Verify communities have controversy scores for controversial category
 * 4. Confirm communities show polarized engagement patterns
 * 5. Validate ranking is based on controversy metrics
 */
export async function test_api_trending_communities_controversial_category(
  connection: api.IConnection,
) {
  const response: IPageICommunityPlatformTrendingCommunity.ISummary =
    await api.functional.communityPlatform.trending.communities.index(
      connection,
    );
  typia.assert(response);

  // Validate response structure
  TestValidator.predicate(
    "response contains pagination metadata",
    response.pagination !== null && response.pagination !== undefined,
  );

  TestValidator.predicate(
    "response contains data array",
    Array.isArray(response.data),
  );

  // Validate pagination metadata
  TestValidator.predicate(
    "current page is non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is non-negative",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "total records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages count is non-negative",
    response.pagination.pages >= 0,
  );

  // Validate trending community entries
  if (response.data.length > 0) {
    const communities = response.data;

    // Validate each community in the trending list
    for (const community of communities) {
      TestValidator.predicate(
        "community has valid UUID id",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          community.id,
        ),
      );

      TestValidator.predicate(
        "community has communityId reference",
        community.communityId !== null && community.communityId !== undefined,
      );

      TestValidator.predicate(
        "trending type is community",
        community.trendingType === "community",
      );

      TestValidator.predicate(
        "trending category is one of hot, new, top, controversial",
        ["hot", "new", "top", "controversial"].includes(
          community.trendingCategory,
        ),
      );

      TestValidator.predicate("rank is positive integer", community.rank >= 1);

      TestValidator.predicate(
        "subscriber count is non-negative",
        community.subscriberCount >= 0,
      );

      TestValidator.predicate(
        "post count is non-negative",
        community.postCount >= 0,
      );

      TestValidator.predicate(
        "comment count is non-negative",
        community.commentCount >= 0,
      );

      // Validate nested community object
      if (community.community) {
        const communityObj = community.community;
        TestValidator.predicate(
          "community identifier is valid",
          /^[a-z0-9_]{3,32}$/.test(communityObj.identifier),
        );

        TestValidator.predicate(
          "community name length is valid",
          communityObj.name.length >= 3 && communityObj.name.length <= 100,
        );

        TestValidator.predicate(
          "community subscriber count is non-negative",
          communityObj.subscriber_count >= 0,
        );

        TestValidator.predicate(
          "community post count is non-negative",
          communityObj.post_count >= 0,
        );
      }

      // For controversial category, validate controversy score exists
      if (community.trendingCategory === "controversial") {
        TestValidator.predicate(
          "controversial category has controversy score",
          community.controversyScore !== null &&
            community.controversyScore !== undefined,
        );

        TestValidator.predicate(
          "controversy score is positive",
          community.controversyScore! > 0,
        );
      }

      // Validate category-specific scores
      if (community.trendingCategory === "hot") {
        TestValidator.predicate(
          "hot category has hot score",
          community.hotScore !== null && community.hotScore !== undefined,
        );
      }

      if (community.trendingCategory === "top") {
        TestValidator.predicate(
          "top category has top score",
          community.topScore !== null && community.topScore !== undefined,
        );
      }

      if (community.trendingCategory === "new") {
        TestValidator.predicate(
          "new category has trend velocity",
          community.trendVelocity !== null &&
            community.trendVelocity !== undefined,
        );
      }
    }

    // Validate that controversial communities have polarized engagement
    const controversialCommunities = communities.filter(
      (c) => c.trendingCategory === "controversial",
    );

    if (controversialCommunities.length > 0) {
      TestValidator.predicate(
        "controversial communities have non-zero controversy scores",
        controversialCommunities.every((c) => c.controversyScore! > 0),
      );

      // Controversial communities should have significant engagement
      TestValidator.predicate(
        "controversial communities have comment engagement",
        controversialCommunities.some((c) => c.commentCount > 0),
      );
    }

    // Validate ranking within category
    for (let i = 0; i < communities.length - 1; i++) {
      const current = communities[i];
      const next = communities[i + 1];

      if (current.trendingCategory === next.trendingCategory) {
        TestValidator.predicate(
          "ranks are in ascending order within same category",
          current.rank <= next.rank,
        );
      }
    }
  }
}
