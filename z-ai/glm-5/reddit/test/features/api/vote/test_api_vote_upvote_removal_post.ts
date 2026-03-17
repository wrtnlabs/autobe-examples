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

export async function test_api_vote_upvote_removal_post(
  connection: api.IConnection,
): Promise<void> {
  // Create member A (post author)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // Create a community as member A
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create a post in the community as member A
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberAConnection,
      {
        params: { communityId: community.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          postType: "text",
          content: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(post);
  // Create member B (voter)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // Member B casts an upvote on member A's post
  const vote = await generate_random_community_platform_member_votes_create(
    memberBConnection,
    {
      body: {
        targetType: "post",
        targetId: post.id,
        voteType: "upvote",
      } satisfies ICommunityPlatformPostVote.ICreate,
    },
  );
  typia.assert(vote);
  // Verify vote was created with correct properties
  TestValidator.equals("vote target type", vote.targetType, "post");
  TestValidator.equals("vote target id", vote.targetId, post.id);
  TestValidator.equals("vote type", vote.voteType, "upvote");
  TestValidator.equals("voter is member B", vote.member.id, memberB.id);
  // Remove the upvote as member B
  await api.functional.communityPlatform.member.votes.erase(memberBConnection, {
    voteId: vote.id,
  });
  // Verify vote was removed by attempting to create a new vote on the same post
  // This should succeed because the previous vote was deleted
  const newVote = await generate_random_community_platform_member_votes_create(
    memberBConnection,
    {
      body: {
        targetType: "post",
        targetId: post.id,
        voteType: "upvote",
      } satisfies ICommunityPlatformPostVote.ICreate,
    },
  );
  typia.assert(newVote);
  // Verify the new vote was created successfully
  TestValidator.equals("new vote target", newVote.targetId, post.id);
  TestValidator.equals("new vote type", newVote.voteType, "upvote");
  // Clean up - remove the new vote
  await api.functional.communityPlatform.member.votes.erase(memberBConnection, {
    voteId: newVote.id,
  });
}
