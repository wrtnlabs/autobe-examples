import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";

/**
 * Test that a moderator can retrieve their vote status on a post.
 *
 * This test validates the vote status retrieval functionality for moderators.
 * Since the vote casting API is not available in the provided SDK, this test
 * focuses on verifying the vote status endpoint returns proper response
 * structure.
 *
 * Workflow:
 *
 * 1. Create moderator account via registration
 * 2. Create community (moderator becomes primary moderator)
 * 3. Create post within the community
 * 4. Retrieve vote status for the post (should show no vote initially)
 */
export async function test_api_moderator_post_vote_status_after_vote_change(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create community for hosting the post
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create a post in the community
  const post: IRedditLikePost =
    await api.functional.redditLike.moderator.posts.create(connection, {
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

  // Step 4: Retrieve vote status and validate response structure
  const voteStatus: IRedditLikePostVote.IUserVoteStatus =
    await api.functional.redditLike.moderator.posts.votes.me.getMyVote(
      connection,
      {
        postId: post.id,
      },
    );
  typia.assert(voteStatus);

  // Validate that vote status response has proper structure
  TestValidator.predicate(
    "vote status has voted property",
    typeof voteStatus.voted === "boolean",
  );
}
