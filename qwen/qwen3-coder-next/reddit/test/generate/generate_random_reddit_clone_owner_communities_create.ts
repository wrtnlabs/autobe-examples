import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_community } from "../prepare/prepare_random_reddit_clone_community";

export async function generate_random_reddit_clone_owner_communities_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCloneCommunity.ICreate> | undefined;
  },
): Promise<IRedditCloneCommunity> {
  const prepared: IRedditCloneCommunity.ICreate =
    prepare_random_reddit_clone_community(props.body);
  return await api.functional.redditClone.owner.communities.create(connection, {
    body: prepared,
  });
}
