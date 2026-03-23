import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_community } from "../prepare/prepare_random_reddit_like_community";

export async function generate_random_reddit_like_member_communities_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikeCommunity.ICreate> | undefined;
  },
): Promise<IRedditLikeCommunity> {
  const prepared: IRedditLikeCommunity.ICreate =
    prepare_random_reddit_like_community(props.body);
  return await api.functional.redditLike.member.communities.create(connection, {
    body: prepared,
  });
}
