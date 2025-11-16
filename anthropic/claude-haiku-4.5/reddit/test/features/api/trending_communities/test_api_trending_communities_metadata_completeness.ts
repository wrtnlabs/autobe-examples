import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTrendingCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformTrendingCommunity";

export async function test_api_trending_communities_metadata_completeness(
  connection: api.IConnection,
) {
  // Retrieve trending communities
  const response: IPageICommunityPlatformTrendingCommunity.ISummary =
    await api.functional.communityPlatform.trending.communities.index(
      connection,
    );
  typia.assert(response);

  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination object exists",
    response.pagination !== undefined && response.pagination !== null,
  );
  TestValidator.predicate(
    "current page is non-negative integer",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is non-negative integer",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "total records is non-negative integer",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative integer",
    response.pagination.pages >= 0,
  );

  // Ensure data array exists and is populated
  TestValidator.predicate(
    "data array exists",
    Array.isArray(response.data) && response.data.length > 0,
  );

  // Validate each trending community entry has complete metadata
  for (const trendingCommunity of response.data) {
    // Validate trending entry ID
    TestValidator.predicate(
      "trending community entry has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        trendingCommunity.id,
      ),
    );

    // Validate community foreign key reference
    TestValidator.predicate(
      "trending community has valid communityId",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        trendingCommunity.communityId,
      ),
    );

    // Validate trending type
    TestValidator.predicate(
      "trendingType is 'community'",
      trendingCommunity.trendingType === "community",
    );

    // Validate trending category
    TestValidator.predicate(
      "trendingCategory is one of: hot, new, top, controversial",
      ["hot", "new", "top", "controversial"].includes(
        trendingCommunity.trendingCategory,
      ),
    );

    // Validate trend rank
    TestValidator.predicate(
      "rank is positive integer",
      typeof trendingCommunity.rank === "number" && trendingCommunity.rank >= 1,
    );

    // Validate community object exists and has required fields
    TestValidator.predicate(
      "community object exists",
      trendingCommunity.community !== undefined &&
        trendingCommunity.community !== null,
    );

    const community = trendingCommunity.community;

    // Validate community ID
    TestValidator.predicate(
      "community has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        community.id,
      ),
    );

    // Validate community identifier (URL-safe handle)
    TestValidator.predicate(
      "community identifier is URL-safe handle (3-32 chars, lowercase alphanumeric and underscores)",
      /^[a-z0-9_]{3,32}$/.test(community.identifier),
    );

    // Validate community name
    TestValidator.predicate(
      "community name is string between 3-100 characters",
      typeof community.name === "string" &&
        community.name.length >= 3 &&
        community.name.length <= 100,
    );

    // Validate subscriber count
    TestValidator.predicate(
      "subscriber_count is non-negative integer",
      typeof community.subscriber_count === "number" &&
        community.subscriber_count >= 0,
    );

    // Validate post count
    TestValidator.predicate(
      "post_count is non-negative integer",
      typeof community.post_count === "number" && community.post_count >= 0,
    );

    // Validate creation timestamp format
    TestValidator.predicate(
      "created_at is ISO 8601 datetime",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(community.created_at),
    );

    // Validate refreshedAt timestamp format
    TestValidator.predicate(
      "refreshedAt is ISO 8601 datetime",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
        trendingCommunity.refreshedAt,
      ),
    );

    // Validate trend scores based on category
    if (trendingCommunity.trendingCategory === "hot") {
      TestValidator.predicate(
        "hot category has hotScore defined",
        trendingCommunity.hotScore !== undefined &&
          trendingCommunity.hotScore !== null &&
          typeof trendingCommunity.hotScore === "number",
      );
    }

    if (trendingCommunity.trendingCategory === "top") {
      TestValidator.predicate(
        "top category has topScore defined",
        trendingCommunity.topScore !== undefined &&
          trendingCommunity.topScore !== null &&
          typeof trendingCommunity.topScore === "number",
      );
    }

    if (trendingCommunity.trendingCategory === "controversial") {
      TestValidator.predicate(
        "controversial category has controversyScore defined",
        trendingCommunity.controversyScore !== undefined &&
          trendingCommunity.controversyScore !== null &&
          typeof trendingCommunity.controversyScore === "number",
      );
    }

    if (trendingCommunity.trendingCategory === "new") {
      TestValidator.predicate(
        "new category has trendVelocity defined",
        trendingCommunity.trendVelocity !== undefined &&
          trendingCommunity.trendVelocity !== null &&
          typeof trendingCommunity.trendVelocity === "number",
      );
    }
  }

  // Verify metadata sufficiency - ensure all essential display fields are present
  TestValidator.predicate(
    "all communities have metadata for display without additional calls",
    response.data.every(
      (tc) =>
        tc.id &&
        tc.communityId &&
        tc.community.id &&
        tc.community.identifier &&
        tc.community.name &&
        tc.community.subscriber_count !== undefined &&
        tc.community.post_count !== undefined &&
        tc.community.created_at &&
        tc.rank &&
        tc.trendingCategory &&
        tc.refreshedAt,
    ),
  );
}
