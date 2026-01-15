import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationTemplate";
import { IDiscussionBoardNotificationTemplateMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationTemplateMetadata";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardNotificationTemplateTransformer {
  export type Payload =
    Prisma.discussion_board_notification_templatesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        content: true,
        trigger_event: true,
        metadata: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.discussion_board_notification_templatesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardNotificationTemplate> {
    // Map trigger_event string to enum type
    const eventType: "user_engagement" | "moderation_action" | "system_event" =
      input.trigger_event === "user_engagement"
        ? "user_engagement"
        : input.trigger_event === "moderation_action"
          ? "moderation_action"
          : "system_event";
    return {
      id: input.id,
      name: "", // Default value when not in schema
      title: input.title,
      content: input.content,
      is_active: true, // Default value when not in schema
      event_type: eventType,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      version: 1, // Default value when not in schema
      lang: "en", // Default value when not in schema
      category: "system", // Default value when not in schema
      priority: 3, // Default value when not in schema
      delivery_channels: ["in_app"], // Default value when not in schema
      placeholders: undefined, // Optional field, not in schema
      metadata: input.metadata ?? undefined,
    };
  }
}
