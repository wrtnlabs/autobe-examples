import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_community } from "../prepare/prepare_random_community_platform_community";

export async function generate_random_community_platform_user_communities_create_community(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformCommunity.ICreate> | undefined;
  },
): Promise<ICommunityPlatformCommunity> {
  const prepared: ICommunityPlatformCommunity.ICreate =
    prepare_random_community_platform_community(props.body);
  const result: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.createCommunity(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
