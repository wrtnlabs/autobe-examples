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
 * Test member vote removal correctly decreases post score and author karma.
 *
 * Validates the core arithmetic of the upvote removal feature by tracking the author's karma before and after vote operations. Since the post's vote_score and the author's karma are coupled through the voting subsystem, tracking karma provides reliable verification of the vote arithmetic. When a member removes their upvote, the author's karma should decrease by 1, effectively reversing the impact of the original upvote.
 *
 * Edge case covered: Removing a vote (as opposed to casting a downvote to replace it) should correctly subtract the vote's score contribution, not simply flip the sign.
 *
 * 1. Post author registers, creates a community, and subscribes to it.
 * 2. Author creates a text post; initial karma is recorded.
 * 3. Voter registers and subscribes to the community.
 * 4. Voter casts an upvote on the post; author karma increases by 1.
 * 5. Voter removes their upvote using DELETE endpoint.
 * 6. Author karma decreases by 1, returning to original value.
 * 7. Validates karma arithmetic: initialKarma -> +1 (upvote) -> -1 (removal) = initialKarma.
 */
export async function test_api_vote_removal_upvote_decreases_scores(
  connection: api.IConnection,
) {
  // 1. Post author setup
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorConnection, {
    body: {},
  });
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      authorConnection,
      { body: {} },
    );
  typia.assert(community);
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    authorConnection,
    { body: { community_id: community.id } },
  );
  // 2. Author creates post - captures initial karma from author profile
  const post = await generate_random_reddit_like_community_member_posts_create(
    authorConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  const initialKarma = post.author.karma;
  // 3. Voter setup
  const voterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(voterConnection, {
    body: {},
  });
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    voterConnection,
    { body: { community_id: community.id } },
  );
  // 4. Voter casts upvote on author's post
  const upvote =
    await generate_random_reddit_like_community_member_posts_votes_create(
      voterConnection,
      {
        params: { postId: post.id },
        body: { direction: "up" },
      },
    );
  typia.assert(upvote);
  // 5. Capture karma after upvote via a new post by the same author
  const afterUpvotePost =
    await generate_random_reddit_like_community_member_posts_create(
      authorConnection,
      {
        body: {
          community_id: community.id,
          post_type: "text",
          body: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(afterUpvotePost);
  const afterUpvoteKarma = afterUpvotePost.author.karma;
  // 6. Voter removes their upvote
  await api.functional.redditLikeCommunity.member.posts.votes.erase(
    voterConnection,
    { postId: post.id },
  );
  // 7. Capture karma after removal via yet another post by same author
  const afterRemovalPost =
    await generate_random_reddit_like_community_member_posts_create(
      authorConnection,
      {
        body: {
          community_id: community.id,
          post_type: "text",
          body: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(afterRemovalPost);
  const afterRemovalKarma = afterRemovalPost.author.karma;
  // 8. Validate karma arithmetic
  TestValidator.equals(
    "karma increases by 1 after upvote",
    afterUpvoteKarma,
    initialKarma + 1,
  );
  TestValidator.equals(
    "karma decreases by 1 after upvote removal",
    afterRemovalKarma,
    afterUpvoteKarma - 1,
  );
  TestValidator.equals(
    "karma returns to initial after upvote removal",
    afterRemovalKarma,
    initialKarma,
  );
}
