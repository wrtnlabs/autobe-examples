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
import { generate_random_community_platform_member_posts_vote_create } from "../../../generate/generate_random_community_platform_member_posts_vote_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_post_vote_downvote_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup member A (the voter)
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {});
  // 2. Setup member B (the post author)
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  // 3. Author creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  // 4. Author creates a text post in the community
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      authorConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          postType: "text",
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(post);
  // 5. Voter casts a downvote on author's post
  const vote =
    await generate_random_community_platform_member_posts_vote_create(
      voterConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          targetType: "post",
          targetId: post.id,
          voteType: "downvote",
        },
      },
    );
  typia.assert(vote);
  // 6. Validate vote response business logic
  TestValidator.equals("vote type", vote.voteType, "downvote");
  TestValidator.equals("target type", vote.targetType, "post");
  TestValidator.equals("target id", vote.targetId, post.id);
  TestValidator.equals("voter id", vote.member.id, voter.id);
}
