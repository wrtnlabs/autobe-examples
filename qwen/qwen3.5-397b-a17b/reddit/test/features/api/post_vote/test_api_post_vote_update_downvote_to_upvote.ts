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
 * Test the reverse vote update scenario where a member changes their existing vote from downvote (-1) to upvote (+1).
 *
 * Validates the complete vote update workflow including member authentication, community creation, subscription, post creation, initial downvote casting, and vote update to upvote. Ensures that the vote direction change is correctly processed and that the vote record reflects the modification accurately.
 *
 * Special attention is given to verifying that the vote record maintains the same voteId after update, the updated_at timestamp is later than created_at indicating modification, and the vote value correctly changes from -1 to +1.
 *
 * 1. Member registers and authenticates via join endpoint.
 * 2. Member creates a community with randomized name, description, and icon.
 * 3. Member subscribes to the created community (required before posting).
 * 4. Member creates a text post in the subscribed community.
 * 5. Member casts an initial downvote (-1) on their own post.
 * 6. Member updates the vote to upvote (+1) using PUT endpoint with voteId.
 * 7. Validates vote record is returned with updated value (+1).
 * 8. Validates updated_at timestamp is later than created_at.
 * 9. Validates voteId remains unchanged after update.
 */
export async function test_api_post_vote_update_downvote_to_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await generate_random_reddit_community_member_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create text post
  const post = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 5. Cast initial downvote (-1)
  const downvote =
    await generate_random_reddit_community_member_posts_votes_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          value: -1,
        },
      },
    );
  typia.assert(downvote);
  TestValidator.equals("initial vote is downvote", downvote.value, -1);
  TestValidator.equals(
    "initial vote created_at equals updated_at",
    downvote.created_at,
    downvote.updated_at,
  );
  // 6. Update vote to upvote (+1)
  const updatedVote =
    await api.functional.redditCommunity.member.posts.votes.putByPostidAndVoteid(
      memberConnection,
      {
        postId: post.id,
        voteId: downvote.id,
        body: {
          value: 1,
        } satisfies IRedditCommunityPostVote.IUpdate,
      },
    );
  typia.assert(updatedVote);
  // 7. Verify vote value changed to +1
  TestValidator.equals("vote updated to upvote", updatedVote.value, 1);
  // 8. Verify voteId remains the same
  TestValidator.equals("voteId unchanged", updatedVote.id, downvote.id);
  // 9. Verify updated_at is later than created_at
  const createdAt = new Date(updatedVote.created_at).getTime();
  const updatedAt = new Date(updatedVote.updated_at).getTime();
  TestValidator.predicate("updated_at after created_at", updatedAt > createdAt);
  // 10. Verify voter member identity is preserved
  TestValidator.equals(
    "voter member id preserved",
    updatedVote.member.id,
    member.id,
  );
}
