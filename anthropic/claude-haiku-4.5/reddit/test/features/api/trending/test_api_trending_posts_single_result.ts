import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformTrendingPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTrendingPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformTrendingPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformTrendingPost";

export async function test_api_trending_posts_single_result(
  connection: api.IConnection,
) {
  /**
   * Test edge case when only one trending post exists in system.
   *
   * This test validates that when the trending posts endpoint returns a single
   * result (or when result count is smaller than requested limit), the
   * pagination metadata is correct and complete:
   *
   * - Records=1 indicating exactly one post exists
   * - Pages=1 indicating all results fit in single page
   * - Current=0 or 1 indicating current page number
   * - Data array contains exactly one trending post with full metadata
   * - No next cursor or pagination token for additional results
   */

  // Retrieve trending posts from the API
  const response: IPageICommunityPlatformTrendingPost =
    await api.functional.communityPlatform.trending.posts.index(connection);

  // Validate complete response structure and all types
  typia.assert(response);

  // Get pagination metadata
  const { pagination, data } = response;

  // Verify pagination properties exist and are valid numbers
  TestValidator.predicate(
    "pagination has valid current page",
    pagination.current >= 0,
  );

  TestValidator.predicate("pagination has valid limit", pagination.limit >= 0);

  TestValidator.predicate(
    "pagination has valid total records",
    pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination has valid total pages",
    pagination.pages >= 0,
  );

  // Verify pagination calculation is mathematically correct
  TestValidator.predicate(
    "pages value is correct for records and limit",
    pagination.limit === 0
      ? pagination.pages === 0
      : pagination.pages === Math.ceil(pagination.records / pagination.limit),
  );

  // Verify data array is present
  TestValidator.predicate("data array is present", Array.isArray(data));

  // When single result exists (edge case scenario)
  if (pagination.records === 1) {
    // Validate that data array contains exactly one item
    TestValidator.equals(
      "data array contains exactly one trending post",
      data.length,
      1,
    );

    // Validate pages count is 1 for single record
    TestValidator.equals(
      "pages equals 1 for single record",
      pagination.pages,
      1,
    );

    // Current page should be 0 or 1 (implementation dependent, but must be valid)
    TestValidator.predicate(
      "current page is valid for single result",
      pagination.current === 0 || pagination.current === 1,
    );

    // Get and validate the single trending post
    const trendingPost = data[0];

    // Verify all critical trending post fields are present
    TestValidator.predicate(
      "trending post has valid id",
      typeof trendingPost.id === "string" && trendingPost.id.length > 0,
    );

    TestValidator.predicate(
      "trending post has postId reference",
      typeof trendingPost.postId === "string" && trendingPost.postId.length > 0,
    );

    TestValidator.predicate(
      "trending post has communityId reference",
      typeof trendingPost.communityId === "string" &&
        trendingPost.communityId.length > 0,
    );

    TestValidator.predicate(
      "trending post includes post summary data",
      trendingPost.post !== null && trendingPost.post !== undefined,
    );

    TestValidator.predicate(
      "trending post includes community summary data",
      trendingPost.community !== null && trendingPost.community !== undefined,
    );

    // Verify trending category
    TestValidator.predicate(
      "trending post has valid trending category",
      ["hot", "new", "top", "controversial"].includes(
        trendingPost.trendingCategory,
      ),
    );

    // Verify engagement metrics are present
    TestValidator.predicate(
      "trending post has engagement metrics",
      trendingPost.upvoteCount >= 0 &&
        trendingPost.downvoteCount >= 0 &&
        trendingPost.commentCount >= 0,
    );
  }
}
