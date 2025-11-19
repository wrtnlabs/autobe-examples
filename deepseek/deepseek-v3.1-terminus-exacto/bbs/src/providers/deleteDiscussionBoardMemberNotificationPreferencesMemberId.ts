import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardMemberNotificationPreferencesMemberId(props: {
  memberId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check if notification preferences exist for this member
  const existingPreferences =
    await MyGlobal.prisma.discussion_board_notification_preferences.findUnique({
      where: { discussion_board_member_id: props.memberId },
    });

  if (!existingPreferences) {
    throw new HttpException(
      "Notification preferences not found for this member",
      404,
    );
  }

  // Delete the notification preferences
  await MyGlobal.prisma.discussion_board_notification_preferences.delete({
    where: { discussion_board_member_id: props.memberId },
  });
}
