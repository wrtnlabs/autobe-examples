import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_post_vote } from "../prepare/prepare_random_community_platform_post_vote";

export async function generate_random_community_platform_member_posts_votes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformPostVote.ICreate> | undefined;
    params: {
      postId: string;
    };
  },
): Promise<ICommunityPlatformPostVote> {
  const prepared: ICommunityPlatformPostVote.ICreate =
    prepare_random_community_platform_post_vote(props.body);
  return await api.functional.communityPlatform.member.posts.votes.create(
    connection,
    {
      body: prepared,
      postId: props.params.postId,
    },
  );
}
