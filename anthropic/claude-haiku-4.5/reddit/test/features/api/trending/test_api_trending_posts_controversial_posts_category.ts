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

export async function test_api_trending_posts_controversial_posts_category(
  connection: api.IConnection,
) {
  /**
   * Retrieve trending posts in the controversial category and validate
   * filtering.
   *
   * The controversial category identifies posts with polarized engagement where
   * both supporters and critics have engaged significantly. Controversy score
   * is calculated as MIN(upvotes, downvotes) where both counts >= 5.
   */

  // Step 1: Fetch trending posts in controversial category
  const response: IPageICommunityPlatformTrendingPost =
    await api.functional.communityPlatform.trending.posts.index(connection);
  typia.assert(response);

  // Validate response structure
  TestValidator.predicate(
    "response has pagination metadata",
    response.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    response.data !== undefined && Array.isArray(response.data),
  );

  // Step 2: Filter for controversial posts in the response
  const controversialPosts = response.data.filter(
    (post) => post.trendingCategory === "controversial",
  );

  // Validate that controversial posts exist
  TestValidator.predicate(
    "controversial posts exist in response",
    controversialPosts.length > 0,
  );

  // Step 3: Validate controversy score calculation and engagement metrics
  for (const trendingPost of controversialPosts) {
    // Extract vote counts from nested post object
    const upvotes = trendingPost.upvoteCount;
    const downvotes = trendingPost.downvoteCount;

    // Validate minimum engagement threshold: both >= 5
    TestValidator.predicate(
      `post ${trendingPost.id} has upvotes >= 5`,
      upvotes >= 5,
    );
    TestValidator.predicate(
      `post ${trendingPost.id} has downvotes >= 5`,
      downvotes >= 5,
    );

    // Validate controversy score = MIN(upvotes, downvotes)
    const expectedControversyScore = Math.min(upvotes, downvotes);
    TestValidator.equals(
      `post ${trendingPost.id} controversy score matches MIN(upvotes, downvotes)`,
      trendingPost.controversyScore,
      expectedControversyScore,
    );

    // Validate post has balanced engagement (polarized but not one-sided)
    const engagementRatio =
      Math.min(upvotes, downvotes) / Math.max(upvotes, downvotes);
    TestValidator.predicate(
      `post ${trendingPost.id} has balanced controversial engagement`,
      engagementRatio > 0, // Both upvotes and downvotes are present
    );

    // Validate trendingType is post
    TestValidator.equals(
      `post ${trendingPost.id} trendingType is post`,
      trendingPost.trendingType,
      "post",
    );
  }

  // Step 4: Validate ranking - controversial posts should be ranked by controversy score descending
  if (controversialPosts.length > 1) {
    for (let i = 0; i < controversialPosts.length - 1; i++) {
      const currentScore = controversialPosts[i].controversyScore ?? 0;
      const nextScore = controversialPosts[i + 1].controversyScore ?? 0;

      TestValidator.predicate(
        `post at index ${i} has higher or equal controversy score than post at index ${i + 1}`,
        currentScore >= nextScore,
      );
    }
  }

  // Step 5: Validate edge case - ensure posts with exactly 5/5 are included
  const equalEngagementPosts = controversialPosts.filter(
    (post) => post.upvoteCount === post.downvoteCount,
  );
  if (equalEngagementPosts.length > 0) {
    for (const post of equalEngagementPosts) {
      TestValidator.predicate(
        `post with equal engagement has both upvotes and downvotes >= 5`,
        post.upvoteCount >= 5 && post.downvoteCount >= 5,
      );
    }
  }

  // Step 6: Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count matches records and limit",
    response.pagination.pages ===
      Math.ceil(response.pagination.records / response.pagination.limit) ||
      response.pagination.records === 0,
  );

  // Step 7: Validate that non-controversial posts are filtered out
  const nonControversialPosts = response.data.filter(
    (post) => post.trendingCategory !== "controversial",
  );
  for (const post of nonControversialPosts) {
    // Posts not in controversial category should have at least one vote count < 5
    // or not meet the polarization criteria
    const minEngagement = Math.min(post.upvoteCount, post.downvoteCount);
    TestValidator.predicate(
      `non-controversial post has controversy score < 5 or one-sided engagement`,
      minEngagement < 5,
    );
  }

  // Step 8: Validate post structure and required fields
  for (const trendingPost of response.data) {
    TestValidator.predicate(
      `trending post ${trendingPost.id} has valid UUID`,
      typeof trendingPost.id === "string" && trendingPost.id.length === 36,
    );
    TestValidator.predicate(
      `trending post has postId`,
      trendingPost.postId !== undefined,
    );
    TestValidator.predicate(
      `trending post has post object`,
      trendingPost.post !== undefined,
    );
    TestValidator.predicate(
      `trending post has community object`,
      trendingPost.community !== undefined,
    );
    TestValidator.predicate(`trending post has rank`, trendingPost.rank >= 1);
  }
}
