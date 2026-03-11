import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotification";
import { IDiscussionBoardSystemNotificationOfAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotificationOfAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdminAtSummaryTransformer } from "./DiscussionBoardAdminAtSummaryTransformer";
import { DiscussionBoardSystemNotificationAtSummaryTransformer } from "./DiscussionBoardSystemNotificationAtSummaryTransformer";

export namespace DiscussionBoardSystemNotificationOfAdminTransformer {
  export type Payload =
    Prisma.discussion_board_system_notification_of_adminsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        notification_context: true,
        systemNotification:
          DiscussionBoardSystemNotificationAtSummaryTransformer.select(),
        admin: DiscussionBoardAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_system_notification_of_adminsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSystemNotificationOfAdmin> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      notification_context: input.notification_context ?? null,
      systemNotification:
        await DiscussionBoardSystemNotificationAtSummaryTransformer.transform(
          input.systemNotification,
        ),
      admin: await DiscussionBoardAdminAtSummaryTransformer.transform(
        input.admin,
      ),
    };
  }
}
