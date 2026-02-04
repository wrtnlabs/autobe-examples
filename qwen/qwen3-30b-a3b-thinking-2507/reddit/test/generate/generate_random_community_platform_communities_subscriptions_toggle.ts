import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_community_subscription } from "../prepare/prepare_random_community_platform_community_subscription";

export async function generate_random_community_platform_communities_subscriptions_toggle(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformCommunitySubscription.ICreate>;
    params: {
      communityId: string;
    };
  },
): Promise<ICommunityPlatformCommunitySubscription.IResponse> {
  const prepared = prepare_random_community_platform_community_subscription(
    props.body,
  );
  return await api.functional.communityPlatform.communities.subscriptions.toggle(
    connection,
    {
      communityId: props.params.communityId,
      body: prepared,
    },
  );
}
