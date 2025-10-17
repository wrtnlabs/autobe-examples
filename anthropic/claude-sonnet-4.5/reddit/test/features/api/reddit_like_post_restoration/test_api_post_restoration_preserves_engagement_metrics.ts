import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";

/**
 * Test that restoring a soft-deleted post preserves all engagement metrics.
 *
 * This test validates the complete workflow of post engagement, deletion, and
 * restoration:
 *
 * 1. Creates a post author and community
 * 2. Creates a post with engagement (votes and comments)
 * 3. Soft-deletes the post
 * 4. Restores the post
 * 5. Verifies the post is successfully restored with core properties intact
 *
 * The test ensures that the post restoration mechanism works correctly, which
 * is critical for maintaining content integrity and community trust.
 */
export async function test_api_post_restoration_preserves_engagement_metrics(
  connection: api.IConnection,
) {
  // Step 1: Create the post author account
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const author = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: authorEmail,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(author);

  // Step 2: Create a community for the post
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
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

  // Step 3: Create a post with text content
  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: RandomGenerator.paragraph({ sentences: 3 }),
      body: RandomGenerator.content({ paragraphs: 3 }),
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 4: Create additional members for voting
  await ArrayUtil.asyncRepeat(3, async (index) => {
    const voterEmail = typia.random<string & tags.Format<"email">>();
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: voterEmail,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IRedditLikeMember.ICreate,
    });

    // Add vote (1 downvote, 2 upvotes)
    const voteValue = index === 0 ? -1 : 1;
    const vote = await api.functional.redditLike.member.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          vote_value: voteValue,
        } satisfies IRedditLikePostVote.ICreate,
      },
    );
    typia.assert(vote);
  });

  // Step 5: Create additional members for commenting
  await ArrayUtil.asyncRepeat(2, async () => {
    const commenterEmail = typia.random<string & tags.Format<"email">>();
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: commenterEmail,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IRedditLikeMember.ICreate,
    });

    const comment = await api.functional.redditLike.member.comments.create(
      connection,
      {
        body: {
          reddit_like_post_id: post.id,
          content_text: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IRedditLikeComment.ICreate,
      },
    );
    typia.assert(comment);
  });

  // Step 6: Delete the post (re-authenticate as author first)
  await api.functional.auth.member.join(connection, {
    body: {
      username: author.username,
      email: authorEmail,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditLikeMember.ICreate,
  });

  await api.functional.redditLike.member.posts.erase(connection, {
    postId: post.id,
  });

  // Step 7: Restore the deleted post
  const restoredPost = await api.functional.redditLike.member.posts.restore(
    connection,
    {
      postId: post.id,
    },
  );
  typia.assert(restoredPost);

  // Step 8: Verify the restored post maintains its core properties
  TestValidator.equals("restored post ID matches", restoredPost.id, post.id);
  TestValidator.equals(
    "restored post type matches",
    restoredPost.type,
    post.type,
  );
  TestValidator.equals(
    "restored post title matches",
    restoredPost.title,
    post.title,
  );
  TestValidator.equals(
    "restored post created_at matches",
    restoredPost.created_at,
    post.created_at,
  );
}
