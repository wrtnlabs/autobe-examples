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
 * Test switching a vote from upvote to downvote on a post and verifying score/karma changes.
 *
 * Validates the complete vote update workflow: after a member creates a community, subscribes, and publishes a post, they cast an initial upvote (+1) and then switch it to a downvote (-1) via the PUT endpoint. The test verifies that the vote record is updated in-place with the new direction while preserving the original creation timestamp.
 *
 * Special attention is given to verifying the side effects of the vote switch: the vote's updated_at timestamp advances past created_at, the vote value reflects the new direction (-1), and the voting member's karma score decreases by 2 (since the voter and post author are the same member in this setup, the karma change is directly observable in the vote response's member summary).
 *
 * 1. Member registers and authenticates via authorize_member_join.
 * 2. Member creates a new community.
 * 3. Member subscribes to the community to enable posting.
 * 4. Member creates a text post in the community.
 * 5. Member casts an initial upvote (+1) on the post.
 * 6. Member updates the vote to downvote (-1) via PUT /communityHub/member/votes/{voteId}.
 * 7. Validates vote record identity preserved, value is -1, created_at unchanged, updated_at advanced, and karma decreased by 2.
 */
export async function test_api_vote_update_upvote_to_downvote_on_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Create text post
  const post = await generate_random_community_hub_communities_posts_create(
    memberConnection,
    {
      body: {
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 1 }),
      },
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // 5. Cast initial upvote
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
  // 6. Update vote to downvote
  const updatedVote = await api.functional.communityHub.member.votes.update(
    memberConnection,
    {
      voteId: initialVote.id,
      body: { value: -1 } satisfies ICommunityHubVote.IUpdate,
    },
  );
  typia.assert(updatedVote);
  // 7. Validate vote record identity and value
  TestValidator.equals("vote id preserved", updatedVote.id, initialVote.id);
  TestValidator.equals("vote value is downvote", updatedVote.value, -1);
  // 8. Validate timestamps
  TestValidator.equals(
    "created_at preserved",
    updatedVote.created_at,
    initialVote.created_at,
  );
  TestValidator.predicate(
    "updated_at advanced",
    updatedVote.updated_at > updatedVote.created_at,
  );
  // 9. Validate karma decreased by 2 (voter is post author, so karma reflected in vote response)
  TestValidator.equals(
    "karma decreased by 2",
    updatedVote.member.karma,
    initialVote.member.karma - 2,
  );
}
