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
 * Test removing a downvote from a post and verify vote score restoration.
 *
 * Validates that when a member casts a downvote on a post and then removes it, the system correctly reverses all side effects. The post's vote score decreases by 1 when downvoted, and increases by 1 when the downvote is removed.
 *
 * Special attention is given to verifying that the post vote score returns to its original value after vote removal, confirming the atomic score adjustment logic.
 *
 * 1. Author registers and creates a community.
 * 2. Author subscribes to the community and creates a post.
 * 3. Voter registers and casts a downvote on the post.
 * 4. Voter removes their downvote.
 * 5. Validates that post vote_score is restored to original value.
 */
export async function test_api_post_vote_removal_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Author setup - register and authenticate
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(),
      href: "http://localhost",
      referrer: "http://localhost",
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // 2. Author creates a community
  const community =
    await api.functional.redditLikeCommunity.member.communities.create(
      authorConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IREdditLikeCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Author subscribes to the community
  await api.functional.redditLikeCommunity.member.community_subscriptions.create(
    authorConnection,
    {
      body: {
        community_id: community.id,
      } satisfies IRedditLikeCommunityCommunitySubscription.ICreate,
    },
  );
  // 4. Author creates a post (initial vote_score = 0)
  const post = await api.functional.redditLikeCommunity.member.posts.create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IREdditLikeCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  const originalVoteScore = post.vote_score;
  TestValidator.equals("initial vote_score is 0", originalVoteScore, 0);
  // 5. Voter setup - register and authenticate
  const voterConnection: api.IConnection = { host: connection.host };
  const voterCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "VoterPassword123!",
    username: RandomGenerator.name(),
    href: "http://localhost",
    referrer: "http://localhost",
  } satisfies IREdditLikeCommunityMember.IJoin;
  await authorize_member_join(voterConnection, {
    body: voterCredentials,
  });
  // 6. Voter casts a downvote on the post
  const downvotedVote =
    await api.functional.redditLikeCommunity.member.votes.posts.downvote(
      voterConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(downvotedVote);
  // Verify downvote was cast
  TestValidator.equals(
    "downvote direction is down",
    downvotedVote.direction,
    "down",
  );
  // Capture downvoted state
  const downvotedPostVoteScore = downvotedVote.post.vote_score;
  // Verify downvote decreased score by exactly 1
  TestValidator.equals(
    "downvoted vote_score decreased by 1",
    downvotedPostVoteScore,
    originalVoteScore - 1,
  );
  // 7. Voter removes their downvote
  const afterRemoval =
    await api.functional.redditLikeCommunity.member.votes.posts.remove(
      voterConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(afterRemoval);
  // Validate restoration after removal
  TestValidator.equals("post id matches", afterRemoval.id, post.id);
  TestValidator.equals("post title matches", afterRemoval.title, post.title);
  // Verify vote_score restored to original
  TestValidator.equals(
    "vote_score restored to original after removal",
    afterRemoval.vote_score,
    originalVoteScore,
  );
  // Verify vote_score increased by 1 from downvoted state
  TestValidator.equals(
    "vote_score increased by 1 from downvoted state",
    afterRemoval.vote_score,
    downvotedPostVoteScore + 1,
  );
}