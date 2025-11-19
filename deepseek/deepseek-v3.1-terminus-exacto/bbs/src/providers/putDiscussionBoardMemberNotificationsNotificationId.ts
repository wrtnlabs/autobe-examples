import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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

export async function putDiscussionBoardMemberNotificationsNotificationId(props: {
  member: MemberPayload;
  notificationId: string & tags.Format<"uuid">;
  body: IDiscussionBoardUserNotification.IUpdate;
}): Promise<IDiscussionBoardUserNotification> {
  // First get member information for the summary
  const member = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: { id: props.member.id },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  // Verify notification exists and belongs to the member
  const existingNotification =
    await MyGlobal.prisma.discussion_board_user_notifications.findFirst({
      where: {
        id: props.notificationId,
        discussion_board_member_id: props.member.id,
        deleted_at: null,
      },
    });

  if (!existingNotification) {
    throw new HttpException("Notification not found or access denied", 404);
  }

  // Build update data with proper null/undefined handling
  const updateData = {
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.delivery_method !== undefined && {
      delivery_method: props.body.delivery_method,
    }),
    ...(props.body.related_entity_type !== undefined && {
      related_entity_type: props.body.related_entity_type,
    }),
    ...(props.body.related_entity_id !== undefined && {
      related_entity_id: props.body.related_entity_id,
    }),
    updated_at: toISOStringSafe(new Date()),
  };

  // Update the notification
  const updatedNotification =
    await MyGlobal.prisma.discussion_board_user_notifications.update({
      where: { id: props.notificationId },
      data: updateData,
    });

  // Return the updated notification with proper type conversions
  return {
    id: updatedNotification.id as string & tags.Format<"uuid">,
    notification_type:
      updatedNotification.notification_type as IDiscussionBoardNotificationTypeFilter,
    title: updatedNotification.title,
    message: updatedNotification.message,
    status:
      updatedNotification.status as IDiscussionBoardNotificationStatusFilter,
    delivery_method:
      updatedNotification.delivery_method as IDiscussionBoardDeliveryMethodFilter,
    member: {
      id: member.id as string & tags.Format<"uuid">,
      type: "member" as const,
      name: member.display_name ?? member.username,
    },
    related_entity_type:
      updatedNotification.related_entity_type === null
        ? undefined
        : updatedNotification.related_entity_type,
    related_entity_id:
      updatedNotification.related_entity_id === null
        ? undefined
        : (updatedNotification.related_entity_id as
            | (string & tags.Format<"uuid">)
            | undefined),
    created_at: toISOStringSafe(updatedNotification.created_at),
    updated_at: toISOStringSafe(updatedNotification.updated_at),
    deleted_at: updatedNotification.deleted_at
      ? toISOStringSafe(updatedNotification.deleted_at)
      : undefined,
  };
}
