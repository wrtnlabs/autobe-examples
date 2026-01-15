import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformNotificationSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationSubscription";
import { prepare_random_community_platform_notification_subscription } from "../prepare/prepare_random_community_platform_notification_subscription";
export async function generate_random_community_platform_member_notification_subscriptions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformNotificationSubscription.ICreate>;
  },
): Promise<ICommunityPlatformNotificationSubscription> {
  const prepared: ICommunityPlatformNotificationSubscription.ICreate =
    prepare_random_community_platform_notification_subscription(props.body);
  const result: ICommunityPlatformNotificationSubscription =
    await api.functional.communityPlatform.member.notification_subscriptions.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
