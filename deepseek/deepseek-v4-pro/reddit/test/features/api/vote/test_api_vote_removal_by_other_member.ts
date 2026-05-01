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
 * Test that a member cannot delete another member's vote.
 *
 * Validates the authorization rule that only the original vote creator may
 * delete their own vote. When a different authenticated member attempts to
 * remove a vote they did not cast, the system must reject the request with
 * HTTP 403 Forbidden, preserving the original vote record intact.
 *
 * 1. Member A joins, creates a community, subscribes, and creates a text post.
 * 2. Member B joins, subscribes to the same community, and upvotes Member A's post.
 * 3. Member A attempts to delete Member B's vote — expects 403 Forbidden.
 */
export async function test_api_vote_removal_by_other_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A setup
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  const community =
    await generate_random_community_hub_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  await api.functional.communityHub.member.communities.subscriptions.create(
    memberAConnection,
    {
      communityName: community.name,
    },
  );
  const post = await generate_random_community_hub_communities_posts_create(
    memberAConnection,
    {
      params: { communityName: community.name },
      body: { type: "text" },
    },
  );
  typia.assert(post);
  // 2. Member B setup
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  await api.functional.communityHub.member.communities.subscriptions.create(
    memberBConnection,
    {
      communityName: community.name,
    },
  );
  const memberBVote = await generate_random_community_hub_member_votes_create(
    memberBConnection,
    {
      body: {
        target_type: "post",
        target_id: post.id,
        value: 1,
      },
    },
  );
  typia.assert(memberBVote);
  // 3. Member A attempts to delete Member B's vote — must fail with 403
  await TestValidator.error("member A cannot delete member B's vote", () =>
    api.functional.communityHub.member.votes.erase(memberAConnection, {
      voteId: memberBVote.id,
    }),
  );
}