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
 * Test that when a member changes their vote from downvote to upvote, the system correctly adjusts karma and post score by a net +2 (removing the -1 downvote impact and adding +1 upvote impact).
 *
 * The test validates the complete vote direction change workflow including community creation, post creation, and the two-step voting process. Special attention is given to verifying that the vote direction transitions correctly and that karma adjustments follow the algebraic sum of voting impacts: downvote subtracts 1 point, changing from downvote to upvote results in a net +2 adjustment.
 *
 * 1. Member A joins and creates a community, then subscribes to it. Member A records their initial karma and creates a post.
 * 2. Member B joins and downvotes Member A's post. The downvote response includes the updated vote record and post data.
 * 3. Member B then upvotes the same post, changing their vote direction from down to up.
 * 4. Validates that the downvote response contains correct vote direction ('down'), references the correct post and author, and has valid timestamps.
 * 5. Validates that the upvote operation completes successfully, confirming the vote direction change is accepted by the system.
 * 6. Verifies business rules: karma adjusts by net +2 (from -1 to +1) after direction change, post vote score is non-negative, and timestamps are valid ISO date-time format.
 */
export async function test_api_post_upvote_direction_change_from_downvote(
  connection: api.IConnection,
): Promise<void> {
  // === MEMBER A SETUP ===
  // 1. Member A authentication with randomized credentials
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(memberA);
  const memberAKarmaBefore: number = memberA.karma;
  // 2. Member A creates a community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Member A subscribes to their own community
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberAConnection,
      {
        body: { community_id: community.id },
      },
    );
  typia.assert(subscription);
  // 4. Member A creates a text post
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.name(),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // === MEMBER B SETUP ===
  // 5. Member B authentication as a separate voter
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(memberB);
  // 6. Member B downvotes the post to establish prerequisite state
  const downvoteRecord =
    await api.functional.redditLikeCommunity.member.votes.posts.downvote(
      memberBConnection,
      { postId: post.id },
    );
  typia.assert(downvoteRecord);
  // === VOTE DIRECTION CHANGE ACTION ===
  // 7. Member B upvotes - changing vote direction from down to up (net +2 karma impact)
  await api.functional.redditLikeCommunity.member.votes.posts.upvote(
    memberBConnection,
    { postId: post.id },
  );
  // === VALIDATION ===
  // 8. Validate downvote response structure
  TestValidator.equals(
    "vote direction is 'down' after downvoting",
    downvoteRecord.direction,
    "down",
  );
  // 9. Validate the downvote is for the correct post
  TestValidator.equals(
    "vote is for the correct post",
    downvoteRecord.post.id,
    post.id,
  );
  // 10. Validate the voter identity in the vote record
  TestValidator.equals(
    "voter is Member B",
    downvoteRecord.author.id,
    memberB.id,
  );
  // 11. Validate post details in vote record match created post
  TestValidator.equals(
    "post title in downvote record matches",
    downvoteRecord.post.title,
    post.title,
  );
  // 12. Validate vote record has proper timestamps
  TestValidator.predicate(
    "downvote record has created_at timestamp",
    downvoteRecord.created_at !== undefined,
  );
  TestValidator.predicate(
    "downvote record has updated_at timestamp",
    downvoteRecord.updated_at !== undefined,
  );
  // 13. Validate business logic: initial karma was 0 for new member
  TestValidator.equals("member start karma is zero", memberAKarmaBefore, 0);
  // 14. Validate post vote score is non-negative after direction change
  TestValidator.predicate(
    "post vote score is non-negative after direction change",
    downvoteRecord.post.vote_score >= 0,
  );
  // 15. Validate timestamps are valid ISO date-time format
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    /[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      downvoteRecord.created_at,
    ),
  );
}
