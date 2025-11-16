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

export async function test_api_trending_posts_top_posts_category(
  connection: api.IConnection,
) {
  // Retrieve the first page of top trending posts
  const firstPageResponse: IPageICommunityPlatformTrendingPost =
    await api.functional.communityPlatform.trending.posts.index(connection);

  typia.assert(firstPageResponse);

  // Validate pagination metadata exists
  TestValidator.predicate(
    "pagination metadata should be present",
    firstPageResponse.pagination !== null &&
      firstPageResponse.pagination !== undefined,
  );

  const pagination = firstPageResponse.pagination;
  typia.assert(pagination);

  // Validate pagination properties
  TestValidator.predicate(
    "current page should be non-negative",
    pagination.current >= 0,
  );

  TestValidator.predicate("limit should be positive", pagination.limit > 0);

  TestValidator.predicate(
    "total records should be non-negative",
    pagination.records >= 0,
  );

  TestValidator.predicate(
    "total pages should be non-negative",
    pagination.pages >= 0,
  );

  // Validate data array exists
  TestValidator.predicate(
    "data array should be present",
    Array.isArray(firstPageResponse.data),
  );

  if (firstPageResponse.data.length > 0) {
    // Validate trending posts structure and top category specific behavior
    const posts = firstPageResponse.data;

    // Check post structure and validate top scoring logic
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      typia.assert(post);

      TestValidator.predicate(
        `post ${i} should have trending type 'post'`,
        post.trendingType === "post",
      );

      TestValidator.predicate(
        `post ${i} should have valid trending category`,
        ["hot", "new", "top", "controversial"].includes(post.trendingCategory),
      );

      TestValidator.predicate(
        `post ${i} should have valid rank`,
        post.rank >= 1,
      );

      TestValidator.predicate(
        `post ${i} should have non-negative upvote count`,
        post.upvoteCount >= 0,
      );

      TestValidator.predicate(
        `post ${i} should have non-negative downvote count`,
        post.downvoteCount >= 0,
      );

      TestValidator.predicate(
        `post ${i} should have non-negative comment count`,
        post.commentCount >= 0,
      );

      TestValidator.predicate(
        `post ${i} should have non-negative subscriber count`,
        post.subscriberCount >= 0,
      );

      TestValidator.predicate(
        `post ${i} should have valid post summary`,
        post.post !== null && post.post !== undefined,
      );

      TestValidator.predicate(
        `post ${i} should have valid community summary`,
        post.community !== null && post.community !== undefined,
      );

      // Validate that topScore equals net vote count (upvotes - downvotes)
      const expectedTopScore = post.upvoteCount - post.downvoteCount;
      if (post.topScore !== null && post.topScore !== undefined) {
        TestValidator.equals(
          `post ${i} top score should equal upvotes minus downvotes`,
          post.topScore,
          expectedTopScore,
        );
      }
    }

    // Validate ranking consistency by top score
    // Posts should be ranked by absolute net vote score regardless of creation time
    let previousTopScore: number | null = null;
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      const currentTopScore = post.topScore;

      // Verify monotonic decreasing order of top scores
      if (currentTopScore !== null && currentTopScore !== undefined) {
        if (previousTopScore !== null) {
          TestValidator.predicate(
            `post ${i} top score should be less than or equal to previous post (descending order)`,
            currentTopScore <= previousTopScore,
          );
        }
        previousTopScore = currentTopScore;
      }

      // Verify rank values are sequential
      TestValidator.equals(
        `post ${i} rank should equal index plus one`,
        post.rank,
        i + 1,
      );
    }

    // Test pagination - retrieve next page if available
    if (pagination.pages > 1) {
      const secondPageResponse: IPageICommunityPlatformTrendingPost =
        await api.functional.communityPlatform.trending.posts.index(connection);

      typia.assert(secondPageResponse);

      // Validate that we can paginate through trending posts
      TestValidator.predicate(
        "second page should have pagination metadata",
        secondPageResponse.pagination !== null &&
          secondPageResponse.pagination !== undefined,
      );

      // If both pages have data, validate that first page posts rank higher than second page
      if (
        firstPageResponse.data.length > 0 &&
        secondPageResponse.data.length > 0
      ) {
        const lastFirstPagePost =
          firstPageResponse.data[firstPageResponse.data.length - 1];
        const firstSecondPagePost = secondPageResponse.data[0];

        // Validate ranking across pages
        TestValidator.predicate(
          "first page last post rank should be less than second page first post rank",
          lastFirstPagePost.rank < firstSecondPagePost.rank,
        );

        // If both have top scores, first page should have higher or equal scores
        if (
          lastFirstPagePost.topScore !== null &&
          lastFirstPagePost.topScore !== undefined &&
          firstSecondPagePost.topScore !== null &&
          firstSecondPagePost.topScore !== undefined
        ) {
          TestValidator.predicate(
            "first page last post should have top score >= second page first post",
            lastFirstPagePost.topScore >= firstSecondPagePost.topScore,
          );
        }
      }
    }
  }

  // Validate that pagination values are consistent
  if (firstPageResponse.data.length > 0) {
    TestValidator.predicate(
      "data length should not exceed limit",
      firstPageResponse.data.length <= pagination.limit,
    );
  }

  // Validate timestamps are in valid ISO format for all posts
  for (const post of firstPageResponse.data) {
    TestValidator.predicate(
      "post created_at should be valid ISO datetime",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(post.createdAt),
    );

    TestValidator.predicate(
      "post refreshed_at should be valid ISO datetime",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(post.refreshedAt),
    );

    // Validate that refreshedAt is not before createdAt (materialized view should be current)
    const createdTime = new Date(post.createdAt).getTime();
    const refreshedTime = new Date(post.refreshedAt).getTime();
    TestValidator.predicate(
      "post refreshed_at should be equal to or after created_at",
      refreshedTime >= createdTime,
    );
  }
}
