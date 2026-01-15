import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardNotificationTriggerContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationTriggerContext";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardNotificationTriggerContextTransformer {
  export type Payload = Prisma.discussion_board_notification_recordsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        notification_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        is_read: true,
        recipient: true,
        targetPost: true,
        targetComment: true,
        targetReport: true,
        targetModerationAction: true,
        targetAppeal: true,
        discussion_board_notification_delivery_logs: true,
        discussion_board_notification_read_status: true,
        metadata: true,
      },
    } satisfies Prisma.discussion_board_notification_recordsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardNotificationTriggerContext> {
    const metadata = input.metadata ? JSON.parse(input.metadata) : {};
    return {
      trigger_type: metadata.trigger_type,
    };
  }
}
