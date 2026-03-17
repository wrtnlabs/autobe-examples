import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
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
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { generate_random_community_platform_member_votes_create } from "../../../generate/generate_random_community_platform_member_votes_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_vote_duplicate_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A (post author and community owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Member A creates a community (creator becomes owner with full moderation authority)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Member A creates a post in the community
  // Note: Per API spec, only subscribed members can create posts
  // Community creator should be automatically subscribed
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberAConnection,
      {
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(post);
  // 4. Create Member B (voter who will attempt duplicate votes)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 5. Member B casts initial upvote on the post - this should succeed
  const firstVote =
    await generate_random_community_platform_member_votes_create(
      memberBConnection,
      {
        body: {
          targetType: "post",
          targetId: post.id,
          voteType: "upvote",
        },
      },
    );
  typia.assert(firstVote);
  TestValidator.equals("first vote type", firstVote.voteType, "upvote");
  TestValidator.equals("first vote target", firstVote.targetId, post.id);
  // 6. Member B attempts to cast another vote (downvote) on the same post
  // This should be rejected with 409 Conflict per single-vote enforcement rule
  await TestValidator.httpError(
    "duplicate vote should be rejected with 409 Conflict",
    409,
    async () => {
      await api.functional.communityPlatform.member.votes.create(
        memberBConnection,
        {
          body: {
            targetType: "post",
            targetId: post.id,
            voteType: "downvote",
          } satisfies ICommunityPlatformPostVote.ICreate,
        },
      );
    },
  );
}
