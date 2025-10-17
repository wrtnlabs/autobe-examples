import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test deep nesting of comments up to maximum depth of 10 levels by
 * administrator.
 *
 * This test validates the Reddit-like platform's comment threading system by
 * creating a deeply nested comment chain reaching the maximum allowed depth of
 * 10 levels. It verifies proper parent-child relationships, depth calculation,
 * thread structure maintenance, and enforcement of maximum depth limits.
 *
 * Test workflow:
 *
 * 1. Create administrator account for testing
 * 2. Create a community to host the discussion
 * 3. Create a post to attach comments to
 * 4. Create a top-level comment (depth 0)
 * 5. Create nested replies up to depth 10, validating each level
 * 6. Verify depth calculation and parent references at each level
 * 7. Attempt to create comment at depth 11 and verify rejection
 * 8. Validate complete thread hierarchy integrity
 */
export async function test_api_comment_deep_nesting_by_administrator(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditLikeAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create community for testing
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphabets(10).toLowerCase(),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create post to host comment thread
  const post = await api.functional.redditLike.admin.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: RandomGenerator.paragraph({ sentences: 2 }),
      body: RandomGenerator.content({ paragraphs: 2 }),
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 4: Create top-level comment (depth 0)
  const topLevelComment = await api.functional.redditLike.admin.comments.create(
    connection,
    {
      body: {
        reddit_like_post_id: post.id,
        content_text: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(topLevelComment);
  TestValidator.equals("top-level comment depth", topLevelComment.depth, 0);
  TestValidator.equals(
    "top-level comment has no parent",
    topLevelComment.reddit_like_parent_comment_id,
    undefined,
  );

  // Step 5-6: Create nested replies up to depth 10
  const comments: IRedditLikeComment[] = [topLevelComment];

  for (let depth = 1; depth <= 10; depth++) {
    const parentComment = comments[depth - 1];

    const nestedComment = await api.functional.redditLike.admin.comments.create(
      connection,
      {
        body: {
          reddit_like_post_id: post.id,
          reddit_like_parent_comment_id: parentComment.id,
          content_text: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditLikeComment.ICreate,
      },
    );
    typia.assert(nestedComment);

    // Verify depth calculation
    TestValidator.equals(
      `comment at depth ${depth} has correct depth value`,
      nestedComment.depth,
      depth,
    );

    // Verify parent reference
    TestValidator.equals(
      `comment at depth ${depth} references correct parent`,
      nestedComment.reddit_like_parent_comment_id,
      parentComment.id,
    );

    // Verify post reference
    TestValidator.equals(
      `comment at depth ${depth} references correct post`,
      nestedComment.reddit_like_post_id,
      post.id,
    );

    comments.push(nestedComment);
  }

  // Verify we have all 11 comments (depth 0 to 10)
  TestValidator.equals("created 11 total comments", comments.length, 11);

  // Step 7: Attempt to create comment at depth 11 (beyond maximum)
  await TestValidator.error(
    "cannot create comment beyond maximum depth of 10",
    async () => {
      await api.functional.redditLike.admin.comments.create(connection, {
        body: {
          reddit_like_post_id: post.id,
          reddit_like_parent_comment_id: comments[10].id,
          content_text: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditLikeComment.ICreate,
      });
    },
  );

  // Step 8: Validate thread hierarchy integrity
  for (let i = 1; i < comments.length; i++) {
    const comment = comments[i];
    const expectedParent = comments[i - 1];

    TestValidator.equals(
      `comment chain integrity at index ${i}`,
      comment.reddit_like_parent_comment_id,
      expectedParent.id,
    );

    TestValidator.equals(`depth progression at index ${i}`, comment.depth, i);
  }
}
