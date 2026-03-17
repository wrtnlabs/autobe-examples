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

export async function test_api_vote_upvote_creation_on_post(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create Member A (post author) connection and authenticate
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
  // Step 3: Member A creates a text post in the community
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberAConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          postType: "text",
          content: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(post);
  // Step 4: Create Member B (voter) connection and authenticate
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // Step 5: Member B casts an upvote on Member A's post
  const vote = await api.functional.communityPlatform.member.votes.cast(
    memberBConnection,
    {
      body: {
        targetType: "post",
        targetId: post.id,
        voteType: "upvote",
      } satisfies ICommunityPlatformPostVote.IRequest,
    },
  );
  typia.assert(vote);
  // Step 6: Verify the vote record properties
  TestValidator.equals("target type", vote.targetType, "post");
  TestValidator.equals("target ID", vote.targetId, post.id);
  TestValidator.equals("vote type", vote.voteType, "upvote");
  TestValidator.equals("voter ID", vote.member.id, memberB.id);
  TestValidator.predicate(
    "has generated UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      vote.id,
    ),
  );
  TestValidator.predicate(
    "has created at timestamp",
    !isNaN(new Date(vote.createdAt).getTime()),
  );
  TestValidator.predicate(
    "has updated at timestamp",
    !isNaN(new Date(vote.updatedAt).getTime()),
  );
}
