import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformFailedNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFailedNotification";
export function prepare_random_community_platform_failed_notification(
  input?: DeepPartial<ICommunityPlatformFailedNotification.ICreate>,
): ICommunityPlatformFailedNotification.ICreate {
  return {
    notification_event_id:
      input?.notification_event_id ??
      typia.random<string & tags.Format<"uuid">>(),
    reason:
      input?.reason ??
      RandomGenerator.pick([
        "Invalid email address",
        "Bounced message",
        "Non-responsive push token",
        "Unable to reach server",
        "Message content rejected",
        "Authentication failed",
        "Quota exceeded",
        "Rate limit exceeded",
        "Network timeout",
        "Recipient not found",
      ] as const),
    details:
      input?.details ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 15 }),
  };
}
