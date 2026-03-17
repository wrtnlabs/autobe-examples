import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { ICommunityPlatformSubscriptionPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionPreference";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_subscription_preference } from "../prepare/prepare_random_community_platform_subscription_preference";

export async function generate_random_community_platform_member_subscription_preferences_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<ICommunityPlatformSubscriptionPreference.ICreate>
      | undefined;
  },
): Promise<ICommunityPlatformSubscriptionPreference> {
  const prepared: ICommunityPlatformSubscriptionPreference.ICreate =
    prepare_random_community_platform_subscription_preference(props.body);
  const result: ICommunityPlatformSubscriptionPreference =
    await api.functional.communityPlatform.member.subscription_preferences.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
