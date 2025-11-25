import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteRedditCommunityMemberNotificationsNotificationId(props: {
  member: MemberPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const notification =
    await MyGlobal.prisma.reddit_community_notifications.findUnique({
      where: {
        id: props.notificationId,
      },
    });

  if (!notification) {
    throw new HttpException("Notification not found", 404);
  }

  if (notification.recipient_id !== props.member.id) {
    throw new HttpException(
      "Forbidden: You can only delete your own notifications",
      403,
    );
  }

  await MyGlobal.prisma.reddit_community_notifications.delete({
    where: {
      id: props.notificationId,
    },
  });
}
