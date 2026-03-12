import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_community } from "../prepare/prepare_random_reddit_clone_community";

export async function generate_random_reddit_clone_member_communities_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCloneCommunity.ICreate> | undefined;
  },
): Promise<IRedditCloneCommunity> {
  const prepared: IRedditCloneCommunity.ICreate =
    prepare_random_reddit_clone_community(props.body);
  const result: IRedditCloneCommunity =
    await api.functional.redditClone.member.communities.create(connection, {
      body: prepared,
    });
  return result;
}
