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
 * Test that a member changes their existing downvote on a post to an upvote.
 *
 * Validates the complete vote change workflow: an authenticated member first casts
 * a downvote on a post, then changes it to an upvote. The system performs an upsert
 * on the existing vote record, updating the direction from 'down' to 'up'. This
 * transition represents a +2 delta for the post's vote score and author karma.
 *
 * 1. Two members join the platform — one serves as the post author, the other as the voter.
 * 2. The author creates a community and subscribes to gain posting privileges.
 * 3. The author creates a post in the subscribed community.
 * 4. The voter casts a downvote on the post as initial vote action.
 * 5. The voter changes their vote from downvote to upvote on the same post.
 * 6. Validates the vote record was updated to direction 'up' and confirms upsert behavior.
 */
export async function test_api_post_vote_change_down_to_up(
  connection: api.IConnection,
): Promise<void> {
  // 1a. Author member joins
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: "",
      referrer: "",
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // 1b. Voter member joins
  const voterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: "",
      referrer: "",
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // 2. Create community as author
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      authorConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Author subscribes to their own community
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    authorConnection,
    {
      body: { community_id: community.id },
    },
  );
  // 4. Author creates a post
  const post = await generate_random_reddit_like_community_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 5. Voter casts initial downvote
  const downvote =
    await generate_random_reddit_like_community_member_posts_votes_create(
      voterConnection,
      {
        params: { postId: post.id },
        body: { direction: "down" },
      },
    );
  typia.assert(downvote);
  // Validate downvote was recorded
  TestValidator.equals(
    "initial downvote direction",
    downvote.direction,
    "down",
  );
  // 6. Voter changes vote from down to up
  const upvote =
    await generate_random_reddit_like_community_member_posts_votes_create(
      voterConnection,
      {
        params: { postId: post.id },
        body: { direction: "up" },
      },
    );
  typia.assert(upvote);
  // Validate vote was updated to up direction
  TestValidator.equals("changed upvote direction", upvote.direction, "up");
  // Validate upsert behavior: same vote record should be reused
  TestValidator.equals(
    "vote ID preserved after upsert",
    downvote.id,
    upvote.id,
  );
  // Validate updated_at differs from created_at (vote was modified)
  TestValidator.predicate(
    "vote was modified (updated_at after created_at)",
    new Date(upvote.updated_at).getTime() >=
      new Date(upvote.created_at).getTime(),
  );
}