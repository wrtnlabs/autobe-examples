import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import type { IRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_posts_votes_create } from "../../../generate/generate_random_reddit_like_member_posts_votes_create";
import { generate_random_reddit_like_member_subscriptions_create } from "../../../generate/generate_random_reddit_like_member_subscriptions_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_subscription";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_vote } from "../../../prepare/prepare_random_reddit_like_vote";

/**
 * Test changing a post vote from downvote to upvote.
 *
 * Validates the vote change mechanism when a member switches their vote type on a post from downvote to upvote. The test ensures that the vote record is updated rather than replaced, and that the post's vote score and author's karma are correctly adjusted by 2 points.
 *
 * The test follows this workflow:
 * 1. Member authenticates via registration
 * 2. Community is created for the post
 * 3. Member subscribes to the community
 * 4. Post is created in the community
 * 5. Member casts a downvote on the post
 * 6. Member changes vote to upvote on the same post
 * 7. Validates vote_type changed to 'upvote'
 * 8. Validates post vote_score increased by 2
 * 9. Validates author karma increased by 2
 * 10. Validates updated_at changed while created_at remained unchanged
 *
 * 1. Authenticate member account via registration endpoint.
 * 2. Create a test community for publishing the post.
 * 3. Subscribe member to the created community.
 * 4. Create a text post in the community.
 * 5. Cast initial downvote on the post.
 * 6. Cast upvote on the same post to change vote type.
 * 7. Verify the vote record shows vote_type as 'upvote'.
 * 8. Verify the post's vote_score is 1 (changed from -1 to +1, net +2).
 * 9. Verify the post author's karma_score increased by 2.
 * 10. Verify the vote record's updated_at timestamp was modified.
 * 11. Verify the vote record's created_at timestamp remained unchanged.
 */
export async function test_api_post_voting_downvote_to_upvote_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Subscribe to community
  await generate_random_reddit_like_member_subscriptions_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
      } satisfies IRedditLikeCommunitySubscription.ICreate,
    },
  );
  // 4. Create post
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "text",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // Capture author's initial karma
  const initialKarma = post.author.karma_score;
  // 5. Cast initial downvote
  const downvote = await generate_random_reddit_like_member_posts_votes_create(
    memberConnection,
    {
      params: {
        postId: post.id,
      },
      body: {
        vote_type: "downvote",
      } satisfies IRedditLikeVote.ICreate,
    },
  );
  typia.assert(downvote);
  // Verify downvote was cast
  TestValidator.equals("initial vote type", downvote.vote_type, "downvote");
  TestValidator.predicate("post score after downvote", post.vote_score === -1);
  // Capture timestamps before vote change
  const initialCreatedAt = downvote.created_at;
  const initialUpdatedAt = downvote.updated_at;
  // Small delay to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 10));
  // 6. Change vote to upvote
  const upvote = await generate_random_reddit_like_member_posts_votes_create(
    memberConnection,
    {
      params: {
        postId: post.id,
      },
      body: {
        vote_type: "upvote",
      } satisfies IRedditLikeVote.ICreate,
    },
  );
  typia.assert(upvote);
  // 7. Verify vote_type changed to 'upvote'
  TestValidator.equals(
    "vote type changed to upvote",
    upvote.vote_type,
    "upvote",
  );
  // 8. Verify post vote_score increased by 2 (from -1 to +1)
  TestValidator.equals(
    "post vote score after vote change",
    upvote.post!.vote_score,
    1,
  );
  // 9. Verify author karma increased by 2
  TestValidator.equals(
    "author karma increased by 2",
    upvote.post!.author.karma_score,
    initialKarma + 2,
  );
  // 10. Verify updated_at was modified
  TestValidator.notEquals(
    "updated_at timestamp changed",
    upvote.updated_at,
    initialUpdatedAt,
  );
  // 11. Verify created_at remained unchanged
  TestValidator.equals(
    "created_at timestamp unchanged",
    upvote.created_at,
    initialCreatedAt,
  );
}
