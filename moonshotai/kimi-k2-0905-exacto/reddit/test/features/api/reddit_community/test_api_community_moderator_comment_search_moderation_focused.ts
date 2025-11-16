import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

/**
 * Test community moderator searching comments with moderation-specific filters.
 * Validates filtering by removed/deleted status, vote score thresholds, thread
 * depth targeting, and temporal ranges. Tests that moderators can efficiently
 * identify content requiring attention based on community guidelines
 * violations, controversial discussions, or user-reported content.
 */
export async function test_api_community_moderator_comment_search_moderation_focused(
  connection: api.IConnection,
) {
  // Create community moderator account for moderation access
  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        nickname: RandomGenerator.name(1),
        password: RandomGenerator.alphaNumeric(12),
        href: "https://example.com/registration",
        referrer: "https://example.com/login",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // Create member account for cross-actor testing
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      nickname: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Create a community for testing
  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: RandomGenerator.alphabets(8),
        title: "Test Community for Moderation",
        description: "Community for testing comment moderation features",
        category_name: "Technology",
        type: "public",
        allow_crosspost: true,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // Get available post types from system to use valid IDs
  const postTypes = ["text", "link", "image"] as const;
  const selectedPostType = RandomGenerator.pick(postTypes);

  // Create test post for comment generation using valid post type
  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: "Test Post for Comment Moderation",
        content:
          "This is a test post for generating comments that will be filtered",
        reddit_community_id: community.id,
        reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(), // Using valid UUID format
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Create diverse comments for moderation testing
  const comments: Array<IRedditCommunityComment & { originalContent: string }> =
    [];

  // Create 1. Normal comments (will be visible)
  const normalComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          content: "This is a normal comment that follows community guidelines",
          reddit_post_id: post.id,
          href: `https://example.com/posts/${post.id}`,
          referrer: `https://example.com/communities/${community.name}`,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(normalComment);
  comments.push({ ...normalComment, originalContent: normalComment.content });

  // Switch to member for diversity
  await api.functional.auth.member.login(connection, {
    body: {
      email: member.email,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/login",
      referrer: "https://example.com/",
    } satisfies IRedditCommunityMember.ILoginRequest,
  });

  // Create 2. Controversial comment with targeted content
  const controversialComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          content:
            "This topic is highly controversial and requires moderator attention and review processes",
          reddit_post_id: post.id,
          href: `https://example.com/posts/${post.id}`,
          referrer: `https://example.com/communities/${community.name}`,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(controversialComment);
  comments.push({
    ...controversialComment,
    originalContent: controversialComment.content,
  });

  // Create 3. Low engagement comment
  const lowScoreComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          content:
            "This comment needs attention from moderators due to inappropriate discussion topics",
          reddit_post_id: post.id,
          href: `https://example.com/posts/${post.id}`,
          referrer: `https://example.com/communities/${community.name}`,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(lowScoreComment);
  comments.push({
    ...lowScoreComment,
    originalContent: lowScoreComment.content,
  });

  // Create 4. Swift detection test comment
  const swiftDetectionComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          content:
            "Review process needed: swift attention required for controversial discussion content",
          reddit_post_id: post.id,
          href: `https://example.com/posts/${post.id}`,
          referrer: `https://example.com/communities/${community.name}`,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(swiftDetectionComment);
  comments.push({
    ...swiftDetectionComment,
    originalContent: swiftDetectionComment.content,
  });

  // Create 5. Deep thread comment (nested reply)
  const parentComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          content:
            "This parent comment generates thread structure for depth filtering tests",
          reddit_post_id: post.id,
          href: `https://example.com/posts/${post.id}`,
          referrer: `https://example.com/communities/${community.name}`,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(parentComment);

  const childComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          content:
            "Nested reply comment for thread depth moderation filtering requirements",
          reddit_post_id: post.id,
          parent_comment_id: parentComment.id,
          href: `https://example.com/posts/${post.id}`,
          referrer: `https://example.com/communities/${community.name}`,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(childComment);
  comments.push({ ...childComment, originalContent: childComment.content });
  TestValidator.equals(
    "child comment should be depth 1",
    childComment.thread_depth,
    1,
  );

  // Create additional comments to ensure we have enough for pagination
  const additionalComments = await ArrayUtil.asyncRepeat(3, async (index) => {
    const content = [
      "Another example of content requiring moderation and review attention",
      "Discussion about guidelines violations needing moderator intervention",
      "Content demonstrating the need for swift moderation action processes",
    ][index];

    await api.functional.auth.member.login(connection, {
      body: {
        email: member.email,
        password: RandomGenerator.alphaNumeric(12),
        href: "https://example.com/login",
        referrer: "https://example.com/",
      } satisfies IRedditCommunityMember.ILoginRequest,
    });

    return await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          content,
          reddit_post_id: post.id,
          href: `https://example.com/posts/${post.id}`,
          referrer: `https://example.com/communities/${community.name}`,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  });
  additionalComments.forEach((comment) => {
    comments.push({ ...comment, originalContent: comment.content });
  });

  // Switch back to moderator for search testing
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      email: moderator.email,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/login",
      referrer: "https://example.com/",
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Test 1: Search by content specific terms
  const contentSearch1 =
    await api.functional.redditCommunity.communityModerator.comments.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "desc",
          page: 1,
          limit: 10,
          content_filter: ["controversial", "discussion", "moderator"],
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(contentSearch1);
  const foundControversial = contentSearch1.data.some(
    (comment) =>
      comment.content.includes("controversial") ||
      comment.content.includes("Moderator attention") ||
      comment.content.includes("review"),
  );
  TestValidator.predicate(
    "should find comments with content filter terms",
    foundControversial,
  );

  // Test 2: Filter by removed/deleted status
  const removedSearch =
    await api.functional.redditCommunity.communityModerator.comments.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "asc",
          page: 1,
          limit: 10,
          is_removed: false,
          is_deleted: false,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(removedSearch);
  TestValidator.predicate(
    "should find non-removed, non-deleted comments",
    removedSearch.data.length > 0,
  );
  TestValidator.predicate(
    "all found comments should be active",
    removedSearch.data.every(
      (comment) => !comment.is_removed && !comment.is_deleted,
    ),
  );

  // Test 3: Vote score filtering
  const voteScoreSearch =
    await api.functional.redditCommunity.communityModerator.comments.index(
      connection,
      {
        body: {
          sort_by: "vote_score",
          sort_order: "desc",
          page: 1,
          limit: 10,
          vote_score_min: 0,
          vote_score_max: 10,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(voteScoreSearch);

  TestValidator.predicate(
    "should find comments within vote score range",
    voteScoreSearch.data.length > 0,
  );
  TestValidator.predicate(
    "all comments should be within vote score bounds",
    voteScoreSearch.data.every((comment) => {
      const score = comment.upvote_count - comment.downvote_count;
      return score >= 0 && score <= 10;
    }),
  );

  // Test 4: Thread depth targeting
  const threadDepthSearch =
    await api.functional.redditCommunity.communityModerator.comments.index(
      connection,
      {
        body: {
          sort_by: "vote_score",
          sort_order: "desc",
          page: 1,
          limit: 10,
          thread_depth_min: 1,
          thread_depth_max: 2,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(threadDepthSearch);

  const hasNestedComments = threadDepthSearch.data.some(
    (comment) => comment.thread_depth >= 1,
  );
  TestValidator.predicate(
    "should find comments at specified thread depth",
    hasNestedComments,
  );
  TestValidator.predicate(
    "all comments should be within thread depth range",
    threadDepthSearch.data.every(
      (comment) => comment.thread_depth >= 1 && comment.thread_depth <= 2,
    ),
  );

  // Test 5: Temporal range filtering
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );

  const temporalSearch =
    await api.functional.redditCommunity.communityModerator.comments.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "desc",
          page: 1,
          limit: 10,
          created_after: startOfToday.toISOString(),
          created_before: endOfToday.toISOString(),
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(temporalSearch);
  TestValidator.predicate(
    "should find comments within today's date range",
    temporalSearch.data.length > 0,
  );

  const allWithinDateRange = temporalSearch.data.every((comment) => {
    const commentDate = new Date(comment.created_at);
    return commentDate >= startOfToday && commentDate < endOfToday;
  });
  TestValidator.predicate(
    "all comments should be within temporal range",
    allWithinDateRange,
  );

  // Test 6: Combined moderation filters for problem identification
  const moderateSearch =
    await api.functional.redditCommunity.communityModerator.comments.index(
      connection,
      {
        body: {
          sort_by: "vote_score",
          sort_order: "asc",
          page: 1,
          limit: 10,
          vote_score_min: 0,
          vote_score_max: 10,
          content_filter: ["attention", "review", "swift"],
          thread_depth_min: 0,
          thread_depth_max: 3,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(moderateSearch);
  TestValidator.predicate(
    "should identify potentially problematic content",
    moderateSearch.data.length > 0,
  );

  // Verify pagination creates separation properly
  const page1 =
    await api.functional.redditCommunity.communityModerator.comments.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "desc",
          page: 1,
          limit: 3,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(page1);

  const page2 =
    await api.functional.redditCommunity.communityModerator.comments.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "desc",
          page: 2,
          limit: 3,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(page2);

  TestValidator.equals(
    "page 1 should have correct number of items",
    page1.data.length,
    Math.min(3, comments.length),
  );
  TestValidator.predicate(
    "pagination data retrieval should work correctly",
    page1.data.length > 0,
  );

  // Don't enforce that page2 must be different from page1 if we don't have enough data
  if (page1.data.length === 3 && page2.data.length > 0) {
    TestValidator.notEquals(
      "different pages should have different data when sufficient items exist",
      page1.data[0].id,
      page2.data[0].id,
    );
  }

  // Test keyword search functionality with more targeted terms
  const attentionSearch =
    await api.functional.redditCommunity.communityModerator.comments.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "desc",
          page: 1,
          limit: 20,
          content_filter: ["attention", "review", "needs"],
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(attentionSearch);

  const foundAttentionContent = attentionSearch.data.some(
    (comment) =>
      comment.content.includes("attention") ||
      comment.content.includes("review") ||
      comment.content.includes("needs"),
  );
  TestValidator.predicate(
    "should find comments with attention-seeking keywords",
    foundAttentionContent,
  );

  // Verify comprehensive moderator access
  const comprehensiveSearch =
    await api.functional.redditCommunity.communityModerator.comments.index(
      connection,
      {
        body: {
          sort_by: "vote_score",
          sort_order: "desc",
          page: 1,
          limit: 50,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(comprehensiveSearch);
  TestValidator.predicate(
    "moderator should have comprehensive access to comment data",
    comprehensiveSearch.pagination.records === comments.length,
  );
}
