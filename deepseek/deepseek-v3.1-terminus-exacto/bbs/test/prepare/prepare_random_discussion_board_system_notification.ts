import { IDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_system_notification(
  input?: DeepPartial<IDiscussionBoardSystemNotification.ICreate> | undefined,
): IDiscussionBoardSystemNotification.ICreate {
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    content: input?.content ?? RandomGenerator.content({ paragraphs: 2 }),
    notification_type:
      input?.notification_type ??
      RandomGenerator.pick([
        "announcement",
        "alert",
        "status_update",
        "moderation_action",
        "personal_message",
      ] as const),
    status:
      input?.status ??
      RandomGenerator.pick(["pending", "sent", "read", "archived"] as const),
    priority:
      input?.priority ??
      RandomGenerator.pick(["low", "normal", "high", "critical"] as const),
    target_entity_type:
      input?.target_entity_type !== undefined
        ? input.target_entity_type
        : RandomGenerator.pick([
            "article",
            "comment",
            "section",
            "admin_request",
            "user",
            null,
          ] as const),
    target_entity_id:
      input?.target_entity_id !== undefined
        ? input.target_entity_id
        : RandomGenerator.pick([
            typia.random<string & tags.Format<"uuid">>(),
            null,
          ] as const),
    expires_at:
      input?.expires_at !== undefined
        ? input.expires_at
        : RandomGenerator.pick([
            RandomGenerator.date(
              new Date(),
              1000 * 60 * 60 * 24 * 30,
            ).toISOString(),
            null,
          ] as const),
  };
}
