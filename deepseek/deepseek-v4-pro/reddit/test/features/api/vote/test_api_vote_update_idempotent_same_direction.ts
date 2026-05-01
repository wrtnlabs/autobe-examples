import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import type { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
import type { ICommunityHubVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_communities_posts_create } from "../../../generate/generate_random_community_hub_communities_posts_create";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { generate_random_community_hub_member_votes_create } from "../../../generate/generate_random_community_hub_member_votes_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";
import { prepare_random_community_hub_vote } from "../../../prepare/prepare_random_community_hub_vote";

/**
 * Test the idempotent behavior of updating a vote with the same direction.
 *
 * Validates that submitting the same vote value via PUT /communityHub/member/votes/{voteId}
 * is treated as a no-op with no side effects on vote records or author karma.
 * After a member registers, creates a community, subscribes, posts, and casts an initial
 * upvote, the member submits the identical value (+1) through the update endpoint.
 *
 * The test confirms that same-direction updates preserve the original vote record
 * including both created_at and updated_at timestamps, and leave the post author's
 * karma score unchanged — proving the system's idempotent handling of redundant votes.
 *
 * 1. Member registers and authenticates via authorize_member_join.
 * 2. Member creates a community via generate utility.
 * 3. Member subscribes to the community via SDK (no utility available).
 * 4. Member creates a text post in the community via generate utility.
 * 5. Member casts an initial upvote (+1) on the post via generate utility with overrides.
 * 6. Member submits the same upvote value via PUT /communityHub/member/votes/{voteId}.
 * 7. Validates vote value, timestamps, and author karma are all unchanged.
 */
export async function test_api_vote_update_idempotent_same_direction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as the member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Create a text post
  const post = await generate_random_community_hub_communities_posts_create(
    memberConnection,
    {
      params: { communityName: community.name },
      body: {
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // 5. Cast initial upvote (+1) on the post
  const initialVote = await generate_random_community_hub_member_votes_create(
    memberConnection,
    {
      body: {
        target_type: "post",
        target_id: post.id,
        value: 1,
      },
    },
  );
  typia.assert(initialVote);
  // 6. Submit the SAME value via PUT — idempotent operation expected
  const updatedVote = await api.functional.communityHub.member.votes.update(
    memberConnection,
    {
      voteId: initialVote.id,
      body: { value: 1 } satisfies ICommunityHubVote.IUpdate,
    },
  );
  typia.assert(updatedVote);
  // 7. Validate idempotent behavior: nothing changed
  TestValidator.equals("vote value remains 1", updatedVote.value, 1);
  TestValidator.equals(
    "created_at unchanged",
    updatedVote.created_at,
    initialVote.created_at,
  );
  TestValidator.equals(
    "updated_at unchanged",
    updatedVote.updated_at,
    initialVote.updated_at,
  );
  TestValidator.equals(
    "author karma unchanged",
    updatedVote.member.karma,
    initialVote.member.karma,
  );
}
