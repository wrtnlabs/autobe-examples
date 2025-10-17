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
 * Test administrators creating deeply nested comment threads with multiple
 * levels of replies.
 *
 * This test validates the threading system's depth tracking and parent-child
 * relationships by creating a multi-level comment hierarchy. The workflow
 * includes:
 *
 * 1. Admin authentication through registration
 * 2. Community creation for hosting discussions
 * 3. Post creation as the discussion anchor
 * 4. Creating a first-level comment (depth 0)
 * 5. Creating a second-level reply to the first comment (depth 1)
 * 6. Creating a third-level reply to the second-level comment (depth 2)
 *
 * Validates that each reply's depth is correctly calculated as parent depth +
 * 1, all parent_comment_id references form a valid chain, and the comment
 * threading hierarchy is properly maintained.
 */
export async function test_api_admin_multi_level_comment_threading(
  connection: api.IConnection,
) {
  // Step 1: Register admin account
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditLikeAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create community for discussion
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
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

  // Step 3: Create post as discussion anchor
  const post = await api.functional.redditLike.admin.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: RandomGenerator.paragraph({ sentences: 3 }),
      body: RandomGenerator.content({ paragraphs: 2 }),
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 4: Create first-level comment (depth 0)
  const firstLevelComment =
    await api.functional.redditLike.admin.comments.create(connection, {
      body: {
        reddit_like_post_id: post.id,
        content_text: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(firstLevelComment);
  TestValidator.equals("first comment depth", firstLevelComment.depth, 0);

  // Step 5: Create second-level reply (depth 1)
  const secondLevelComment =
    await api.functional.redditLike.admin.comments.replies.create(connection, {
      commentId: firstLevelComment.id,
      body: {
        content_text: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeComment.IReplyCreate,
    });
  typia.assert(secondLevelComment);
  TestValidator.equals("second comment depth", secondLevelComment.depth, 1);
  TestValidator.equals(
    "second comment parent",
    secondLevelComment.reddit_like_parent_comment_id,
    firstLevelComment.id,
  );

  // Step 6: Create third-level reply (depth 2)
  const thirdLevelComment =
    await api.functional.redditLike.admin.comments.replies.create(connection, {
      commentId: secondLevelComment.id,
      body: {
        content_text: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeComment.IReplyCreate,
    });
  typia.assert(thirdLevelComment);
  TestValidator.equals("third comment depth", thirdLevelComment.depth, 2);
  TestValidator.equals(
    "third comment parent",
    thirdLevelComment.reddit_like_parent_comment_id,
    secondLevelComment.id,
  );

  // Validate parent-child chain
  TestValidator.equals(
    "all comments belong to same post",
    thirdLevelComment.reddit_like_post_id,
    post.id,
  );
  TestValidator.equals(
    "second level parent matches first level",
    secondLevelComment.reddit_like_parent_comment_id,
    firstLevelComment.id,
  );
  TestValidator.equals(
    "third level parent matches second level",
    thirdLevelComment.reddit_like_parent_comment_id,
    secondLevelComment.id,
  );
}
