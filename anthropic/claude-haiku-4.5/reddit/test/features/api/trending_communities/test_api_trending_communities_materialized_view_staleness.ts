import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTrendingCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformTrendingCommunity";

export async function test_api_trending_communities_materialized_view_staleness(
  connection: api.IConnection,
) {
  // Call the trending communities endpoint
  const response: IPageICommunityPlatformTrendingCommunity.ISummary =
    await api.functional.communityPlatform.trending.communities.index(
      connection,
    );
  typia.assert(response);

  // Validate pagination structure exists and has valid properties
  TestValidator.predicate(
    "pagination object exists",
    response.pagination !== null && response.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
  TestValidator.predicate(
    "records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    response.pagination.pages >= 0,
  );

  // Validate pagination consistency
  if (response.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      response.pagination.records / response.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation matches records and limit",
      response.pagination.pages,
      expectedPages,
    );
  }

  // Validate data array exists and is an array
  TestValidator.predicate(
    "data array exists and is an array",
    Array.isArray(response.data),
  );

  // If trending communities exist, validate structure of entries
  if (response.data.length > 0) {
    const firstCommunity = response.data[0];
    typia.assert(firstCommunity);

    // Validate trending community entry fields
    TestValidator.predicate(
      "trending entry has valid id",
      typeof firstCommunity.id === "string" && firstCommunity.id.length > 0,
    );
    TestValidator.predicate(
      "trending entry has valid communityId",
      typeof firstCommunity.communityId === "string" &&
        firstCommunity.communityId.length > 0,
    );
    TestValidator.predicate(
      "trending type is community",
      firstCommunity.trendingType === "community",
    );
    TestValidator.predicate(
      "trending category is valid",
      ["hot", "new", "top", "controversial"].includes(
        firstCommunity.trendingCategory,
      ),
    );
    TestValidator.predicate(
      "rank is positive integer",
      firstCommunity.rank >= 1,
    );

    // Validate nested community object
    TestValidator.predicate(
      "community object exists",
      firstCommunity.community !== null &&
        firstCommunity.community !== undefined,
    );
    TestValidator.predicate(
      "community has valid id",
      typeof firstCommunity.community.id === "string" &&
        firstCommunity.community.id.length > 0,
    );
    TestValidator.predicate(
      "community has identifier",
      typeof firstCommunity.community.identifier === "string" &&
        firstCommunity.community.identifier.length > 0,
    );
    TestValidator.predicate(
      "community has name",
      typeof firstCommunity.community.name === "string" &&
        firstCommunity.community.name.length > 0,
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

    // Validate timestamps in ISO format
    TestValidator.predicate(
      "createdAt is valid datetime string",
      typeof firstCommunity.createdAt === "string" &&
        firstCommunity.createdAt.length > 0,
    );
    TestValidator.predicate(
      "refreshedAt is valid datetime string",
      typeof firstCommunity.refreshedAt === "string" &&
        firstCommunity.refreshedAt.length > 0,
    );

    // Validate score fields based on category (non-null checks)
    if (firstCommunity.trendingCategory === "hot") {
      TestValidator.predicate(
        "hot score exists for hot category",
        firstCommunity.hotScore !== null &&
          firstCommunity.hotScore !== undefined,
      );
    }
    if (firstCommunity.trendingCategory === "top") {
      TestValidator.predicate(
        "top score exists for top category",
        firstCommunity.topScore !== null &&
          firstCommunity.topScore !== undefined,
      );
    }
    if (firstCommunity.trendingCategory === "controversial") {
      TestValidator.predicate(
        "controversy score exists for controversial category",
        firstCommunity.controversyScore !== null &&
          firstCommunity.controversyScore !== undefined,
      );
    }
    if (firstCommunity.trendingCategory === "new") {
      TestValidator.predicate(
        "trend velocity exists for new category",
        firstCommunity.trendVelocity !== null &&
          firstCommunity.trendVelocity !== undefined,
      );
    }

    // Validate multiple entries if available
    if (response.data.length > 1) {
      const secondCommunity = response.data[1];
      typia.assert(secondCommunity);
      TestValidator.predicate(
        "second community rank is valid",
        secondCommunity.rank >= 1,
      );
      TestValidator.predicate(
        "ranks are ordered properly",
        secondCommunity.rank >= firstCommunity.rank,
      );
    }
  }
}
