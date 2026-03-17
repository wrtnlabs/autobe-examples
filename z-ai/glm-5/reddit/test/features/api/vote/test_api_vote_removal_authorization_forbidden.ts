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

export async function test_api_vote_removal_authorization_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member A (community owner and post author)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Create member B (will cast the vote)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 3. Create a community as member A
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 4. Create a post in the community as member A
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberAConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(post);
  // 5. Have member B upvote member A's post
  const vote = await generate_random_community_platform_member_votes_create(
    memberBConnection,
    {
      body: {
        targetType: "post",
        targetId: post.id,
        voteType: "upvote",
      },
    },
  );
  typia.assert(vote);
  // 6. Attempt to delete member B's vote as member A (should fail with 403)
  await TestValidator.httpError("unauthorized vote deletion", 403, async () => {
    await api.functional.communityPlatform.member.votes.erase(
      memberAConnection,
      {
        voteId: vote.id,
      },
    );
  });
}
