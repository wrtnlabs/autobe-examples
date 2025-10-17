import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";

/**
 * Test retrieving the authenticated member's vote status on a specific post.
 *
 * This test validates the vote status retrieval functionality that is essential
 * for maintaining accurate voting UI state across the platform. When users view
 * posts, the client application needs to know whether they have upvoted,
 * downvoted, or not voted to correctly highlight the appropriate vote button.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a new member account
 * 2. Create a community to host posts
 * 3. Create a post within the community
 * 4. Cast an upvote on the post
 * 5. Retrieve vote status and verify it shows the upvote
 * 6. Create a second post without voting
 * 7. Verify vote status indicates no vote exists
 */
export async function test_api_post_vote_status_retrieval_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(12);

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: "SecurePass123!",
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a community to host posts
  const communityCode = RandomGenerator.alphaNumeric(10).toLowerCase();
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: communityCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
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

  // Step 3: Create a post within the community
  const postTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 7,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: postTitle,
        body: postBody,
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);

  // Step 4: Cast an upvote on the post
  const upvote: IRedditLikePostVote =
    await api.functional.redditLike.member.posts.votes.create(connection, {
      postId: post.id,
      body: {
        vote_value: 1,
      } satisfies IRedditLikePostVote.ICreate,
    });
  typia.assert(upvote);

  // Step 5: Retrieve vote status and verify it shows the upvote
  const voteStatus: IRedditLikePostVote.IUserVoteStatus =
    await api.functional.redditLike.member.posts.votes.me.getMyVote(
      connection,
      {
        postId: post.id,
      },
    );
  typia.assert(voteStatus);

  // Validate that vote status correctly reflects the upvote
  TestValidator.equals("member has voted on the post", voteStatus.voted, true);
  TestValidator.equals("vote value is upvote", voteStatus.vote_value, 1);

  // Step 6: Create a second post without voting
  const secondPostTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 7,
  });
  const secondPost: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: secondPostTitle,
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 8,
        }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(secondPost);

  // Step 7: Verify vote status indicates no vote exists
  const noVoteStatus: IRedditLikePostVote.IUserVoteStatus =
    await api.functional.redditLike.member.posts.votes.me.getMyVote(
      connection,
      {
        postId: secondPost.id,
      },
    );
  typia.assert(noVoteStatus);

  // Validate that no vote exists for the second post
  TestValidator.equals(
    "member has not voted on second post",
    noVoteStatus.voted,
    false,
  );
}
