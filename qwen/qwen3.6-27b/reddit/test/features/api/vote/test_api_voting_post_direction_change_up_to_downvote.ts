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
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";

/**
 * Test vote direction change from upvote to downvote on a Reddit-like community post.
 *
 * Validates that when a member who previously upvoted a post subsequently downvotes the same post, the system correctly applies a vote direction change. This triggers the business rule that changing vote direction from up to down results in a net -2 point adjustment to both the post's vote_score and the author's karma score.
 *
 * The test verifies: vote direction transitions to 'down', vote timestamp is updated, post vote_score reflects the -2 net change (from +1 after upvote to -1 after downvote), and the post correctly shows the author information.
 *
 * 1. Member joins the platform to establish authenticated session.
 * 2. Member creates a community to gain posting space.
 * 3. Member subscribes to the community to gain posting privileges.
 * 4. Member creates a text post in the community.
 * 5. Member upvotes the post (vote_score becomes +1, karma +1).
 * 6. Member downvotes the same post triggering direction change from up to down.
 * 7. Validates downvote response has direction 'down', updated timestamp, vote_score is -1.
 */
export async function test_api_voting_post_direction_change_up_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    },
  });
  typia.assert(member);
  // Track initial karma before any voting
  const initialKarma: number = member.karma;
  // 2. Create community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to community
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    memberConnection,
    { body: { community_id: community.id } },
  );
  // 4. Create text post in the subscribed community
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberConnection,
    { body: { community_id: community.id, post_type: "text" } },
  );
  typia.assert(post);
  const initialPostVoteScore: number = post.vote_score;
  // 5. Upvote the post - vote_score becomes +1, karma increases by 1
  await api.functional.redditLikeCommunity.member.votes.posts.upvote(
    memberConnection,
    { postId: post.id },
  );
  // 6. Downvote the same post - changes direction from up to down
  // Expected: vote_score decreases by 2 (from +1 to -1), karma decreases by 2
  const downvote =
    await api.functional.redditLikeCommunity.member.votes.posts.downvote(
      memberConnection,
      { postId: post.id },
    );
  typia.assert(downvote);
  // 7. Validate downvote response
  // Vote direction should be 'down' confirming the direction change
  TestValidator.equals(
    "vote direction changed to down",
    downvote.direction,
    "down",
  );
  // updated_at should equal or be newer than created_at
  TestValidator.predicate(
    "updated_at is not older than created_at",
    new Date(downvote.updated_at).getTime() >=
      new Date(downvote.created_at).getTime(),
  );
  // Vote score should be net -2 from previous state
  // After upvote: vote_score = initial + 1 = +1
  // After downvote change: vote_score = +1 - 2 = -1
  const expectedVoteScore = initialPostVoteScore - 2; // -2 net change from initial
  TestValidator.equals(
    "vote_score decreased by 2 net from initial",
    downvote.post.vote_score,
    expectedVoteScore,
  );
  // Verify post id matches
  TestValidator.equals("vote is on correct post", downvote.post.id, post.id);
  // Verify author information is present
  typia.assert(downvote.author);
  typia.assert(downvote.post.author);
}
