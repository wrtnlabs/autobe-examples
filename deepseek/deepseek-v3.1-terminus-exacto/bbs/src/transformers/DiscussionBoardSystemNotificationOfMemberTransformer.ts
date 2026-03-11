import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotification";
import { IDiscussionBoardSystemNotificationOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotificationOfMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardMemberAtSummaryTransformer } from "./DiscussionBoardMemberAtSummaryTransformer";
import { DiscussionBoardSystemNotificationAtSummaryTransformer } from "./DiscussionBoardSystemNotificationAtSummaryTransformer";

export namespace DiscussionBoardSystemNotificationOfMemberTransformer {
  export type Payload =
    Prisma.discussion_board_system_notification_of_membersGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        is_read: true,
        read_at: true,
        acknowledged_at: true,
        notification_preferences: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        systemNotification:
          DiscussionBoardSystemNotificationAtSummaryTransformer.select(),
        member: DiscussionBoardMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_system_notification_of_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSystemNotificationOfMember> {
    return {
      id: input.id,
      is_read: input.is_read,
      read_at: input.read_at?.toISOString() ?? null,
      acknowledged_at: input.acknowledged_at?.toISOString() ?? null,
      notification_preferences: input.notification_preferences ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      systemNotification:
        await DiscussionBoardSystemNotificationAtSummaryTransformer.transform(
          input.systemNotification,
        ),
      member: await DiscussionBoardMemberAtSummaryTransformer.transform(
        input.member,
      ),
    };
  }
}
