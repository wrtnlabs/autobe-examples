import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_platform_community_subscription } from "../prepare/prepare_random_reddit_platform_community_subscription";

export async function generate_random_reddit_platform_member_subscriptions_subscribe(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IRedditPlatformCommunitySubscription.ICreate>
      | undefined;
  },
): Promise<IRedditPlatformCommunitySubscription> {
  const prepared: IRedditPlatformCommunitySubscription.ICreate =
    prepare_random_reddit_platform_community_subscription(props.body);
  const result: IRedditPlatformCommunitySubscription =
    await api.functional.redditPlatform.member.subscriptions.subscribe(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
