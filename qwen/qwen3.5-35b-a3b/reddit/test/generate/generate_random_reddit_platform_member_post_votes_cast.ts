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

export async function generate_random_reddit_platform_member_post_votes_cast(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditPlatformPostVote.ICreate>;
  },
): Promise<IRedditPlatformPostVote> {
  const prepared: IRedditPlatformPostVote.ICreate =
    prepare_random_reddit_platform_post_vote(props.body);
  const result: IRedditPlatformPostVote =
    await api.functional.redditPlatform.member.post_votes.cast(connection, {
      body: prepared,
    });
  return result;
}
