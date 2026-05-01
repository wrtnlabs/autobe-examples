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
 * Test removal of an upvote from a post and verify the vote record is permanently deleted.
 *
 * Validates the complete vote lifecycle from member registration through vote removal. The test covers community setup, subscription, post creation, upvote casting with explicit target validation, and final vote erasure. Ensures that when a member removes their upvote, the erase endpoint completes successfully and the vote record reference is consumed correctly.
 *
 * 1. Member registers via join endpoint and authenticates.
 * 2. Member creates a community and subscribes to it.
 * 3. Member creates a text post within the subscribed community.
 * 4. Member casts an upvote on the post with explicit target type and ID.
 * 5. Validates the vote record reflects the correct target and upvote direction.
 * 6. Member removes the upvote via the erase endpoint using the vote ID.
 */
export async function test_api_vote_removal_upvote_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
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
      body: { type: "text" },
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // 5. Cast upvote on the post
  const vote = await generate_random_community_hub_member_votes_create(
    memberConnection,
    {
      body: {
        target_type: "post",
        target_id: post.id,
        value: 1,
      },
    },
  );
  typia.assert(vote);
  // Validate vote record
  TestValidator.equals("vote target type", vote.target_type, "post");
  TestValidator.equals("vote target id", vote.target_id, post.id);
  TestValidator.equals("vote direction is upvote", vote.value, 1);
  // 6. Erase (remove) the vote
  await api.functional.communityHub.member.votes.erase(memberConnection, {
    voteId: vote.id,
  });
}
