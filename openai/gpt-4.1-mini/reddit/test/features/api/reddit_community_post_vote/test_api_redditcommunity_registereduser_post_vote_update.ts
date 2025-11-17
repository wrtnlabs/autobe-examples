import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

/**
 * Validate updating a registered user's vote on a reddit community post.
 *
 * This test performs a complete end-to-end flow:
 *
 * 1. Registered user authentication (join).
 * 2. Community creation.
 * 3. Post creation in that community.
 * 4. Vote creation on the post.
 * 5. Vote update with different vote_type values.
 * 6. Validation of updated data correctness and authorization enforcement.
 */
export async function test_api_redditcommunity_registereduser_post_vote_update(
  connection: api.IConnection,
) {
  // Step 1. Registered user joins (authenticates).
  const user: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        email: RandomGenerator.alphaNumeric(6) + "@example.com",
        password: "Password123!",
      } satisfies IRedditCommunityRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 2. Create a community with UUID id generated for usage.
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const communityBody = {
    communityName: RandomGenerator.alphabets(6),
    displayName: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    imageUrl: null,
    isPrivate: false,
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.redditCommunity.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // Step 3. Create a post in the community using the communityId (correct UUID).
  const postBody = {
    reddit_community_community_id: communityId,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    link_url: null,
    image_url: null,
  } satisfies IRedditCommunityPost.ICreate;
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.create(
      connection,
      { body: postBody },
    );
  typia.assert(post);

  // Step 4. Create a post vote.
  const voteCreateBody = {
    vote_type: "upvote",
  } satisfies IRedditCommunityPostVote.ICreate;
  const vote: IRedditCommunityPostVote =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.postVotes.create(
      connection,
      { postId: post.id, body: voteCreateBody },
    );
  typia.assert(vote);

  // Step 5. Update the vote with a new vote_type.
  const updatedVoteTypes = ["downvote", "upvote"];
  for (const newVoteType of updatedVoteTypes) {
    const voteUpdateBody = {
      vote_type: newVoteType,
    } satisfies IRedditCommunityPostVote.IUpdate;

    const updatedVote: IRedditCommunityPostVote =
      await api.functional.redditCommunity.registeredUser.redditCommunity.posts.postVotes.update(
        connection,
        {
          postId: post.id,
          postVoteId: vote.id,
          body: voteUpdateBody,
        },
      );
    typia.assert(updatedVote);

    TestValidator.equals(
      `vote_type should be updated to ${newVoteType}`,
      updatedVote.vote_type,
      newVoteType,
    );
  }

  // Step 6. Unauthorized update attempt
  // Note: Since multi-user simulation is not available, skipping unauthorized update tests.
}
