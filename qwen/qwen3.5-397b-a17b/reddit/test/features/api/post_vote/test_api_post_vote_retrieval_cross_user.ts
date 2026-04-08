import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_member_subscriptions_create";
import { generate_random_reddit_community_member_posts_votes_create } from "../../../generate/generate_random_reddit_community_member_posts_votes_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_vote } from "../../../prepare/prepare_random_reddit_community_post_vote";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test retrieving a vote record cast by one member on another member's post.
 *
 * Member A creates a community and post. Member B subscribes to the community, then casts a downvote (-1) on Member A's post. Member B then retrieves their own vote record using the vote ID. Validate that the response correctly shows the downvote value (-1), Member B as the voter, Member A's post as the target, and proper timestamps. This validates that members can retrieve their votes regardless of who authored the post.
 *
 * 1. Member A registers and authenticates, then creates a community.
 * 2. Member A creates a text post in their community.
 * 3. Member B registers and authenticates separately.
 * 4. Member B subscribes to Member A's community.
 * 5. Member B casts a downvote (-1) on Member A's post.
 * 6. Member B retrieves their vote record using the vote ID.
 * 7. Validates vote value is -1, voter is Member B, post matches Member A's post, and timestamps exist.
 */
export async function test_api_post_vote_retrieval_cross_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A setup - create community
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberA);
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 2. Member A creates a text post
  const post = await generate_random_reddit_community_posts_create(
    memberAConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  typia.assert(post);
  // 3. Member B setup - separate registration
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberB);
  // 4. Member B subscribes to Member A's community
  const subscription =
    await generate_random_reddit_community_member_member_subscriptions_create(
      memberBConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 5. Member B casts a downvote (-1) on Member A's post
  const vote = await generate_random_reddit_community_member_posts_votes_create(
    memberBConnection,
    {
      params: {
        postId: post.id,
      },
      body: {
        value: -1,
      },
    },
  );
  typia.assert(vote);
  // 6. Member B retrieves their vote record
  const retrievedVote =
    await api.functional.redditCommunity.member.posts.votes.at(
      memberBConnection,
      {
        postId: post.id,
        voteId: vote.id,
      },
    );
  typia.assert(retrievedVote);
  // 7. Validate vote details
  TestValidator.equals("vote value is downvote", retrievedVote.value, -1);
  TestValidator.equals(
    "voter is Member B",
    retrievedVote.member.id,
    memberB.id,
  );
  TestValidator.equals("post matches", retrievedVote.post.id, post.id);
  TestValidator.predicate(
    "created_at exists",
    retrievedVote.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedVote.updated_at !== null,
  );
  TestValidator.equals("vote ID matches", retrievedVote.id, vote.id);
}