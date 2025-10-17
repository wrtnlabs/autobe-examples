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
 * Test post retrieval with engagement activity from voting and comment systems.
 *
 * This test validates the complete post engagement workflow:
 *
 * 1. Create multiple member accounts for realistic voting/commenting scenarios
 * 2. Create a community to host the post
 * 3. Create a post within the community
 * 4. Cast multiple votes (upvotes and downvotes) on the post
 * 5. Add multiple comments to the post
 * 6. Retrieve the post and verify it returns correct post data
 *
 * Note: This test focuses on the workflow of creating engagement activity and
 * verifying post retrieval works correctly after engagement.
 */
export async function test_api_post_retrieval_with_engagement_metrics(
  connection: api.IConnection,
) {
  // Step 1: Create the post author member account
  const authorData = {
    username: RandomGenerator.name(1).toLowerCase().replace(/\s/g, "_"),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeMember.ICreate;

  const author: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: authorData });
  typia.assert(author);

  // Step 2: Create a community for the post
  const communityData = {
    code: RandomGenerator.alphaNumeric(10).toLowerCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
    primary_category: "technology",
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create a post in the community
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 4: Create multiple member accounts for voting and commenting
  const voterCount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<5>
  >();
  const voters: IRedditLikeMember.IAuthorized[] = await ArrayUtil.asyncRepeat(
    voterCount,
    async (index) => {
      const voterData = {
        username: `voter_${RandomGenerator.alphaNumeric(8).toLowerCase()}`,
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IRedditLikeMember.ICreate;

      const voter: IRedditLikeMember.IAuthorized =
        await api.functional.auth.member.join(connection, { body: voterData });
      typia.assert(voter);
      return voter;
    },
  );

  // Step 5: Cast votes on the post (mix of upvotes and downvotes)
  await ArrayUtil.asyncForEach(voters, async (voter, index) => {
    // Alternate between upvotes and downvotes, with more upvotes
    const voteValue = index % 3 === 2 ? -1 : 1;

    const voteData = {
      vote_value: voteValue,
    } satisfies IRedditLikePostVote.ICreate;

    const vote: IRedditLikePostVote =
      await api.functional.redditLike.member.posts.votes.create(connection, {
        postId: post.id,
        body: voteData,
      });
    typia.assert(vote);
  });

  // Step 6: Add multiple comments to the post
  const commentCount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<4>
  >();
  await ArrayUtil.asyncRepeat(commentCount, async (index) => {
    // Use different voters to create comments
    const commenterIndex = index % voters.length;
    const commenter = voters[commenterIndex];

    const commentData = {
      reddit_like_post_id: post.id,
      content_text: RandomGenerator.paragraph({
        sentences: 5,
        wordMin: 4,
        wordMax: 8,
      }),
    } satisfies IRedditLikeComment.ICreate;

    const comment: IRedditLikeComment =
      await api.functional.redditLike.member.posts.comments.create(connection, {
        postId: post.id,
        body: commentData,
      });
    typia.assert(comment);
  });

  // Step 7: Retrieve the post and verify basic post data
  const retrievedPost: IRedditLikePost =
    await api.functional.redditLike.posts.at(connection, { postId: post.id });
  typia.assert(retrievedPost);

  // Step 8: Validate post retrieval returns correct data
  TestValidator.equals(
    "retrieved post ID matches created post",
    retrievedPost.id,
    post.id,
  );

  TestValidator.equals(
    "post title matches original",
    retrievedPost.title,
    post.title,
  );

  TestValidator.equals(
    "post type matches original",
    retrievedPost.type,
    post.type,
  );
}
