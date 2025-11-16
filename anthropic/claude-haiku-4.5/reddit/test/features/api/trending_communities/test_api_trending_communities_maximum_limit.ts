import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTrendingCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformTrendingCommunity";

export async function test_api_trending_communities_maximum_limit(
  connection: api.IConnection,
) {
  // Test 1: Request with maximum allowed limit (1000)
  const responseWithMaxLimit: IPageICommunityPlatformTrendingCommunity.ISummary =
    await api.functional.communityPlatform.trending.communities.index(
      connection,
    );
  typia.assert(responseWithMaxLimit);

  // Validate that response contains pagination metadata
  TestValidator.predicate(
    "response has pagination object",
    responseWithMaxLimit.pagination !== null &&
      responseWithMaxLimit.pagination !== undefined,
  );

  // Validate that response contains data array
  TestValidator.predicate(
    "response has data array",
    Array.isArray(responseWithMaxLimit.data),
  );

  // Validate pagination metadata structure
  const pagination =
    responseWithMaxLimit.pagination satisfies IPage.IPagination as IPage.IPagination;
  TestValidator.predicate(
    "pagination current page is valid",
    pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit is greater than or equal to 0",
    pagination.limit >= 0,
  );

  TestValidator.predicate(
    "pagination records count is greater than or equal to 0",
    pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages count is greater than or equal to 0",
    pagination.pages >= 0,
  );

  // Validate that each community in data has required fields
  if (responseWithMaxLimit.data.length > 0) {
    const firstCommunity = responseWithMaxLimit
      .data[0] satisfies ICommunityPlatformTrendingCommunity.ISummary as ICommunityPlatformTrendingCommunity.ISummary;

    TestValidator.predicate(
      "trending community has id",
      firstCommunity.id !== undefined && firstCommunity.id !== null,
    );

    TestValidator.predicate(
      "trending community has communityId",
      firstCommunity.communityId !== undefined &&
        firstCommunity.communityId !== null,
    );

    TestValidator.predicate(
      "trending community has community object",
      firstCommunity.community !== undefined &&
        firstCommunity.community !== null,
    );

    // Validate community summary structure
    const community =
      firstCommunity.community satisfies ICommunityPlatformCommunity.ISummary as ICommunityPlatformCommunity.ISummary;
    TestValidator.predicate(
      "community has identifier",
      community.identifier !== undefined && community.identifier !== null,
    );

    TestValidator.predicate(
      "community identifier matches pattern",
      /^[a-z0-9_]+$/.test(community.identifier),
    );

    TestValidator.predicate(
      "community has name",
      community.name !== undefined && community.name !== null,
    );

    TestValidator.predicate(
      "community subscriber count is non-negative",
      community.subscriber_count >= 0,
    );

    TestValidator.predicate(
      "community post count is non-negative",
      community.post_count >= 0,
    );
  }

  // Validate trending metadata
  if (responseWithMaxLimit.data.length > 0) {
    const firstTrending = responseWithMaxLimit
      .data[0] satisfies ICommunityPlatformTrendingCommunity.ISummary as ICommunityPlatformTrendingCommunity.ISummary;

    TestValidator.predicate(
      "trending type is community",
      firstTrending.trendingType === "community" ||
        firstTrending.trendingType === "post",
    );

    TestValidator.predicate(
      "trending category is valid",
      ["hot", "new", "top", "controversial"].includes(
        firstTrending.trendingCategory,
      ),
    );

    TestValidator.predicate("rank is positive", firstTrending.rank > 0);

    TestValidator.predicate(
      "subscriber count is non-negative",
      firstTrending.subscriberCount >= 0,
    );

    TestValidator.predicate(
      "post count is non-negative",
      firstTrending.postCount >= 0,
    );

    TestValidator.predicate(
      "comment count is non-negative",
      firstTrending.commentCount >= 0,
    );

    TestValidator.predicate(
      "created_at is valid date",
      new Date(firstTrending.createdAt).getTime() > 0,
    );

    TestValidator.predicate(
      "refreshed_at is valid date",
      new Date(firstTrending.refreshedAt).getTime() > 0,
    );
  }

  // Validate that the limit in pagination is within acceptable range
  TestValidator.predicate(
    "pagination limit does not exceed maximum (1000)",
    pagination.limit <= 1000,
  );

  // Validate that data length does not exceed limit
  TestValidator.predicate(
    "data array length does not exceed limit",
    responseWithMaxLimit.data.length <= pagination.limit,
  );
}
