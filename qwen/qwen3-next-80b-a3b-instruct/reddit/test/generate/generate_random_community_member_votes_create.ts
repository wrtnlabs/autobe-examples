import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_post_vote } from "../prepare/prepare_random_community_post_vote";

export async function generate_random_community_member_votes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPostVote.ICreate> | undefined;
  },
): Promise<ICommunityPostVote> {
  const prepared: ICommunityPostVote.ICreate =
    prepare_random_community_post_vote(props.body);
  return await api.functional.community.member.votes.create(connection, {
    body: prepared,
  });
}
