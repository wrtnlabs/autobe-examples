import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardNotificationReadStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationReadStatus";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardNotificationReadStatusTransformer {
  export type Payload =
    Prisma.discussion_board_notification_read_statusGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        user_id: true,
        read_at: true,
        created_at: true,
        updated_at: true,
        notificationRecord: true,
      },
    } satisfies Prisma.discussion_board_notification_read_statusFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardNotificationReadStatus> {
    return {
      value: input.read_at !== null,
    };
  }
}
