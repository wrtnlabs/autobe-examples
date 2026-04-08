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
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test the primary success path where a member casts their first upvote on a post.
 *
 * Validates the complete voting workflow including member registration, community creation, subscription, post creation, and the initial upvote action. Ensures that the vote record is correctly created with proper timestamps and that the post's vote score reflects the new upvote.
 *
 * Special attention is given to verifying that this is a new vote (not an update) by checking that created_at equals updated_at, and that the vote value is correctly set to +1 for an upvote.
 *
 * 1. Member registers with randomized credentials (email, password, username).
 * 2. Member creates a community with randomized name, description, and icon.
 * 3. Member subscribes to the created community.
 * 4. Member creates a text post in the community.
 * 5. Member casts an upvote (+1) on the post.
 * 6. Validates vote response: id exists, value is +1, created_at equals updated_at.
 * 7. Verifies the post's vote score reflects the new upvote.
 */
export async function test_api_post_vote_first_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
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
      { body: { community_id: community.id } },
    );
  typia.assert(subscription);
  // 4. Create a text post
  const post = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 5. Cast first upvote (+1)
  const vote =
    await api.functional.redditCommunity.member.posts.votes.patchByPostid(
      memberConnection,
      {
        postId: post.id,
        body: { value: 1 } satisfies IRedditCommunityPostVote.IUpdate,
      },
    );
  typia.assert(vote);
  // 6. Validate vote record
  TestValidator.predicate("vote id exists", vote.id !== undefined);
  TestValidator.equals("vote value is upvote", vote.value, 1);
  TestValidator.equals(
    "created_at equals updated_at (first vote)",
    vote.created_at,
    vote.updated_at,
  );
  TestValidator.predicate(
    "vote member reference exists",
    vote.member !== undefined,
  );
  TestValidator.predicate(
    "vote post reference exists",
    vote.post !== undefined,
  );
  TestValidator.equals(
    "vote member matches authenticated member",
    vote.member.id,
    memberAuth.id,
  );
  TestValidator.equals("vote post matches created post", vote.post.id, post.id);
  // 7. Verify post vote score reflects the upvote
  TestValidator.equals(
    "post vote score is +1 after upvote",
    vote.post.vote_score,
    1,
  );
}
