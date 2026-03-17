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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_vote_removal_upvote(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member A (post author) creates account
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // Step 2: Member A creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Member A creates a text post
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberAConnection,
      {
        params: { communityId: community.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          postType: "text",
          content: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    );
  typia.assert(post);
  // Step 4: Member B creates account
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // Step 5: Member B upvotes Member A's post
  const upvoteResult = await api.functional.communityPlatform.member.votes.cast(
    memberBConnection,
    {
      body: {
        targetType: "post",
        targetId: post.id,
        voteType: "upvote",
      } satisfies ICommunityPlatformPostVote.IRequest,
    },
  );
  typia.assert(upvoteResult);
  // Validate upvote was created correctly
  TestValidator.equals("upvote voteType", upvoteResult.voteType, "upvote");
  TestValidator.equals("upvote targetType", upvoteResult.targetType, "post");
  TestValidator.equals("upvote targetId", upvoteResult.targetId, post.id);
  TestValidator.equals("upvote member", upvoteResult.member.id, memberB.id);
  // Step 6: Member B removes their upvote by setting voteType to null
  const removalResult =
    await api.functional.communityPlatform.member.votes.cast(
      memberBConnection,
      {
        body: {
          targetType: "post",
          targetId: post.id,
          voteType: null,
        } satisfies ICommunityPlatformPostVote.IRequest,
      },
    );
  // Validate vote removal - API returns null when vote is deleted
  TestValidator.equals("vote removal returns null", removalResult, null);
}
