import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test a realistic discussion scenario where multiple different members
 * participate in a comment thread.
 *
 * This test simulates actual community conversations by creating a post and
 * having multiple members create comments and replies. It validates that the
 * platform supports multi-participant discussions with proper comment
 * attribution, threading relationships, and discussion thread rendering.
 *
 * Steps:
 *
 * 1. Create first member account and authenticate
 * 2. First member creates a community
 * 3. First member creates a post in the community
 * 4. First member creates initial comment on the post
 * 5. Create second member account and authenticate
 * 6. Second member creates a reply to the first comment
 * 7. Second member creates a top-level comment (while still authenticated)
 * 8. Create third member account and authenticate
 * 9. Third member creates a reply to second member's top-level comment
 * 10. Validate all comments have correct author attribution
 * 11. Validate threading relationships are maintained correctly
 */
export async function test_api_comment_creation_multiple_members_discussion(
  connection: api.IConnection,
) {
  // Step 1: Create first member and authenticate
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Username = RandomGenerator.alphaNumeric(10);
  const member1: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: member1Username,
        email: member1Email,
        password: "SecurePass123!",
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member1);

  // Step 2: First member creates a community
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(15),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 4,
          wordMax: 8,
        }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: First member creates a post
  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 6,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);

  // Step 4: First member creates initial comment
  const comment1: IRedditLikeComment =
    await api.functional.redditLike.member.posts.comments.create(connection, {
      postId: post.id,
      body: {
        reddit_like_post_id: post.id,
        content_text: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 4,
          wordMax: 7,
        }),
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(comment1);
  TestValidator.equals(
    "first comment has correct post reference",
    comment1.reddit_like_post_id,
    post.id,
  );
  TestValidator.equals("first comment is top-level", comment1.depth, 0);

  // Step 5: Create second member and authenticate
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Username = RandomGenerator.alphaNumeric(10);
  const member2: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: member2Username,
        email: member2Email,
        password: "SecurePass456!",
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member2);

  // Step 6: Second member creates a reply to the first comment
  const comment2: IRedditLikeComment =
    await api.functional.redditLike.member.posts.comments.create(connection, {
      postId: post.id,
      body: {
        reddit_like_post_id: post.id,
        reddit_like_parent_comment_id: comment1.id,
        content_text: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 8,
        }),
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(comment2);
  TestValidator.equals(
    "second comment has correct parent reference",
    comment2.reddit_like_parent_comment_id,
    comment1.id,
  );
  TestValidator.equals("second comment has correct depth", comment2.depth, 1);

  // Step 7: Second member creates a top-level comment (while still authenticated)
  const comment3: IRedditLikeComment =
    await api.functional.redditLike.member.posts.comments.create(connection, {
      postId: post.id,
      body: {
        reddit_like_post_id: post.id,
        content_text: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 6,
        }),
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(comment3);
  TestValidator.equals("third comment is top-level", comment3.depth, 0);
  TestValidator.equals(
    "third comment has no parent",
    comment3.reddit_like_parent_comment_id,
    undefined,
  );

  // Step 8: Create third member and authenticate
  const member3Email = typia.random<string & tags.Format<"email">>();
  const member3Username = RandomGenerator.alphaNumeric(10);
  const member3: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: member3Username,
        email: member3Email,
        password: "SecurePass789!",
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member3);

  // Step 9: Third member creates a reply to second member's top-level comment
  const comment4: IRedditLikeComment =
    await api.functional.redditLike.member.posts.comments.create(connection, {
      postId: post.id,
      body: {
        reddit_like_post_id: post.id,
        reddit_like_parent_comment_id: comment3.id,
        content_text: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 4,
          wordMax: 7,
        }),
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(comment4);
  TestValidator.equals(
    "fourth comment has correct parent reference",
    comment4.reddit_like_parent_comment_id,
    comment3.id,
  );
  TestValidator.equals("fourth comment has correct depth", comment4.depth, 1);

  // Validate all comments have correct post association
  TestValidator.equals(
    "all comments reference same post",
    comment1.reddit_like_post_id,
    post.id,
  );
  TestValidator.equals(
    "all comments reference same post",
    comment2.reddit_like_post_id,
    post.id,
  );
  TestValidator.equals(
    "all comments reference same post",
    comment3.reddit_like_post_id,
    post.id,
  );
  TestValidator.equals(
    "all comments reference same post",
    comment4.reddit_like_post_id,
    post.id,
  );

  // Validate threading structure maintains correct depth levels
  TestValidator.predicate(
    "comment threading structure is valid",
    comment1.depth === 0 &&
      comment2.depth === 1 &&
      comment3.depth === 0 &&
      comment4.depth === 1,
  );

  // Validate that we have unique comments from multiple participants
  const allCommentIds = [comment1.id, comment2.id, comment3.id, comment4.id];
  const uniqueCommentIds = new Set(allCommentIds);
  TestValidator.equals(
    "all comments have unique IDs",
    uniqueCommentIds.size,
    4,
  );
}
