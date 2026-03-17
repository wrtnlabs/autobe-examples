import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_subscription } from "../prepare/prepare_random_community_platform_subscription";

export async function generate_random_community_platform_member_subscriptions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformSubscription.ICreate> | undefined;
  },
): Promise<ICommunityPlatformSubscription> {
  const prepared: ICommunityPlatformSubscription.ICreate =
    prepare_random_community_platform_subscription(props.body);
  const result: ICommunityPlatformSubscription =
    await api.functional.communityPlatform.member.subscriptions.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
