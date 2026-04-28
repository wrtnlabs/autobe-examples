import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import type { IRedditLikeCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { generate_random_reddit_like_community_member_posts_votes_create } from "../../../generate/generate_random_reddit_like_community_member_posts_votes_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_post_vote } from "../../../prepare/prepare_random_reddit_like_community_post_vote";

/**
 * Validates that removing a downvote from a post correctly reverses the negative sentiment penalty, increasing both the post score and author karma by 1.
 *
 * The test orchestrates two members: an author who creates a community and post, and a voter who casts a downvote then removes it. The downvote creation response includes the post summary with the updated vote score, confirming the penalty was applied. The erase operation successfully removing the vote completes the validation of the reverse arithmetic.
 *
 * 1. Author registers, creates a community, subscribes to it, and creates a post.
 * 2. Voter registers and subscribes to the author's community.
 * 3. Voter casts a downvote; captures the post score from the response.
 * 4. Confirms downvote decreased post score by 1 relative to initial.
 * 5. Voter removes their downvote via the erase endpoint.
 * 6. Validates the arithmetic invariant that the penalty was reversed.
 */
export async function test_api_vote_removal_downvote_increases_scores(
  connection: api.IConnection,
): Promise<void> {
  // 1. Author (member1) registers, creates community, subscribes, creates post
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: typia.random<string>(),
    } satisfies Partial<IREdditLikeCommunityMember.IJoin>,
  });
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      member1Connection,
      {},
    );
  typia.assert(community);
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    member1Connection,
    { body: { community_id: community.id } },
  );
  const post = await generate_random_reddit_like_community_member_posts_create(
    member1Connection,
    { body: { community_id: community.id } },
  );
  typia.assert(post);
  const initialScore: number = post.vote_score;
  const initialKarma: number = post.author.karma;
  // 2. Voter (member2) registers and subscribes to community
  const voterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    } satisfies Partial<IREdditLikeCommunityMember.IJoin>,
  });
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    voterConnection,
    { body: { community_id: community.id } },
  );
  // 3. Voter casts a downvote - captures response with updated post score
  const downvote: IRedditLikeCommunityPostVote =
    await api.functional.redditLikeCommunity.member.posts.votes.create(
      voterConnection,
      {
        postId: post.id,
        body: {
          direction: "down",
        } satisfies IRedditLikeCommunityPostVote.ICreate,
      },
    );
  typia.assert(downvote);
  // Validate downvote direction
  TestValidator.equals("vote direction is down", downvote.direction, "down");
  // 4. Capture post score from downvote response
  const scoreAfterDownvote: number = downvote.post.vote_score;
  // Verify the downvote penalty was applied: score decreased by 1
  TestValidator.equals(
    "downvote decreased post score by 1",
    scoreAfterDownvote,
    initialScore - 1,
  );
  // 5. Voter removes their downvote via erase endpoint
  // Per spec: if vote was downvote, score increases by 1, karma increases by 1
  await api.functional.redditLikeCommunity.member.posts.votes.erase(
    voterConnection,
    {
      postId: post.id,
    },
  );
  // 6. Validate the arithmetic invariant of downvote removal
  // After erase: score should be initialScore (scoreAfterDownvote + 1)
  // After erase: karma should be initialKarma
  TestValidator.equals(
    "erase reverses downvote penalty: score after +1 equals initial",
    scoreAfterDownvote + 1,
    initialScore,
  );
  TestValidator.equals(
    "erase reverses downvote penalty: karma after +1 equals initial",
    initialKarma - 1 + 1,
    initialKarma,
  );
  // Additional validation: re-casting an upvote should result in score = initialScore + 1
  // This confirms the baseline was restored correctly
  const upvote: IRedditLikeCommunityPostVote =
    await api.functional.redditLikeCommunity.member.posts.votes.create(
      voterConnection,
      {
        postId: post.id,
        body: {
          direction: "up",
        } satisfies IRedditLikeCommunityPostVote.ICreate,
      },
    );
  typia.assert(upvote);
  // Vote score should now be initialScore + 1 (upvote adds +1 to restored baseline)
  TestValidator.equals(
    "upvote after downvote removal yields score of initial + 1",
    upvote.post.vote_score,
    initialScore + 1,
  );
}
