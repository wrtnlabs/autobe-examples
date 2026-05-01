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
 * Test that when a member removes their downvote from a post, the vote record
 * is permanently deleted and can no longer be referenced.
 *
 * Verifies the complete vote removal lifecycle: a member registers, creates a
 * community, subscribes, creates a text post, casts a downvote, and then
 * removes that downvote. The test confirms that the erase operation completes
 * successfully and that the vote record is irreversibly deleted by attempting
 * a second erase which must fail.
 *
 * 1. Member registers and authenticates via join.
 * 2. Member creates a community and subscribes to it.
 * 3. Member creates a text post in the community.
 * 4. Member casts a downvote on the post with value -1.
 * 5. Member removes the downvote via the erase endpoint.
 * 6. Verifies the vote is permanently deleted by confirming a second erase
 *    attempt on the same voteId throws an error.
 */
export async function test_api_vote_removal_downvote_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
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
      params: { communityName: community.name },
      body: { type: "text" },
    },
  );
  typia.assert(post);
  // 5. Cast downvote on the post
  const vote = await api.functional.communityHub.member.votes.create(
    memberConnection,
    {
      body: {
        target_type: "post",
        target_id: post.id,
        value: -1,
      } satisfies ICommunityHubVote.ICreate,
    },
  );
  typia.assert(vote);
  // 6. Remove the downvote
  await api.functional.communityHub.member.votes.erase(memberConnection, {
    voteId: vote.id,
  });
  // 7. Verify the vote is permanently deleted
  await TestValidator.error("removed vote should no longer exist", async () => {
    await api.functional.communityHub.member.votes.erase(memberConnection, {
      voteId: vote.id,
    });
  });
}
