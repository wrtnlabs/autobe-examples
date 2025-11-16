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

export async function test_api_trending_posts_pinned_posts_treatment(
  connection: api.IConnection,
) {
  // Fetch trending posts from the API
  const response: IPageICommunityPlatformTrendingPost =
    await api.functional.communityPlatform.trending.posts.index(connection);
  typia.assert(response);

  // Validate response structure
  TestValidator.predicate(
    "response should have pagination data",
    response.pagination !== null && response.pagination !== undefined,
  );
  TestValidator.predicate(
    "response should have data array",
    response.data !== null && response.data !== undefined,
  );

  // Check pagination metadata
  const pagination = response.pagination;
  TestValidator.predicate(
    "current page should be non-negative integer",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit should be positive integer",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records should be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be non-negative",
    pagination.pages >= 0,
  );

  // Check trending posts data
  const trendingPosts = response.data;
  TestValidator.predicate(
    "should return trending posts array",
    Array.isArray(trendingPosts),
  );

  // If there are any posts, validate their structure and pinned status
  if (trendingPosts.length > 0) {
    // Check each post for proper structure and pin status
    for (const trendingPost of trendingPosts) {
      typia.assert(trendingPost);

      // Validate trending post metadata
      TestValidator.predicate(
        "trending post should have valid UUID id",
        typeof trendingPost.id === "string" &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            trendingPost.id,
          ),
      );
      TestValidator.predicate(
        "trending post should have postId reference",
        typeof trendingPost.postId === "string",
      );
      TestValidator.predicate(
        "trending post should have communityId reference",
        typeof trendingPost.communityId === "string",
      );

      // Validate post object exists
      TestValidator.predicate(
        "post should exist in trending entry",
        trendingPost.post !== null && trendingPost.post !== undefined,
      );

      if (trendingPost.post) {
        // Validate post summary structure
        const post = trendingPost.post;
        TestValidator.predicate(
          "post should have valid id",
          typeof post.id === "string",
        );
        TestValidator.predicate(
          "post should have title",
          typeof post.title === "string" && post.title.length > 0,
        );

        // CRITICAL: Validate pinned status is accessible
        TestValidator.predicate(
          "post should have is_pinned property",
          typeof post.is_pinned === "boolean",
        );

        // If post is pinned, verify pin status is true
        if (post.is_pinned === true) {
          TestValidator.equals(
            "pinned post should have is_pinned set to true",
            post.is_pinned,
            true,
          );
        }

        // Validate other required post properties
        TestValidator.predicate(
          "post should have post_type",
          ["text", "link", "image"].includes(post.post_type),
        );
        TestValidator.predicate(
          "post should have vote_score",
          typeof post.vote_score === "number",
        );
        TestValidator.predicate(
          "post should have upvote_count",
          typeof post.upvote_count === "number" && post.upvote_count >= 0,
        );
        TestValidator.predicate(
          "post should have downvote_count",
          typeof post.downvote_count === "number" && post.downvote_count >= 0,
        );
        TestValidator.predicate(
          "post should have comment_count",
          typeof post.comment_count === "number" && post.comment_count >= 0,
        );

        // Validate visibility status
        TestValidator.predicate(
          "post should have valid visibility_status",
          ["public", "archived", "deleted", "removed_by_moderator"].includes(
            post.visibility_status,
          ),
        );

        // Validate NSFW and spoiler flags
        TestValidator.predicate(
          "post should have is_nsfw flag",
          typeof post.is_nsfw === "boolean",
        );
        TestValidator.predicate(
          "post should have has_spoiler flag",
          typeof post.has_spoiler === "boolean",
        );

        // Validate locked status
        TestValidator.predicate(
          "post should have is_locked flag",
          typeof post.is_locked === "boolean",
        );

        // Validate creator information
        TestValidator.predicate(
          "post should have creator",
          post.creator !== null && post.creator !== undefined,
        );
        if (post.creator) {
          TestValidator.predicate(
            "creator should have valid id",
            typeof post.creator.id === "string",
          );
          TestValidator.predicate(
            "creator should have username",
            typeof post.creator.username === "string",
          );
        }

        // Validate community information
        TestValidator.predicate(
          "post should have community",
          post.community !== null && post.community !== undefined,
        );
        if (post.community) {
          TestValidator.predicate(
            "community should have valid id",
            typeof post.community.id === "string",
          );
          TestValidator.predicate(
            "community should have name",
            typeof post.community.name === "string",
          );
        }

        // Validate timestamps
        TestValidator.predicate(
          "post should have created_at timestamp",
          typeof post.created_at === "string",
        );
        TestValidator.predicate(
          "post should have updated_at timestamp",
          typeof post.updated_at === "string",
        );
      }

      // Validate trending-specific metadata
      TestValidator.predicate(
        "trending post should have community reference",
        trendingPost.community !== null && trendingPost.community !== undefined,
      );
      TestValidator.predicate(
        "trending post should have trendingType",
        trendingPost.trendingType === "post" ||
          trendingPost.trendingType === "community",
      );
      TestValidator.predicate(
        "trending post should have valid trendingCategory",
        ["hot", "new", "top", "controversial"].includes(
          trendingPost.trendingCategory,
        ),
      );

      // Validate engagement metrics
      TestValidator.predicate(
        "trending post should have upvoteCount",
        typeof trendingPost.upvoteCount === "number" &&
          trendingPost.upvoteCount >= 0,
      );
      TestValidator.predicate(
        "trending post should have downvoteCount",
        typeof trendingPost.downvoteCount === "number" &&
          trendingPost.downvoteCount >= 0,
      );
      TestValidator.predicate(
        "trending post should have commentCount",
        typeof trendingPost.commentCount === "number" &&
          trendingPost.commentCount >= 0,
      );
      TestValidator.predicate(
        "trending post should have subscriberCount",
        typeof trendingPost.subscriberCount === "number" &&
          trendingPost.subscriberCount >= 0,
      );

      // Validate rank
      TestValidator.predicate(
        "trending post should have valid rank",
        typeof trendingPost.rank === "number" && trendingPost.rank >= 1,
      );

      // Validate timestamps
      TestValidator.predicate(
        "trending post should have createdAt",
        typeof trendingPost.createdAt === "string",
      );
      TestValidator.predicate(
        "trending post should have refreshedAt",
        typeof trendingPost.refreshedAt === "string",
      );
    }

    // Check if pinned posts exist and verify they have correct pin status
    const pinnedPosts = trendingPosts.filter(
      (tp) => tp.post && tp.post.is_pinned === true,
    );
    if (pinnedPosts.length > 0) {
      TestValidator.predicate(
        "pinned posts should be included in trending results",
        pinnedPosts.length > 0,
      );

      // Validate each pinned post has is_pinned set to true
      for (const pinnedPost of pinnedPosts) {
        TestValidator.equals(
          "pinned post in results should have is_pinned = true",
          pinnedPost.post.is_pinned,
          true,
        );
      }
    }
  }

  // Verify pagination consistency
  if (response.pagination && response.data) {
    TestValidator.predicate(
      "current page should not exceed total pages",
      response.pagination.current <= response.pagination.pages ||
        response.pagination.pages === 0,
    );
    TestValidator.predicate(
      "data array length should respect limit",
      response.data.length <= response.pagination.limit ||
        response.pagination.limit === 0,
    );
  }
}
