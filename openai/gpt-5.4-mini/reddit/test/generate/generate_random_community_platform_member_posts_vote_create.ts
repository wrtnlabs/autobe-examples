import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_vote } from "../prepare/prepare_random_community_platform_vote";

export async function generate_random_community_platform_member_posts_vote_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformVote.ICreate> | undefined;
    params: {
      postId: string;
    };
  },
): Promise<ICommunityPlatformVote> {
  const prepared: ICommunityPlatformVote.ICreate =
    prepare_random_community_platform_vote(props.body);
  return await api.functional.communityPlatform.member.posts.vote.create(
    connection,
    {
      body: prepared,
      postId: props.params.postId,
    },
  );
}
