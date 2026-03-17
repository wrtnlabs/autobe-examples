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

export async function test_api_vote_post_upvote_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member A (author) who will receive karma from the vote
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  // Step 2: Member A creates a community (becomes owner automatically)
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Member A creates a text post in the community
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      authorConnection,
      {
        params: { communityId: community.id },
        body: {
          title: RandomGenerator.name(),
          postType: "text",
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(post);
  // Step 4: Create member B (voter) who will cast the upvote
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {});
  typia.assert(voter);
  // Step 5: Member B casts an upvote on the post
  const vote = await generate_random_community_platform_member_votes_create(
    voterConnection,
    {
      body: {
        targetType: "post",
        targetId: post.id,
        voteType: "upvote",
      },
    },
  );
  typia.assert(vote);
  // Step 6: Validate the vote record was created correctly
  TestValidator.equals("vote target type", vote.targetType, "post");
  TestValidator.equals("vote target id", vote.targetId, post.id);
  TestValidator.equals("vote type", vote.voteType, "upvote");
  TestValidator.equals("voter id", vote.member.id, voter.id);
  // Step 7: Verify the post's vote score increased by 1
  TestValidator.equals("post vote score", post.voteScore, 1);
}
