import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardNotificationDeliveryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationDeliveryLog";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardNotificationDeliveryLogTransformer {
  export type Payload =
    Prisma.discussion_board_notification_delivery_logsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        delivery_status: true,
        delivered_at: true,
        failed_at: true,
        error_message: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        notificationRecord: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_notification_delivery_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardNotificationDeliveryLog> {
    return {
      id: input.id,
      notification_id: input.notificationRecord.id,
      status: input.delivery_status as
        | "pending"
        | "sent"
        | "failed"
        | "delivered",
      delivery_method: undefined,
      error_message: input.error_message ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
