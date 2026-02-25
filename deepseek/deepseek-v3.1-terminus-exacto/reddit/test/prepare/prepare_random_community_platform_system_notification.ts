import { ICommunityPlatformSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_system_notification(
  input?: DeepPartial<ICommunityPlatformSystemNotification.ICreate>,
): ICommunityPlatformSystemNotification.ICreate {
  return {
    notification_type:
      input?.notification_type ??
      RandomGenerator.pick([
        "report_alerts",
        "moderation_actions",
        "platform_announcements",
        "user_activities",
      ] as const),
    title:
      input?.title ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 5 }),
    message:
      input?.message ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 2,
        sentenceMax: 5,
      }),
    priority:
      input?.priority ??
      RandomGenerator.pick(["low", "normal", "high", "urgent"] as const),
    status:
      input?.status ??
      RandomGenerator.pick(["pending", "processing", "completed"] as const),
    is_broadcast:
      input?.is_broadcast ?? RandomGenerator.pick([true, false] as const),
    related_community_id: input?.related_community_id ?? null,
    related_post_id: input?.related_post_id ?? null,
    related_comment_id: input?.related_comment_id ?? null,
    action_url: input?.action_url ?? null,
  };
}
