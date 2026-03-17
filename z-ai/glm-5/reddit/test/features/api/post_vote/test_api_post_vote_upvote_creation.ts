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

export async function test_api_post_vote_upvote_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create post author member
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  // 2. Create community as author
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  // 3. Create post as author in the community
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      authorConnection,
      {
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(post);
  // 4. Create a different member (voter) who is NOT the post author
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {});
  typia.assert(voter);
  // 5. Cast upvote on the post
  const vote = await api.functional.communityPlatform.member.posts.vote.update(
    voterConnection,
    {
      postId: post.id,
      body: {
        vote_type: "upvote",
        target_type: "post",
      } satisfies ICommunityPlatformPostVote.IUpdate,
    },
  );
  typia.assert(vote);
  // 6. Validate vote response
  TestValidator.equals("targetId matches post", vote.targetId, post.id);
  TestValidator.equals("targetType is post", vote.targetType, "post");
  TestValidator.equals("voteType is upvote", vote.voteType, "upvote");
  TestValidator.equals("voter member id matches", vote.member.id, voter.id);
  TestValidator.predicate("vote has id", vote.id.length > 0);
  TestValidator.predicate(
    "has created_at timestamp",
    vote.createdAt !== null && vote.createdAt !== undefined,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    vote.updatedAt !== null && vote.updatedAt !== undefined,
  );
}
