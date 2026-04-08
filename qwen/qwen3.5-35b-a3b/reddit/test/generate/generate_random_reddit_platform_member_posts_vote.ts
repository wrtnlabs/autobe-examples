import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_platform_post_vote } from "../prepare/prepare_random_reddit_platform_post_vote";

export async function generate_random_reddit_platform_member_posts_vote(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditPlatformPostVote.ICreate> | undefined;
    params: {
      postId: string;
    };
  },
): Promise<IRedditPlatformPostVote> {
  const prepared: IRedditPlatformPostVote.ICreate =
    prepare_random_reddit_platform_post_vote(props.body);
  return await api.functional.redditPlatform.member.posts.vote(connection, {
    body: prepared,
    postId: props.params.postId,
  });
}
