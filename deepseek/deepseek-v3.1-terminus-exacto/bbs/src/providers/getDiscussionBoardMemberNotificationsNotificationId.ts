import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserNotification";
import { IDiscussionBoardNotificationTypeFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationTypeFilter";
import { IDiscussionBoardNotificationStatusFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationStatusFilter";
import { IDiscussionBoardDeliveryMethodFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDeliveryMethodFilter";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getDiscussionBoardMemberNotificationsNotificationId(props: {
  member: MemberPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardUserNotification> {
  const notification =
    await MyGlobal.prisma.discussion_board_user_notifications.findUnique({
      where: {
        id: props.notificationId,
        discussion_board_member_id: props.member.id,
        deleted_at: null,
      },
    });

  if (!notification) {
    throw new HttpException("Notification not found", 404);
  }

  const member = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      display_name: true,
    },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  return {
    id: notification.id,
    notification_type: typia.assert<IDiscussionBoardNotificationTypeFilter>(
      notification.notification_type,
    ),
    title: notification.title,
    message: notification.message,
    status: typia.assert<IDiscussionBoardNotificationStatusFilter>(
      notification.status,
    ),
    delivery_method: typia.assert<IDiscussionBoardDeliveryMethodFilter>(
      notification.delivery_method,
    ),
    member: {
      id: member.id,
      type: "member",
      name: member.display_name ?? "",
    } satisfies IDiscussionBoardMember.ISummary,
    related_entity_type: notification.related_entity_type ?? undefined,
    related_entity_id: notification.related_entity_id ?? undefined,
    created_at: toISOStringSafe(notification.created_at),
    updated_at: toISOStringSafe(notification.updated_at),
    deleted_at: notification.deleted_at
      ? toISOStringSafe(notification.deleted_at)
      : undefined,
  };
}
