import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_community_subscription } from "../prepare/prepare_random_community_platform_community_subscription";

export async function generate_random_community_platform_user_subscriptions_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<ICommunityPlatformCommunitySubscription.ICreate>
      | undefined;
  },
): Promise<ICommunityPlatformCommunitySubscription> {
  const prepared: ICommunityPlatformCommunitySubscription.ICreate =
    prepare_random_community_platform_community_subscription(props.body);
  const result: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.user.subscriptions.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
