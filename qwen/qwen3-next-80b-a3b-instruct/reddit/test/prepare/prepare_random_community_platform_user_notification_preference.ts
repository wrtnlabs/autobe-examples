import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserNotificationPreference";
export function prepare_random_community_platform_user_notification_preference(
  input?: DeepPartial<ICommunityPlatformUserNotificationPreference.ICreate>,
): ICommunityPlatformUserNotificationPreference.ICreate {
  return {
    email: RandomGenerator.pick([true, false] as const),
    push: RandomGenerator.pick([true, false] as const),
    in_app: RandomGenerator.pick([true, false] as const),
    sms: RandomGenerator.pick([true, false] as const),
    notification_type: RandomGenerator.pick([
      "all",
      "critical",
      "optional",
    ] as const),
    preference_state: RandomGenerator.pick([
      "enabled",
      "disabled",
      "system-default",
    ] as const),
  };
}
