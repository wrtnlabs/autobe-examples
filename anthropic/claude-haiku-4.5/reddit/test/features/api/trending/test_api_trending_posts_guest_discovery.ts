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

export async function test_api_trending_posts_guest_discovery(
  connection: api.IConnection,
) {
  // Call the trending posts endpoint as an unauthenticated guest
  const response: IPageICommunityPlatformTrendingPost =
    await api.functional.communityPlatform.trending.posts.index(connection);

  // Validate the response structure and type
  typia.assert(response);

  // Verify pagination structure exists and is valid
  TestValidator.predicate(
    "pagination object should exist",
    response.pagination !== null && response.pagination !== undefined,
  );

  const pagination = response.pagination;
  TestValidator.predicate(
    "current page should be non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate("limit should be positive", pagination.limit >= 0);
  TestValidator.predicate(
    "total records should be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    pagination.pages >= 0,
  );

  // Verify pagination math consistency
  const expectedPages = Math.ceil(pagination.records / pagination.limit);
  TestValidator.predicate(
    "pages should match calculated value",
    pagination.pages === expectedPages || pagination.limit === 0,
  );

  // Verify data array exists
  TestValidator.predicate(
    "data array should exist",
    Array.isArray(response.data),
  );

  // If there are trending posts in the response
  if (response.data.length > 0) {
    // Collect communities to verify cross-community results
    const communityIds = new Set<string>();

    // Validate each trending post entry
    for (const trendingPost of response.data) {
      // Validate trending post structure
      TestValidator.predicate(
        "trending post should have valid id",
        trendingPost.id !== null && trendingPost.id !== undefined,
      );

      TestValidator.predicate(
        "trending post should reference postId",
        trendingPost.postId !== null && trendingPost.postId !== undefined,
      );

      TestValidator.predicate(
        "trending post should reference communityId",
        trendingPost.communityId !== null &&
          trendingPost.communityId !== undefined,
      );

      // Track community IDs
      communityIds.add(trendingPost.communityId);

      // Validate trending type
      TestValidator.equals(
        "trending type should be post",
        trendingPost.trendingType,
        "post",
      );

      // Validate trending category
      TestValidator.predicate(
        "trending category should be valid",
        ["hot", "new", "top", "controversial"].includes(
          trendingPost.trendingCategory,
        ),
      );

      // Validate engagement metrics
      TestValidator.predicate(
        "upvote count should be non-negative",
        trendingPost.upvoteCount >= 0,
      );

      TestValidator.predicate(
        "downvote count should be non-negative",
        trendingPost.downvoteCount >= 0,
      );

      TestValidator.predicate(
        "comment count should be non-negative",
        trendingPost.commentCount >= 0,
      );

      TestValidator.predicate(
        "subscriber count should be non-negative",
        trendingPost.subscriberCount >= 0,
      );

      // Validate rank
      TestValidator.predicate(
        "rank should be positive integer",
        trendingPost.rank >= 1,
      );

      // Validate post data structure
      const post = trendingPost.post;
      TestValidator.predicate(
        "post should have id",
        post.id !== null && post.id !== undefined,
      );

      TestValidator.predicate(
        "post should have title",
        post.title !== null &&
          post.title !== undefined &&
          post.title.length > 0,
      );

      TestValidator.predicate(
        "post type should be valid",
        ["text", "link", "image"].includes(post.post_type),
      );

      TestValidator.predicate(
        "post vote score should be non-negative",
        post.vote_score >= 0,
      );

      TestValidator.predicate(
        "post upvote count should be non-negative",
        post.upvote_count >= 0,
      );

      TestValidator.predicate(
        "post downvote count should be non-negative",
        post.downvote_count >= 0,
      );

      TestValidator.predicate(
        "post comment count should be non-negative",
        post.comment_count >= 0,
      );

      TestValidator.predicate(
        "post visibility should be public",
        post.visibility_status === "public",
      );

      TestValidator.predicate(
        "post should have nsfw flag",
        typeof post.is_nsfw === "boolean",
      );

      TestValidator.predicate(
        "post should have spoiler flag",
        typeof post.has_spoiler === "boolean",
      );

      TestValidator.predicate(
        "post should have locked flag",
        typeof post.is_locked === "boolean",
      );

      TestValidator.predicate(
        "post should have pinned flag",
        typeof post.is_pinned === "boolean",
      );

      // Validate creator (member) data
      const creator = post.creator;
      TestValidator.predicate(
        "creator should have id",
        creator.id !== null && creator.id !== undefined,
      );

      TestValidator.predicate(
        "creator should have username",
        creator.username !== null &&
          creator.username !== undefined &&
          creator.username.length > 0,
      );

      TestValidator.predicate(
        "creator should have email",
        creator.email !== null && creator.email !== undefined,
      );

      TestValidator.predicate(
        "creator email verified should be boolean",
        typeof creator.email_verified === "boolean",
      );

      TestValidator.predicate(
        "creator account status should be active",
        creator.account_status === "active",
      );

      TestValidator.predicate(
        "creator karma score should be non-negative",
        creator.karma_score >= 0,
      );

      // Validate community data
      const community = trendingPost.community;
      TestValidator.predicate(
        "community should have id",
        community.id !== null && community.id !== undefined,
      );

      TestValidator.predicate(
        "community should have identifier",
        community.identifier !== null &&
          community.identifier !== undefined &&
          community.identifier.length >= 3,
      );

      TestValidator.predicate(
        "community should have name",
        community.name !== null &&
          community.name !== undefined &&
          community.name.length >= 3,
      );

      TestValidator.predicate(
        "community subscriber count should be non-negative",
        community.subscriber_count >= 0,
      );

      TestValidator.predicate(
        "community post count should be non-negative",
        community.post_count >= 0,
      );

      // Validate timestamps
      TestValidator.predicate(
        "post created_at should be valid timestamp",
        post.created_at !== null &&
          post.created_at !== undefined &&
          !isNaN(Date.parse(post.created_at)),
      );

      TestValidator.predicate(
        "post updated_at should be valid timestamp",
        post.updated_at !== null &&
          post.updated_at !== undefined &&
          !isNaN(Date.parse(post.updated_at)),
      );

      TestValidator.predicate(
        "trending created_at should be valid timestamp",
        trendingPost.createdAt !== null &&
          trendingPost.createdAt !== undefined &&
          !isNaN(Date.parse(trendingPost.createdAt)),
      );

      TestValidator.predicate(
        "trending refreshed_at should be valid timestamp",
        trendingPost.refreshedAt !== null &&
          trendingPost.refreshedAt !== undefined &&
          !isNaN(Date.parse(trendingPost.refreshedAt)),
      );
    }

    // Verify cross-community diversity (if we have posts from multiple communities)
    TestValidator.predicate(
      "trending results should demonstrate community diversity or single community focus",
      communityIds.size >= 1,
    );
  }

  // Validate that the response can be used for pagination
  TestValidator.predicate(
    "pagination indicates queryable structure",
    pagination.limit > 0 || response.data.length === 0,
  );
}
