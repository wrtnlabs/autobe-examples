import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_platform_community } from "../prepare/prepare_random_reddit_platform_community";

export async function generate_random_reddit_platform_user_communities_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditPlatformCommunity.ICreate> | undefined;
  },
): Promise<IRedditPlatformCommunity> {
  const prepared: IRedditPlatformCommunity.ICreate =
    prepare_random_reddit_platform_community(props.body);
  return await api.functional.redditPlatform.user.communities.create(
    connection,
    {
      body: prepared,
    },
  );
}
