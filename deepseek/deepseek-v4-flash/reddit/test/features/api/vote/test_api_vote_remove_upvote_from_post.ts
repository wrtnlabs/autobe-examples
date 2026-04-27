import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_subscribers_create } from "../../../generate/generate_random_community_platform_member_communities_subscribers_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_votes_create } from "../../../generate/generate_random_community_platform_member_votes_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";
import { prepare_random_community_platform_vote } from "../../../prepare/prepare_random_community_platform_vote";

export async function test_api_vote_remove_upvote_from_post(
  connection: api.IConnection,
): Promise<void> {
  // Setup actor-specific connections
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  // 1. Join Member A (voter and community creator)
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Join Member B (post author — different from voter to avoid self-vote prohibition)
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 3. Member A creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 4. Member A subscribes to the community (required to create posts)
  await generate_random_community_platform_member_communities_subscribers_create(
    memberAConnection,
    {
      params: { communityId: community.id },
    },
  );
  // 5. Member B subscribes to the community (required to create posts)
  await generate_random_community_platform_member_communities_subscribers_create(
    memberBConnection,
    {
      params: { communityId: community.id },
    },
  );
  // 6. Member B creates a text post in the community
  const post = await generate_random_community_platform_member_posts_create(
    memberBConnection,
    {
      body: {
        communityId: community.id,
        type: "text",
      },
    },
  );
  typia.assert(post);
  // 7. Member A casts an upvote (+1) on Member B's post
  const vote = await generate_random_community_platform_member_votes_create(
    memberAConnection,
    {
      body: {
        target_type: "post",
        target_id: post.id,
        value: 1,
      },
    },
  );
  typia.assert(vote);
  // Verify vote details before removal
  TestValidator.predicate(
    "vote targets the correct post",
    () => vote.target_id === post.id,
  );
  TestValidator.equals("vote is an upvote", vote.value, 1);
  TestValidator.equals("vote targets a post", vote.target_type, "post");
  // 8. Member A removes the upvote via DELETE /communityPlatform/member/votes/{voteId}
  await api.functional.communityPlatform.member.votes.erase(memberAConnection, {
    voteId: vote.id,
  });
  // 9. Member A can cast a fresh vote on the same post — confirms old vote was hard-deleted
  const newVote = await generate_random_community_platform_member_votes_create(
    memberAConnection,
    {
      body: {
        target_type: "post",
        target_id: post.id,
        value: 1,
      },
    },
  );
  typia.assert(newVote);
  // The new vote must have a different ID from the removed one (hard-delete confirmation)
  TestValidator.notEquals(
    "new vote id differs from removed vote",
    newVote.id,
    vote.id,
  );
  // Clean up: remove the second vote
  await api.functional.communityPlatform.member.votes.erase(memberAConnection, {
    voteId: newVote.id,
  });
}
