import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformNotificationSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationSubscription";
export function prepare_random_community_platform_notification_subscription(
  input?: DeepPartial<ICommunityPlatformNotificationSubscription.ICreate>,
): ICommunityPlatformNotificationSubscription.ICreate {
  return {
    notification_type:
      input?.notification_type ??
      RandomGenerator.pick([
        "community_updates",
        "post_replies",
        "moderation_events",
        "system_alerts",
      ] as const),
    channel:
      input?.channel ??
      RandomGenerator.pick(["email", "in_app", "push"] as const),
    enabled: input?.enabled ?? RandomGenerator.pick([true, false] as const),
    created_at: typia.random<string & tags.Format<"date-time">>(),
    last_status_changed_at: typia.random<string & tags.Format<"date-time">>(),
    last_notified_at:
      input?.last_notified_at ??
      (RandomGenerator.pick([true, false] as const)
        ? typia.random<string & tags.Format<"date-time">>()
        : null),
  };
}
